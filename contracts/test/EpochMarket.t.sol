// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EpochMarket} from "../src/EpochMarket.sol";
import {EpochClaim} from "../src/EpochClaim.sol";
import {MockVeBTC} from "../src/MockVeBTC.sol";
import {MockRewardSource} from "../src/MockRewardSource.sol";
import {EpochDemoUSD} from "../src/EpochDemoUSD.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ReenteringSeller is IERC721Receiver {
    EpochMarket public market;
    MockVeBTC public nft;
    uint256 public offerId;
    bool public attackEnabled;
    bool public reentrySucceeded;

    constructor(EpochMarket market_, MockVeBTC nft_) { market = market_; nft = nft_; }
    function create(uint256 tokenId, uint64 start, uint64 end) external {
        nft.approve(address(market), tokenId);
        offerId = market.createOffer(tokenId, start, end, 8 ether);
    }
    function withdraw() external { attackEnabled = true; market.withdrawPrincipal(offerId); }
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (attackEnabled) {
            (reentrySucceeded,) = address(market).call(abi.encodeCall(EpochMarket.withdrawPrincipal, (offerId)));
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract EpochMarketTest is Test {
    EpochMarket market;
    EpochClaim claim;
    MockVeBTC nft;
    MockRewardSource source;
    EpochDemoUSD token;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA20);
    address operator = address(0x0F);
    uint64 start;
    uint64 end;
    uint64 unlock;

    function setUp() public {
        vm.warp(1_000_000);
        start = uint64(block.timestamp + 120);
        end = start + 120;
        unlock = end + 60;
        token = new EpochDemoUSD(address(this));
        nft = new MockVeBTC(address(this));
        claim = new EpochClaim(address(this));
        source = new MockRewardSource(address(this), operator, token);
        market = new EpochMarket(nft, claim, source, token);
        claim.setMarket(address(market));
        source.setMarket(address(market));
        token.mint(bob, 100 ether);
        token.mint(operator, 100 ether);
        nft.mint(alice, unlock);
        vm.prank(alice);
        nft.approve(address(market), 1);
    }

    function list() internal returns (uint256) {
        vm.prank(alice);
        return market.createOffer(1, start, end, 8 ether);
    }
    function buy(uint256 id) internal {
        vm.prank(bob);
        token.approve(address(market), 8 ether);
        vm.prank(bob);
        market.buyOffer(id);
    }
    function fund(uint256 id, uint256 amount) internal {
        vm.prank(operator);
        token.approve(address(source), amount);
        vm.prank(operator);
        source.fundOffer(id, amount);
    }

    function test_CreateAndGuardListings() public {
        vm.prank(bob);
        vm.expectRevert();
        market.createOffer(1, start, end, 8 ether);
        vm.prank(alice);
        vm.expectRevert("zero price");
        market.createOffer(1, start, end, 0);
        vm.prank(alice);
        vm.expectRevert("invalid epoch");
        market.createOffer(1, uint64(block.timestamp), end, 8 ether);
        vm.prank(alice);
        vm.expectRevert("epoch exceeds lock");
        market.createOffer(1, start, unlock + 1, 8 ether);
        uint256 id = list();
        assertEq(nft.ownerOf(1), address(market));
        assertEq(market.getOffer(id).seller, alice);
        vm.prank(alice);
        vm.expectRevert("position already escrowed");
        market.createOffer(1, start, end, 8 ether);
    }

    function test_BuyAtomicAndSingleClaim() public {
        uint256 id = list();
        vm.prank(bob);
        vm.expectRevert();
        market.buyOffer(id);
        assertEq(uint8(market.getOffer(id).status), uint8(EpochMarket.OfferStatus.LISTED));
        buy(id);
        assertEq(token.balanceOf(alice), 8 ether);
        assertEq(claim.ownerOf(id), bob);
        vm.prank(carol);
        vm.expectRevert("not listed");
        market.buyOffer(id);
        vm.prank(alice);
        vm.expectRevert("not cancellable");
        market.cancelOffer(id);
    }

    function test_BuyAfterStartFails() public {
        uint256 id = list();
        vm.warp(start);
        vm.prank(bob);
        vm.expectRevert("epoch started");
        market.buyOffer(id);
    }

    function test_SellerCannotBuyOwnClaimOrWithdrawBeforeResolution() public {
        uint256 id = list();
        vm.prank(alice);
        vm.expectRevert("seller cannot buy");
        market.buyOffer(id);
        buy(id);
        vm.warp(unlock);
        vm.prank(alice);
        vm.expectRevert("reward unresolved");
        market.withdrawPrincipal(id);
        assertEq(nft.ownerOf(1), address(market));
    }

    function test_OnlyMarketCanMintOrConsumeClaim() public {
        uint256 id = list();
        buy(id);
        vm.prank(bob);
        vm.expectRevert("market only");
        claim.mint(bob, 77);
        vm.prank(bob);
        vm.expectRevert("market only");
        claim.burn(id);
        vm.prank(operator);
        vm.expectRevert("market only");
        source.claimToMarket(id);
    }

    function test_RejectUnsolicitedMockNft() public {
        nft.mint(alice, unlock);
        vm.prank(alice);
        vm.expectRevert("unsolicited NFT");
        nft.safeTransferFrom(alice, address(market), 2);
        assertEq(nft.ownerOf(2), alice);
    }

    function test_FundedRewardTransferAndPrincipalReturn() public {
        uint256 id = list();
        buy(id);
        vm.prank(bob);
        claim.transferFrom(bob, carol, id);
        fund(id, 12 ether);
        assertEq(source.fundedAmount(id), 12 ether);
        vm.expectRevert("epoch not ended");
        market.finalizeOffer(id);
        vm.warp(end);
        market.finalizeOffer(id);
        assertEq(market.getOffer(id).realizedReward, 12 ether);
        vm.expectRevert("not sold");
        market.finalizeOffer(id);
        vm.prank(bob);
        vm.expectRevert("not claim owner");
        market.redeem(id);
        vm.prank(carol);
        market.redeem(id);
        assertEq(token.balanceOf(carol), 12 ether);
        vm.prank(carol);
        vm.expectRevert("not settled");
        market.redeem(id);
        vm.prank(bob);
        vm.expectRevert("seller only");
        market.withdrawPrincipal(id);
        vm.prank(alice);
        vm.expectRevert("position locked");
        market.withdrawPrincipal(id);
        vm.warp(unlock);
        vm.prank(alice);
        market.withdrawPrincipal(id);
        assertEq(nft.ownerOf(1), alice);
    }

    function test_ZeroRewardBuyerLosesPrice() public {
        uint256 id = list();
        buy(id);
        vm.warp(end);
        market.finalizeOffer(id);
        vm.prank(bob);
        market.redeem(id);
        assertEq(token.balanceOf(bob), 92 ether);
        vm.warp(unlock);
        vm.prank(alice);
        market.withdrawPrincipal(id);
        assertEq(nft.ownerOf(1), alice);
    }

    function test_CancelAndReclaimAfterLock() public {
        uint256 id = list();
        vm.prank(alice);
        market.cancelOffer(id);
        vm.prank(bob);
        vm.expectRevert("not listed");
        market.buyOffer(id);
        vm.prank(alice);
        vm.expectRevert("position locked");
        market.withdrawPrincipal(id);
        vm.warp(unlock);
        vm.prank(alice);
        market.withdrawPrincipal(id);
        assertEq(nft.ownerOf(1), alice);
    }

    function test_OperatorOnlyAndDonationsIgnored() public {
        uint256 id = list();
        buy(id);
        vm.prank(bob);
        vm.expectRevert("operator only");
        source.fundOffer(id, 1 ether);
        fund(id, 12 ether);
        vm.prank(bob);
        token.transfer(address(source), 1 ether);
        vm.prank(bob);
        token.transfer(address(market), 1 ether);
        vm.warp(end);
        market.finalizeOffer(id);
        assertEq(market.getOffer(id).realizedReward, 12 ether);
        vm.prank(bob);
        market.redeem(id);
        assertEq(token.balanceOf(bob), 102 ether);
        assertEq(token.balanceOf(address(market)), 1 ether);
    }

    function test_CannotFundNonexistentOrSettledOffer() public {
        vm.prank(operator);
        vm.expectRevert("offer not sold");
        source.fundOffer(99, 1 ether);
        uint256 id = list();
        buy(id);
        fund(id, 1 ether);
        vm.warp(end);
        market.finalizeOffer(id);
        vm.prank(operator);
        vm.expectRevert("offer not sold");
        source.fundOffer(id, 1 ether);
    }

    function test_ReentrantPrincipalReturnCannotWithdrawTwice() public {
        ReenteringSeller seller = new ReenteringSeller(market, nft);
        nft.mint(address(seller), unlock);
        seller.create(2, start, end);
        uint256 id = seller.offerId();
        buy(id);
        vm.warp(end);
        market.finalizeOffer(id);
        vm.prank(bob);
        market.redeem(id);
        vm.warp(unlock);
        seller.withdraw();
        assertFalse(seller.reentrySucceeded());
        assertEq(nft.ownerOf(2), address(seller));
        assertEq(uint8(market.getOffer(id).status), uint8(EpochMarket.OfferStatus.CLOSED));
    }

    function testFuzz_RecognizedRewardEqualsRecordedFunding(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 0, 100 ether);
        uint256 id = list();
        buy(id);
        if (amount > 0) fund(id, amount);
        vm.warp(end);
        market.finalizeOffer(id);
        assertEq(market.getOffer(id).realizedReward, amount);
        vm.prank(bob);
        market.redeem(id);
        assertEq(token.balanceOf(bob), 92 ether + amount);
    }
}
