// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMarketFundingStatus {
    function canFund(uint256 offerId) external view returns (bool);
}

/// @notice DEMO ONLY. The operator supplies tokens; these are not Mezo protocol rewards.
contract MockRewardSource is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable payoutToken;
    address public immutable operator;
    address public market;
    mapping(uint256 => uint256) public fundedAmount;
    mapping(uint256 => bool) public consumed;

    event RewardFunded(uint256 indexed offerId, uint256 amount);
    event RewardConsumed(uint256 indexed offerId, uint256 amount);

    constructor(address admin, address operator_, IERC20 token) Ownable(admin) {
        require(operator_ != address(0) && address(token) != address(0), "zero dependency");
        operator = operator_;
        payoutToken = token;
    }

    function setMarket(address market_) external onlyOwner {
        require(market == address(0) && market_ != address(0), "market already set");
        market = market_;
    }

    function fundOffer(uint256 offerId, uint256 amount) external nonReentrant {
        require(msg.sender == operator, "operator only");
        require(market != address(0) && offerId != 0 && amount != 0, "invalid funding");
        require(IMarketFundingStatus(market).canFund(offerId), "offer not sold");
        require(!consumed[offerId], "already consumed");
        uint256 beforeBalance = payoutToken.balanceOf(address(this));
        payoutToken.safeTransferFrom(msg.sender, address(this), amount);
        require(payoutToken.balanceOf(address(this)) - beforeBalance == amount, "inexact funding");
        fundedAmount[offerId] += amount;
        emit RewardFunded(offerId, amount);
    }

    function claimToMarket(uint256 offerId) external nonReentrant returns (uint256 amount) {
        require(msg.sender == market, "market only");
        require(!consumed[offerId], "already consumed");
        consumed[offerId] = true;
        amount = fundedAmount[offerId];
        fundedAmount[offerId] = 0;
        if (amount != 0) payoutToken.safeTransfer(market, amount);
        emit RewardConsumed(offerId, amount);
    }
}
