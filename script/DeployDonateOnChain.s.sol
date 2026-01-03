// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DonateOnChain} from "../src/DonateOnChain.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployDonateOnChain
 * @notice Deployment script for DonateOnChain UUPS proxy system
 * @dev Run with: forge script script/DeployDonateOnChain.s.sol --rpc-url hedera_testnet --broadcast
 */
contract DeployDonateOnChain is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address platformWallet = vm.envAddress("PLATFORM_WALLET");

        // Load treasury signers from environment
        address[] memory treasurySigners = new address[](3);
        treasurySigners[0] = vm.envAddress("TREASURY_SIGNER_1");
        treasurySigners[1] = vm.envAddress("TREASURY_SIGNER_2");
        treasurySigners[2] = vm.envAddress("TREASURY_SIGNER_3");

        uint256 treasuryThreshold = vm.envUint("TREASURY_THRESHOLD");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation contract
        console2.log("Deploying DonateOnChain implementation...");
        DonateOnChain implementation = new DonateOnChain();
        console2.log("Implementation deployed at:", address(implementation));

        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            DonateOnChain.initialize.selector,
            admin,
            treasurySigners,
            treasuryThreshold,
            platformWallet
        );

        // 3. Deploy proxy
        console2.log("Deploying ERC1967Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console2.log("Proxy deployed at:", address(proxy));

        // 4. Wrap proxy in DonateOnChain interface
        DonateOnChain donateOnChain = DonateOnChain(payable(address(proxy)));

        // 5. Grant initial roles
        console2.log("Setting up roles...");

        address complianceOfficer = vm.envAddress("COMPLIANCE_OFFICER");
        address campaignManager = vm.envAddress("CAMPAIGN_MANAGER");

        bytes32 COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
        bytes32 CAMPAIGN_MANAGER_ROLE = keccak256("CAMPAIGN_MANAGER_ROLE");

        donateOnChain.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer);
        donateOnChain.grantRole(CAMPAIGN_MANAGER_ROLE, campaignManager);

        console2.log("Compliance Officer:", complianceOfficer);
        console2.log("Campaign Manager:", campaignManager);

        vm.stopBroadcast();

        // 6. Log deployment summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("Implementation:", address(implementation));
        console2.log("Proxy (Main Contract):", address(proxy));
        console2.log("Admin:", admin);
        console2.log("Platform Wallet:", platformWallet);
        console2.log("Treasury Threshold:", treasuryThreshold);
        console2.log("Treasury Signers:", treasurySigners.length);
        console2.log("\n=== Next Steps ===");
        console2.log("1. Verify contracts on Hedera Explorer");
        console2.log("2. Update frontend with proxy address:", address(proxy));
        console2.log("3. Test KYC verification flow");
        console2.log("4. Create and vet first campaign");
    }
}
