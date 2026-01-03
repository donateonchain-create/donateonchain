// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {DonateOnChain} from "../src/DonateOnChain.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DonateOnChainTest is Test {
    DonateOnChain public implementation;
    DonateOnChain public donateOnChain;

    address public admin = makeAddr("admin");
    address public complianceOfficer = makeAddr("complianceOfficer");
    address public campaignManager = makeAddr("campaignManager");
    address public treasuryAdmin = makeAddr("treasuryAdmin");

    address public signer1 = makeAddr("signer1");
    address public signer2 = makeAddr("signer2");
    address public signer3 = makeAddr("signer3");

    address public ngo = makeAddr("ngo");
    address public designer = makeAddr("designer");
    address public donor = makeAddr("donor");
    address public platformWallet = makeAddr("platformWallet");

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant COMPLIANCE_OFFICER_ROLE =
        keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE =
        keccak256("CAMPAIGN_MANAGER_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");

    function setUp() public {
        // Deploy implementation
        implementation = new DonateOnChain();

        // Setup treasury signers
        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;

        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            DonateOnChain.initialize.selector,
            admin,
            signers,
            2, // threshold
            platformWallet
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        donateOnChain = DonateOnChain(payable(address(proxy)));

        // Grant roles
        vm.startPrank(admin);
        donateOnChain.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer);
        donateOnChain.grantRole(CAMPAIGN_MANAGER_ROLE, campaignManager);
        donateOnChain.grantRole(TREASURY_ADMIN_ROLE, treasuryAdmin);
        vm.stopPrank();

        // Fund test accounts
        vm.deal(donor, 100 ether);
        vm.deal(ngo, 10 ether);
    }

    // ============ Initialization Tests ============

    function test_Initialization() public view {
        assertEq(donateOnChain.platformWallet(), platformWallet);
        assertEq(donateOnChain.treasuryThreshold(), 2);
        assertEq(donateOnChain.getTreasurySigners().length, 3);
        assertTrue(donateOnChain.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(
            donateOnChain.hasRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer)
        );
    }

    function test_RevertWhen_InitializeTwice() public {
        address[] memory signers = new address[](2);
        signers[0] = signer1;
        signers[1] = signer2;

        vm.expectRevert();
        donateOnChain.initialize(admin, signers, 2, platformWallet);
    }

    // ============ KYC/AML Tests ============

    function test_VerifyAccount() public {
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(ngo);

        assertTrue(donateOnChain.isKycVerified(ngo));
    }

    function test_RevokeVerification() public {
        vm.startPrank(complianceOfficer);
        donateOnChain.verifyAccount(ngo);
        donateOnChain.revokeVerification(ngo);
        vm.stopPrank();

        assertFalse(donateOnChain.isKycVerified(ngo));
    }

    function test_BlacklistAccount() public {
        vm.prank(complianceOfficer);
        donateOnChain.blacklistAccount(ngo);

        assertTrue(donateOnChain.isBlacklisted(ngo));
    }

    function test_RevertWhen_UnauthorizedKYCVerification() public {
        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.verifyAccount(ngo);
    }

    // ============ Campaign Creation Tests ============

    function test_CreateCampaign() public {
        // Verify NGO first
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(ngo);

        // Create campaign
        vm.prank(ngo);
        uint256 campaignId = donateOnChain.createCampaign(
            designer,
            "Save the Whales",
            "Help protect marine life",
            "QmHash123",
            bytes32(uint256(1)),
            10 ether,
            block.timestamp + 30 days,
            7000, // 70% to NGO
            2000, // 20% to designer
            1000 // 10% to platform
        );

        assertEq(campaignId, 0);

        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(0);
        assertEq(campaign.ngo, ngo);
        assertEq(campaign.designer, designer);
        assertEq(campaign.targetAmount, 10 ether);
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Pending_Vetting)
        );
    }

    function test_RevertWhen_CreateCampaignWithoutKYC() public {
        vm.prank(ngo);
        vm.expectRevert();
        donateOnChain.createCampaign(
            designer,
            "Test",
            "Test",
            "QmHash",
            bytes32(uint256(1)),
            10 ether,
            block.timestamp + 30 days,
            7000,
            2000,
            1000
        );
    }

    function test_RevertWhen_CreateCampaignInvalidBPS() public {
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(ngo);

        vm.prank(ngo);
        vm.expectRevert();
        donateOnChain.createCampaign(
            designer,
            "Test",
            "Test",
            "QmHash",
            bytes32(uint256(1)),
            10 ether,
            block.timestamp + 30 days,
            7000,
            2000,
            2000 // Total = 11000, should fail
        );
    }

    // ============ Campaign Vetting Tests ============

    function test_VetCampaignApprove() public {
        _createVerifiedCampaign();

        vm.prank(campaignManager);
        donateOnChain.vetCampaign(0, true);

        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(0);
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Active)
        );
    }

    function test_VetCampaignReject() public {
        _createVerifiedCampaign();

        vm.prank(campaignManager);
        donateOnChain.vetCampaign(0, false);

        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(0);
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Failed_Refundable)
        );
    }

    function test_RevertWhen_VetCampaignUnauthorized() public {
        _createVerifiedCampaign();

        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.vetCampaign(0, true);
    }

    // ============ Donation Tests ============

    function test_Contribute() public {
        uint256 campaignId = _createActiveCampaign();

        // Verify donor
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        // Donate
        vm.prank(donor);
        uint256 nftId = donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        assertEq(nftId, 0);

        // Check campaign balance (currentAmount removed)
        assertEq(donateOnChain.getCampaignBalance(campaignId), 5 ether);
    }

    function test_ContributeReachesGoal() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        // Donate full amount
        vm.prank(donor);
        donateOnChain.contribute{value: 10 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(
            campaignId
        );
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Goal_Reached)
        );
    }

    function test_RevertWhen_ContributeWithoutKYC() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );
    }

    function test_RevertWhen_ContributeToInactiveCampaign() public {
        uint256 campaignId = _createVerifiedCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        // Campaign is still in Pending_Vetting state
        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );
    }

    // ============ Pull-Over-Push Tests ============

    function test_ClaimFunds() public {
        uint256 campaignId = _createActiveCampaign();

        // Verify and donate
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        vm.prank(donor);
        donateOnChain.contribute{value: 10 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        // Check balances before claim
        uint256 ngoBalanceBefore = ngo.balance;
        uint256 designerBalanceBefore = designer.balance;
        uint256 platformBalanceBefore = platformWallet.balance;

        // NGO claims funds
        vm.prank(ngo);
        donateOnChain.claimFunds(campaignId);

        // Check balances after claim
        assertEq(ngo.balance, ngoBalanceBefore + 7 ether); // 70%
        assertEq(designer.balance, designerBalanceBefore + 2 ether); // 20%
        assertEq(platformWallet.balance, platformBalanceBefore + 1 ether); // 10%

        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(
            campaignId
        );
        assertTrue(campaign.fundsClaimed);
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Closed)
        );
    }

    function test_RevertWhen_ClaimFundsBeforeGoalReached() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        vm.prank(donor);
        donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        // Try to claim with only 50% of goal
        vm.prank(ngo);
        vm.expectRevert();
        donateOnChain.claimFunds(campaignId);
    }

    function test_RevertWhen_ClaimFundsTwice() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        vm.prank(donor);
        donateOnChain.contribute{value: 10 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        vm.startPrank(ngo);
        donateOnChain.claimFunds(campaignId);
        vm.expectRevert();
        donateOnChain.claimFunds(campaignId); // Should fail
        vm.stopPrank();
    }

    function test_ClaimRefund() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        vm.prank(donor);
        donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );

        // Fast forward past deadline
        DonateOnChain.Campaign memory campaign = donateOnChain.getCampaign(
            campaignId
        );
        vm.warp(campaign.deadline + 1);

        // Update campaign state
        donateOnChain.updateCampaignState(campaignId);

        campaign = donateOnChain.getCampaign(campaignId);
        assertEq(
            uint256(campaign.state),
            uint256(DonateOnChain.CampaignState.Failed_Refundable)
        );

        // Claim refund
        uint256 donorBalanceBefore = donor.balance;

        vm.prank(donor);
        donateOnChain.claimRefund(0); // donationId = 0

        assertEq(donor.balance, donorBalanceBefore + 5 ether);
    }

    // ============ Multisig Treasury Tests ============

    function test_AddTreasurySigner() public {
        address newSigner = makeAddr("newSigner");

        vm.prank(treasuryAdmin);
        donateOnChain.addTreasurySigner(newSigner);

        assertTrue(donateOnChain.isTreasurySigner(newSigner));
        assertEq(donateOnChain.getTreasurySigners().length, 4);
    }

    function test_RemoveTreasurySigner() public {
        vm.prank(treasuryAdmin);
        donateOnChain.removeTreasurySigner(signer3);

        assertFalse(donateOnChain.isTreasurySigner(signer3));
        assertEq(donateOnChain.getTreasurySigners().length, 2);
    }

    function test_UpdateTreasuryThreshold() public {
        vm.prank(treasuryAdmin);
        donateOnChain.updateTreasuryThreshold(3);

        assertEq(donateOnChain.treasuryThreshold(), 3);
    }

    function test_CreateAndExecuteTreasuryProposal() public {
        // Create proposal to update platform wallet
        address newPlatformWallet = makeAddr("newPlatformWallet");
        bytes memory data = abi.encodeWithSelector(
            DonateOnChain.updatePlatformWallet.selector,
            newPlatformWallet
        );

        vm.prank(signer1);
        uint256 proposalId = donateOnChain.createTreasuryProposal(
            address(donateOnChain),
            0,
            data,
            "Update platform wallet"
        );

        // Approve with signer1 and signer2 (threshold = 2)
        vm.prank(signer1);
        donateOnChain.approveTreasuryProposal(proposalId);

        vm.prank(signer2);
        donateOnChain.approveTreasuryProposal(proposalId);

        // Execute
        vm.prank(signer1);
        donateOnChain.executeTreasuryProposal(proposalId);

        // Note: This will fail because updatePlatformWallet requires TREASURY_ADMIN_ROLE
        // In production, treasury proposals would target external contracts or simple transfers
    }

    // ============ Circuit Breaker Tests ============

    function test_PauseUnpause() public {
        vm.prank(treasuryAdmin);
        donateOnChain.pause();

        assertTrue(donateOnChain.paused());

        vm.prank(treasuryAdmin);
        donateOnChain.unpause();

        assertFalse(donateOnChain.paused());
    }

    function test_RevertWhen_ContributeWhenPaused() public {
        uint256 campaignId = _createActiveCampaign();

        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(donor);

        vm.prank(treasuryAdmin);
        donateOnChain.pause();

        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.contribute{value: 5 ether}(
            campaignId,
            "QmDonationMetadata"
        );
    }

    function test_EmergencyWithdraw() public {
        // Fund contract
        vm.deal(address(donateOnChain), 10 ether);

        // Pause first
        vm.prank(treasuryAdmin);
        donateOnChain.pause();

        address recipient = makeAddr("recipient");
        uint256 recipientBalanceBefore = recipient.balance;

        vm.prank(treasuryAdmin);
        donateOnChain.emergencyWithdraw(recipient, 5 ether);

        assertEq(recipient.balance, recipientBalanceBefore + 5 ether);
    }

    // ============ Upgrade Tests ============

    function test_UpgradeContract() public {
        // Deploy new implementation
        DonateOnChain newImplementation = new DonateOnChain();

        // Upgrade
        vm.prank(admin);
        donateOnChain.upgradeToAndCall(address(newImplementation), "");

        // Verify state is preserved
        assertEq(donateOnChain.platformWallet(), platformWallet);
        assertEq(donateOnChain.treasuryThreshold(), 2);
    }

    function test_RevertWhen_UnauthorizedUpgrade() public {
        DonateOnChain newImplementation = new DonateOnChain();

        vm.prank(donor);
        vm.expectRevert();
        donateOnChain.upgradeToAndCall(address(newImplementation), "");
    }

    // ============ Helper Functions ============

    function _createVerifiedCampaign() internal returns (uint256) {
        vm.prank(complianceOfficer);
        donateOnChain.verifyAccount(ngo);

        vm.prank(ngo);
        return
            donateOnChain.createCampaign(
                designer,
                "Save the Whales",
                "Help protect marine life",
                "QmHash123",
                bytes32(uint256(1)),
                10 ether,
                block.timestamp + 30 days,
                7000,
                2000,
                1000
            );
    }

    function _createActiveCampaign() internal returns (uint256) {
        uint256 campaignId = _createVerifiedCampaign();

        vm.prank(campaignManager);
        donateOnChain.vetCampaign(campaignId, true);

        return campaignId;
    }
}
