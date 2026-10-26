// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice DEMO ONLY. No BTC is deposited or represented by this token.
contract MockVeBTC is ERC721, Ownable {
    uint256 public constant ILLUSTRATIVE_PRINCIPAL_SATS = 10_000_000;
    uint256 public nextTokenId = 1;
    mapping(uint256 => uint64) public unlockAt;

    event MockPositionMinted(uint256 indexed tokenId, address indexed to, uint64 unlockAt);

    constructor(address minter) ERC721("Epoch Simulated BTC Position", "MOCK-veBTC") Ownable(minter) {}

    function mint(address to, uint64 unlockTime) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "zero recipient");
        require(unlockTime > block.timestamp, "unlock must be future");
        tokenId = nextTokenId++;
        unlockAt[tokenId] = unlockTime;
        _safeMint(to, tokenId);
        emit MockPositionMinted(tokenId, to, unlockTime);
    }
}
