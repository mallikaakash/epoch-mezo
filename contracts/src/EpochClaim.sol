// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice A transferable claim on one simulated, funded reward. No principal rights.
contract EpochClaim is ERC721, Ownable {
    address public market;
    mapping(uint256 => uint256) public offerOf;

    constructor(address admin) ERC721("Epoch Simulated Reward Claim", "EPOCH-CLAIM") Ownable(admin) {}

    function setMarket(address market_) external onlyOwner {
        require(market == address(0) && market_ != address(0), "market already set");
        market = market_;
    }

    function mint(address to, uint256 offerId) external returns (uint256 claimId) {
        require(msg.sender == market, "market only");
        claimId = offerId; // Offer IDs start at 1 and each offer has one claim.
        offerOf[claimId] = offerId;
        _safeMint(to, claimId);
    }

    function burn(uint256 claimId) external {
        require(msg.sender == market, "market only");
        _burn(claimId);
    }
}
