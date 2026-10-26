// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice TEST-ONLY fallback. This token is NOT MUSD and has no redemption value.
contract EpochDemoUSD is ERC20, Ownable {
    constructor(address minter) ERC20("Epoch Demo USD - NOT MUSD", "DEMO-USD") Ownable(minter) {}
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
}
