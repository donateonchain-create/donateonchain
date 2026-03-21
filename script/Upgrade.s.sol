// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DonateOnChain} from "../src/DonateOnChain.sol";

/**
 * @title Upgrade
 * @notice Upgrades the DonateOnChain proxy to a new implementation.
 * @dev Run with: forge script script/Upgrade.s.sol --rpc-url $RPC_URL --broadcast --legacy -vvv
 */
contract Upgrade is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("PROXY_ADDRESS");
        address newImplementation = vm.envAddress("IMPLEMENTATION_ADDRESS");

        console2.log("=== Upgrading DonateOnChain Proxy ===");
        console2.log("Proxy:             ", proxy);
        console2.log("New implementation:", newImplementation);

        vm.startBroadcast(deployerPrivateKey);

        // Call upgradeToAndCall with empty calldata (no re-initialization needed)
        DonateOnChain(payable(proxy)).upgradeToAndCall(newImplementation, "");

        vm.stopBroadcast();

        console2.log("\n=== UPGRADE SUCCESSFUL ===");
        console2.log("Proxy now points to:", newImplementation);
        console2.log("Explorer: https://hashscan.io/testnet/contract/%s", proxy);
    }
}
