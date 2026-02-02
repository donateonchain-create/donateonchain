// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DonateOnChain} from "../src/DonateOnChain.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Deploy
 * @notice Deployment script for DonateOnChain on Hedera
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --legacy --skip-simulation -vvv
 */
contract Deploy is Script {
    function run() external returns (address proxy, address implementation) {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address platformWallet = vm.envAddress("PLATFORM_WALLET");

        // Load treasury signers
        address[] memory treasurySigners = new address[](3);
        treasurySigners[0] = vm.envAddress("TREASURY_SIGNER_1");
        treasurySigners[1] = vm.envAddress("TREASURY_SIGNER_2");
        treasurySigners[2] = vm.envAddress("TREASURY_SIGNER_3");

        uint256 treasuryThreshold = vm.envUint("TREASURY_THRESHOLD");
        address complianceOfficer = vm.envAddress("COMPLIANCE_OFFICER");
        address campaignManager = vm.envAddress("CAMPAIGN_MANAGER");

        console2.log("=== Hedera Testnet Deployment ===\n");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy implementation
        console2.log("[1/4] Deploying implementation...");
        implementation = address(new DonateOnChain());
        console2.log("  -> Implementation:", implementation);

        // Deploy proxy with initialization
        console2.log("\n[2/4] Deploying proxy...");
        bytes memory initData = abi.encodeWithSelector(
            DonateOnChain.initialize.selector, admin, treasurySigners, treasuryThreshold, platformWallet
        );

        proxy = address(new ERC1967Proxy(implementation, initData));
        console2.log("  -> Proxy:", proxy);

        // Setup roles
        console2.log("\n[3/4] Granting COMPLIANCE_OFFICER_ROLE...");
        DonateOnChain(payable(proxy)).grantRole(keccak256("COMPLIANCE_OFFICER_ROLE"), complianceOfficer);
        console2.log("  -> Granted to:", complianceOfficer);

        console2.log("\n[4/4] Granting CAMPAIGN_MANAGER_ROLE...");
        DonateOnChain(payable(proxy)).grantRole(keccak256("CAMPAIGN_MANAGER_ROLE"), campaignManager);
        console2.log("  -> Granted to:", campaignManager);

        vm.stopBroadcast();

        // Summary
        console2.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console2.log("Main Contract (Proxy):", proxy);
        console2.log("Implementation:", implementation);
        console2.log("\nExplorer:");
        console2.log("https://hashscan.io/testnet/contract/%s", proxy);
        console2.log("\n=== SAVE THIS ADDRESS ===");
        console2.log("PROXY_ADDRESS=%s", proxy);

        return (proxy, implementation);
    }
}
