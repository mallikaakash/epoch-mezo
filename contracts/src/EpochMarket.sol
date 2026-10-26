// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MockVeBTC} from "./MockVeBTC.sol";
import {EpochClaim} from "./EpochClaim.sol";
import {MockRewardSource} from "./MockRewardSource.sol";

/// @notice Epoch Lite: one fixed-price claim on a SIMULATED reward period.
contract EpochMarket is IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OfferStatus { NONE, LISTED, CANCELLED, SOLD, SETTLED, REDEEMED, CLOSED }

    struct Offer {
        address seller;
        uint256 sourceTokenId;
        uint256 price;
        uint64 epochStart;
        uint64 epochEnd;
        uint64 principalUnlock;
        uint256 claimId;
        uint256 realizedReward;
        OfferStatus status;
    }

    MockVeBTC public immutable sourceNft;
    EpochClaim public immutable claim;
    MockRewardSource public immutable rewardSource;
    IERC20 public immutable token; // Quote and payout token are identical in Lite.
    uint256 public nextOfferId = 1;
    mapping(uint256 => Offer) private offers;
    mapping(uint256 => bool) public positionEscrowed;
    uint256 private expectedEscrowTokenId;

    event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 indexed sourceTokenId, uint256 price, uint64 epochStart, uint64 epochEnd);
    event OfferCancelled(uint256 indexed offerId);
    event OfferPurchased(uint256 indexed offerId, uint256 indexed claimId, address indexed buyer, address seller, address token, uint256 price);
    event OfferSettled(uint256 indexed offerId, uint256 rewardAmount);
    event RewardRedeemed(uint256 indexed offerId, address indexed redeemer, uint256 amount);
    event PrincipalWithdrawn(uint256 indexed offerId, address indexed seller, uint256 sourceTokenId);

    constructor(MockVeBTC nft, EpochClaim claim_, MockRewardSource source, IERC20 token_) {
        require(address(nft) != address(0) && address(claim_) != address(0) && address(source) != address(0) && address(token_) != address(0), "zero dependency");
        require(address(source.payoutToken()) == address(token_), "payout token mismatch");
        sourceNft = nft;
        claim = claim_;
        rewardSource = source;
        token = token_;
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) { return offers[offerId]; }
    function canFund(uint256 offerId) external view returns (bool) { return offers[offerId].status == OfferStatus.SOLD; }

    function createOffer(uint256 sourceTokenId, uint64 epochStart, uint64 epochEnd, uint256 price) external nonReentrant returns (uint256 offerId) {
        require(price != 0, "zero price");
        require(epochStart > block.timestamp && epochStart < epochEnd, "invalid epoch");
        uint64 unlockTime = sourceNft.unlockAt(sourceTokenId);
        require(epochEnd <= unlockTime, "epoch exceeds lock");
        require(!positionEscrowed[sourceTokenId], "position already escrowed");
        require(sourceNft.ownerOf(sourceTokenId) == msg.sender, "not position owner");
        require(sourceNft.getApproved(sourceTokenId) == address(this) || sourceNft.isApprovedForAll(msg.sender, address(this)), "approve position first");
        offerId = nextOfferId++;
        offers[offerId] = Offer(msg.sender, sourceTokenId, price, epochStart, epochEnd, unlockTime, 0, 0, OfferStatus.LISTED);
        positionEscrowed[sourceTokenId] = true;
        expectedEscrowTokenId = sourceTokenId;
        sourceNft.safeTransferFrom(msg.sender, address(this), sourceTokenId);
        expectedEscrowTokenId = 0;
        emit OfferCreated(offerId, msg.sender, sourceTokenId, price, epochStart, epochEnd);
    }

    function onERC721Received(address operator, address, uint256 tokenId, bytes calldata) external view returns (bytes4) {
        require(msg.sender == address(sourceNft) && operator == address(this) && tokenId == expectedEscrowTokenId, "unsolicited NFT");
        return IERC721Receiver.onERC721Received.selector;
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.LISTED && msg.sender == offer.seller, "not cancellable");
        offer.status = OfferStatus.CANCELLED;
        emit OfferCancelled(offerId);
    }

    function buyOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.LISTED, "not listed");
        require(block.timestamp < offer.epochStart, "epoch started");
        require(msg.sender != offer.seller, "seller cannot buy");
        offer.status = OfferStatus.SOLD;
        offer.claimId = claim.mint(msg.sender, offerId);
        uint256 sellerBefore = token.balanceOf(offer.seller);
        token.safeTransferFrom(msg.sender, offer.seller, offer.price);
        require(token.balanceOf(offer.seller) - sellerBefore == offer.price, "inexact payment");
        emit OfferPurchased(offerId, offer.claimId, msg.sender, offer.seller, address(token), offer.price);
    }

    function finalizeOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.SOLD, "not sold");
        require(block.timestamp >= offer.epochEnd, "epoch not ended");
        offer.status = OfferStatus.SETTLED;
        uint256 beforeBalance = token.balanceOf(address(this));
        uint256 amount = rewardSource.claimToMarket(offerId);
        require(token.balanceOf(address(this)) - beforeBalance == amount, "unbacked reward");
        offer.realizedReward = amount;
        emit OfferSettled(offerId, amount);
    }

    function redeem(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.SETTLED, "not settled");
        require(claim.ownerOf(offer.claimId) == msg.sender, "not claim owner");
        offer.status = OfferStatus.REDEEMED;
        claim.burn(offer.claimId);
        if (offer.realizedReward != 0) {
            uint256 recipientBefore = token.balanceOf(msg.sender);
            token.safeTransfer(msg.sender, offer.realizedReward);
            require(token.balanceOf(msg.sender) - recipientBefore == offer.realizedReward, "inexact reward transfer");
        }
        emit RewardRedeemed(offerId, msg.sender, offer.realizedReward);
    }

    function withdrawPrincipal(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(msg.sender == offer.seller && msg.sender != address(0), "seller only");
        require(offer.status == OfferStatus.CANCELLED || offer.status == OfferStatus.REDEEMED, "reward unresolved");
        require(block.timestamp >= offer.principalUnlock, "position locked");
        offer.status = OfferStatus.CLOSED;
        positionEscrowed[offer.sourceTokenId] = false;
        sourceNft.safeTransferFrom(address(this), offer.seller, offer.sourceTokenId);
        emit PrincipalWithdrawn(offerId, offer.seller, offer.sourceTokenId);
    }
}
