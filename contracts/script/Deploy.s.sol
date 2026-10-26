// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EpochMarket} from "../src/EpochMarket.sol";
import {EpochClaim} from "../src/EpochClaim.sol";
import {MockVeBTC} from "../src/MockVeBTC.sol";
import {MockRewardSource} from "../src/MockRewardSource.sol";
import {EpochDemoUSD} from "../src/EpochDemoUSD.sol";

/// @notice Deploy with a local Foundry signer. Never put a private key in this file.
contract Deploy is Script {
    function run() external {
        require(block.chainid == 31611 || block.chainid == 31337, "testnet or Anvil only");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        bool demoToken = vm.envBool("USE_DEMO_TOKEN");
        address paymentToken = demoToken ? address(0) : vm.envAddress("PAYMENT_TOKEN_ADDRESS");
        // The intended payment token is official testnet MUSD. Official MEZO can
        // be used as a clearly labeled alternative without changing the market.

        vm.startBroadcast();
        if (demoToken) paymentToken = address(new EpochDemoUSD(admin));
        MockVeBTC nft = new MockVeBTC(admin);
        EpochClaim claim = new EpochClaim(admin);
        MockRewardSource source = new MockRewardSource(admin, operator, IERC20(paymentToken));
        EpochMarket market = new EpochMarket(nft, claim, source, IERC20(paymentToken));
        // ADMIN_ADDRESS must be the signer; otherwise these calls revert.
        claim.setMarket(address(market));
        source.setMarket(address(market));
        vm.stopBroadcast();

        console2.log("ECONOMIC MODE", demoToken ? "DEMO ERC-20 - NOT MUSD" : "OFFICIAL TESTNET MUSD");
        console2.log("PAYMENT_TOKEN_ADDRESS", paymentToken);
        console2.log("MOCK_VEBTC_ADDRESS", address(nft));
        console2.log("EPOCH_CLAIM_ADDRESS", address(claim));
        console2.log("MOCK_REWARD_SOURCE_ADDRESS", address(source));
        console2.log("EPOCH_MARKET_ADDRESS", address(market));
    }
}
