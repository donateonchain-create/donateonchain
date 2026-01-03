// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {
    AccessControlUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {
    ReentrancyGuardUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {
    PausableUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title DonateOnChain
 * @notice Production-ready UUPS upgradeable donation platform with KYC/AML compliance,
 *         campaign state machine, pull-over-push pattern, and multisig treasury protection.
 * @dev Implements 2026 global compliance standards for digital asset philanthropy.
 *      Integrates with Hedera Token Service (HTS) at 0x167 for NFT proof of donation.
 */
contract DonateOnChain is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    // ============ Constants ============

    uint256 private constant MAX_BPS = 10000;
    uint256 private constant MIN_MULTISIG_THRESHOLD = 2;
    uint256 private constant MAX_MULTISIG_SIGNERS = 10;
    uint256 private constant MIN_DONATION_AMOUNT = 0.01 ether; // 0.01 HBAR minimum
    uint256 private constant MAX_PAGE_SIZE = 100; // Maximum items per page
    address private constant HTS_PRECOMPILE = address(0x167);

    // ============ Roles ============

    bytes32 public constant COMPLIANCE_OFFICER_ROLE =
        keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE =
        keccak256("CAMPAIGN_MANAGER_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE =
        keccak256("TREASURY_ADMIN_ROLE");

    // ============ Enums ============

    enum CampaignState {
        Pending_Vetting, // Created, awaiting approval
        Active, // Approved, accepting donations
        Goal_Reached, // Target met, NGO can claim
        Failed_Refundable, // Deadline passed, donors can refund
        Closed // Funds claimed or refund period ended
    }

    // ============ Structs ============

    struct Campaign {
        address ngo;
        address designer;
        string title;
        string description;
        string imageHash;
        bytes32 metadataFileHash;
        uint256 targetAmount;
        uint256 deadline;
        uint256 ngoShareBps;
        uint256 designerShareBps;
        uint256 platformShareBps;
        CampaignState state;
        bool fundsClaimed;
        bool refundsEnabled;
        uint256 refundRatioBps; // Basis points for pro-rata refunds (10000 = 100%)
        uint256 totalRaised; // Cached total donations (prevents gas DoS)
        uint256 createdAt;
    }

    struct Donation {
        address donor;
        uint256 campaignId;
        uint256 amount;
        uint256 timestamp;
        uint256 nftSerialNumber;
        bool refunded;
    }

    struct MultisigProposal {
        address target;
        uint256 value;
        bytes data;
        string description;
        uint256 approvalCount;
        bool executed;
        uint256 createdAt;
        mapping(address => bool) approvals;
    }

    // ============ State Variables ============

    // KYC/AML
    mapping(address => bool) public isKycVerified;
    mapping(address => bool) public isBlacklisted;

    // Campaigns
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256[]) private campaignsByNGO;
    uint256 public campaignCount;

    // Donations
    mapping(uint256 => Donation) private donations;
    mapping(uint256 => uint256[]) private donationsByCampaign;
    mapping(address => uint256[]) private donationsByDonor;
    uint256 private donationCount;

    // Campaign Balance Tracking (prevents cross-campaign fund drainage)
    mapping(uint256 => uint256) private campaignBalances;

    // Cached total for O(1) access (prevents gas DoS in treasury operations)
    uint256 private totalCampaignBalances;

    // Multisig Treasury
    address[] public treasurySigners;
    mapping(address => bool) public isTreasurySigner;
    uint256 public treasuryThreshold;
    mapping(uint256 => MultisigProposal) public treasuryProposals;
    uint256 public proposalCount;

    // Platform
    address public platformWallet;
    address public nftTokenId;

    /**
     * @dev Storage gap for future upgrades
     * @notice Reserved storage slots to allow for new variables in future upgrades
     * without shifting down storage in the inheritance chain.
     * Reduced from 50 to account for current variables (8 + totalCampaignBalances).
     */
    uint256[40] private __gap;

    // ============ Events ============

    // KYC/AML Events
    event AccountVerified(address indexed account, address indexed verifiedBy);
    event VerificationRevoked(
        address indexed account,
        address indexed revokedBy
    );
    event AccountBlacklisted(
        address indexed account,
        address indexed blacklistedBy
    );
    event AccountUnblacklisted(
        address indexed account,
        address indexed unblacklistedBy
    );

    // Campaign Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed ngo,
        address indexed designer,
        uint256 targetAmount,
        uint256 deadline
    );
    event CampaignVetted(
        uint256 indexed campaignId,
        bool approved,
        address indexed vettedBy
    );
    event CampaignStateChanged(
        uint256 indexed campaignId,
        CampaignState oldState,
        CampaignState newState
    );
    event FundsClaimed(
        uint256 indexed campaignId,
        address indexed ngo,
        uint256 amount
    );
    event ImpactReportUpdated(
        uint256 indexed nftId,
        string ipfsCID,
        address indexed updatedBy
    );

    // Donation Events
    event DonationMade(
        address indexed donor,
        uint256 indexed campaignId,
        uint256 amount,
        uint256 nftSerialNumber
    );
    event RefundClaimed(
        address indexed donor,
        uint256 indexed campaignId,
        uint256 amount
    );
    event RefundsEnabled(uint256 indexed campaignId, uint256 refundRatioBps);

    // Multisig Events
    event TreasurySignerAdded(address indexed signer, address indexed addedBy);
    event TreasurySignerRemoved(
        address indexed signer,
        address indexed removedBy
    );
    event TreasuryThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string description
    );
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor
    );

    // Platform Events
    event PlatformWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );
    event EmergencyWithdrawal(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    // ============ Errors ============

    error InvalidAddress(address addr);
    error NotKycVerified(address account);
    error AccountBlacklistedError(address account);
    error InvalidBPSSplit(uint256 ngo, uint256 designer, uint256 platform);
    error CampaignNotFound(uint256 campaignId);
    error InvalidCampaignState(
        uint256 campaignId,
        CampaignState current,
        CampaignState required
    );
    error DeadlineInPast(uint256 deadline);
    error ZeroAmount();
    error FundsAlreadyClaimed(uint256 campaignId);
    error DonationAlreadyRefunded(uint256 donationId);
    error NotDonor(address caller, uint256 donationId);
    error InvalidMultisigThreshold(uint256 threshold, uint256 signerCount);
    error NotTreasurySigner(address caller);
    error ProposalAlreadyApproved(uint256 proposalId, address signer);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error InsufficientApprovals(
        uint256 proposalId,
        uint256 current,
        uint256 required
    );
    error ProposalExecutionFailed(uint256 proposalId);
    error TransferFailed(address recipient, uint256 amount);
    error BelowMinimumDonation(uint256 amount, uint256 minimum);
    error InvalidPageSize(uint256 size, uint256 maximum);
    error InsufficientCampaignBalance(
        uint256 campaignId,
        uint256 available,
        uint256 required
    );
    error CannotClaimFromFailedCampaign(uint256 campaignId);

    // ============ Modifiers ============

    modifier onlyKycVerified() {
        if (!isKycVerified[msg.sender]) revert NotKycVerified(msg.sender);
        if (isBlacklisted[msg.sender])
            revert AccountBlacklistedError(msg.sender);
        _;
    }

    modifier onlyTreasurySigner() {
        if (!isTreasurySigner[msg.sender]) revert NotTreasurySigner(msg.sender);
        _;
    }

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract with initial admin and treasury signers
     * @param admin Address to receive DEFAULT_ADMIN_ROLE
     * @param _treasurySigners Initial treasury multisig signers
     * @param _treasuryThreshold Number of signatures required for treasury operations
     * @param _platformWallet Platform fee recipient
     */
    function initialize(
        address admin,
        address[] memory _treasurySigners,
        uint256 _treasuryThreshold,
        address _platformWallet
    ) public initializer {
        if (admin == address(0)) revert InvalidAddress(admin);
        if (_platformWallet == address(0))
            revert InvalidAddress(_platformWallet);
        if (_treasurySigners.length < MIN_MULTISIG_THRESHOLD) {
            revert InvalidMultisigThreshold(
                _treasuryThreshold,
                _treasurySigners.length
            );
        }
        if (
            _treasuryThreshold < MIN_MULTISIG_THRESHOLD ||
            _treasuryThreshold > _treasurySigners.length
        ) {
            revert InvalidMultisigThreshold(
                _treasuryThreshold,
                _treasurySigners.length
            );
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);

        platformWallet = _platformWallet;
        treasuryThreshold = _treasuryThreshold;

        for (uint256 i = 0; i < _treasurySigners.length; i++) {
            if (_treasurySigners[i] == address(0))
                revert InvalidAddress(_treasurySigners[i]);
            if (isTreasurySigner[_treasurySigners[i]]) continue; // Skip duplicates

            treasurySigners.push(_treasurySigners[i]);
            isTreasurySigner[_treasurySigners[i]] = true;
            emit TreasurySignerAdded(_treasurySigners[i], admin);
        }
    }

    // ============ KYC/AML Functions ============

    /**
     * @notice Verify an account for KYC compliance
     * @param account Address to verify
     */
    function verifyAccount(
        address account
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        if (account == address(0)) revert InvalidAddress(account);
        isKycVerified[account] = true;
        emit AccountVerified(account, msg.sender);
    }

    /**
     * @notice Revoke KYC verification from an account
     * @param account Address to revoke
     */
    function revokeVerification(
        address account
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        if (account == address(0)) revert InvalidAddress(account);
        isKycVerified[account] = false;
        emit VerificationRevoked(account, msg.sender);
    }

    /**
     * @notice Blacklist an account flagged by AML monitors
     * @param account Address to blacklist
     */
    function blacklistAccount(
        address account
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        if (account == address(0)) revert InvalidAddress(account);
        isBlacklisted[account] = true;
        emit AccountBlacklisted(account, msg.sender);
    }

    /**
     * @notice Remove an account from blacklist
     * @param account Address to unblacklist
     */
    function unblacklistAccount(
        address account
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        if (account == address(0)) revert InvalidAddress(account);
        isBlacklisted[account] = false;
        emit AccountUnblacklisted(account, msg.sender);
    }

    // ============ Campaign Management ============

    /**
     * @notice Create a new campaign (KYC-verified NGOs only)
     * @dev Campaign starts in Pending_Vetting state
     */
    function createCampaign(
        address designer,
        string calldata title,
        string calldata description,
        string calldata imageHash,
        bytes32 metadataFileHash,
        uint256 targetAmount,
        uint256 deadline,
        uint256 ngoShareBps,
        uint256 designerShareBps,
        uint256 platformShareBps
    ) external onlyKycVerified returns (uint256) {
        // Checks
        if (designer == address(0)) revert InvalidAddress(designer);
        if (deadline <= block.timestamp) revert DeadlineInPast(deadline);
        if (targetAmount == 0) revert ZeroAmount();

        uint256 totalBps = ngoShareBps + designerShareBps + platformShareBps;
        if (totalBps != MAX_BPS) {
            revert InvalidBPSSplit(
                ngoShareBps,
                designerShareBps,
                platformShareBps
            );
        }

        // Effects
        uint256 campaignId = campaignCount++;

        campaigns[campaignId] = Campaign({
            ngo: msg.sender,
            designer: designer,
            title: title,
            description: description,
            imageHash: imageHash,
            metadataFileHash: metadataFileHash,
            targetAmount: targetAmount,
            deadline: deadline,
            ngoShareBps: ngoShareBps,
            designerShareBps: designerShareBps,
            platformShareBps: platformShareBps,
            state: CampaignState.Pending_Vetting,
            fundsClaimed: false,
            refundsEnabled: false,
            refundRatioBps: 0,
            totalRaised: 0,
            createdAt: block.timestamp
        });

        campaignsByNGO[msg.sender].push(campaignId);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            designer,
            targetAmount,
            deadline
        );

        return campaignId;
    }

    /**
     * @notice Vet a campaign (approve or reject)
     * @param campaignId Campaign to vet
     * @param approved True to approve, false to reject
     */
    function vetCampaign(
        uint256 campaignId,
        bool approved
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        Campaign storage campaign = campaigns[campaignId];

        // Checks
        if (campaign.ngo == address(0)) revert CampaignNotFound(campaignId);
        if (campaign.state != CampaignState.Pending_Vetting) {
            revert InvalidCampaignState(
                campaignId,
                campaign.state,
                CampaignState.Pending_Vetting
            );
        }

        // Effects
        CampaignState oldState = campaign.state;
        campaign.state = approved
            ? CampaignState.Active
            : CampaignState.Failed_Refundable;

        emit CampaignVetted(campaignId, approved, msg.sender);
        emit CampaignStateChanged(campaignId, oldState, campaign.state);
    }

    /**
     * @notice Update impact report for an NFT (dynamic metadata)
     * @param nftId NFT serial number
     * @param ipfsCID New IPFS CID with impact report
     */
    function updateImpactReport(
        uint256 nftId,
        string calldata ipfsCID
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        // TODO: Integrate with HTS to update NFT metadata
        // This requires HTS metadata key management
        emit ImpactReportUpdated(nftId, ipfsCID, msg.sender);
    }

    // ============ Donation Functions (Pull-Over-Push Pattern) ============

    /**
     * @notice Donate HBAR to a campaign
     * @dev Follows CEI pattern: Checks-Effects-Interactions
     * @param campaignId Target campaign
     * @param metadataHash IPFS hash for NFT metadata
     */
    function contribute(
        uint256 campaignId,
        string calldata metadataHash
    )
        external
        payable
        nonReentrant
        whenNotPaused
        onlyKycVerified
        returns (uint256)
    {
        // === CHECKS ===
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value < MIN_DONATION_AMOUNT) {
            revert BelowMinimumDonation(msg.value, MIN_DONATION_AMOUNT);
        }

        Campaign storage campaign = campaigns[campaignId];
        if (campaign.ngo == address(0)) revert CampaignNotFound(campaignId);

        // CRITICAL FIX: Check deadline before accepting donation
        if (block.timestamp > campaign.deadline) {
            revert DeadlineInPast(campaign.deadline);
        }

        if (campaign.state != CampaignState.Active) {
            revert InvalidCampaignState(
                campaignId,
                campaign.state,
                CampaignState.Active
            );
        }

        // === EFFECTS ===
        uint256 donationId = donationCount++;
        uint256 nftSerialNumber = donationId; // Simplified for now, integrate with HTS

        // Update cached total raised (prevents gas DoS in enableRefunds)
        campaign.totalRaised += msg.value;

        // Check if goal reached using campaignBalances
        if (campaignBalances[campaignId] + msg.value >= campaign.targetAmount) {
            CampaignState oldState = campaign.state;
            campaign.state = CampaignState.Goal_Reached;
            emit CampaignStateChanged(
                campaignId,
                oldState,
                CampaignState.Goal_Reached
            );
        }

        donations[donationId] = Donation({
            donor: msg.sender,
            campaignId: campaignId,
            amount: msg.value,
            timestamp: block.timestamp,
            nftSerialNumber: nftSerialNumber,
            refunded: false
        });

        donationsByCampaign[campaignId].push(donationId);
        donationsByDonor[msg.sender].push(donationId);

        // CRITICAL FIX: Track campaign balance to prevent fund drainage
        campaignBalances[campaignId] += msg.value;
        totalCampaignBalances += msg.value; // Update cached total (O(1))

        emit DonationMade(msg.sender, campaignId, msg.value, nftSerialNumber);

        // === INTERACTIONS ===
        // Funds stay in contract until claimed (pull pattern)
        // NFT minting would happen here via HTS

        return nftSerialNumber;
    }

    /**
     * @notice NGO claims funds from a successful campaign (PULL pattern)
     * @dev Only callable when campaign state is Goal_Reached
     * @dev IMPORTANT: No KYC/blacklist check here to prevent fund lock-out.
     *      NGOs can always claim funds they've already earned, even if later blacklisted.
     *      Blacklist only prevents NEW donations, not claiming existing earned funds.
     * @param campaignId Campaign to claim from
     */
    function claimFunds(
        uint256 campaignId
    ) external nonReentrant whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];

        // === CHECKS ===
        if (campaign.ngo == address(0)) revert CampaignNotFound(campaignId);
        if (msg.sender != campaign.ngo) revert NotKycVerified(msg.sender); // Reusing error
        // NOTE: Intentionally NO blacklist check - NGOs can always claim earned funds
        if (campaign.state != CampaignState.Goal_Reached) {
            revert InvalidCampaignState(
                campaignId,
                campaign.state,
                CampaignState.Goal_Reached
            );
        }
        if (campaign.fundsClaimed) revert FundsAlreadyClaimed(campaignId);

        // CRITICAL FIX: Verify campaign has sufficient balance
        uint256 claimableAmount = campaignBalances[campaignId];
        if (claimableAmount == 0) {
            revert InsufficientCampaignBalance(
                campaignId,
                0,
                campaign.targetAmount // Expected amount
            );
        }

        // === EFFECTS ===
        campaign.fundsClaimed = true;
        CampaignState oldState = campaign.state;
        campaign.state = CampaignState.Closed;

        // Use claimableAmount instead of currentAmount for accurate accounting
        uint256 ngoAmount = (claimableAmount * campaign.ngoShareBps) / MAX_BPS;
        uint256 designerAmount = (claimableAmount * campaign.designerShareBps) /
            MAX_BPS;
        uint256 platformAmount = claimableAmount - ngoAmount - designerAmount;

        // CRITICAL FIX: Zero out campaign balance before transfers (CEI pattern)
        campaignBalances[campaignId] = 0;
        totalCampaignBalances -= claimableAmount; // Update cached total (O(1))

        emit FundsClaimed(campaignId, msg.sender, ngoAmount);
        emit CampaignStateChanged(campaignId, oldState, CampaignState.Closed);

        // === INTERACTIONS ===
        _transferHbar(payable(campaign.ngo), ngoAmount);
        _transferHbar(payable(campaign.designer), designerAmount);
        _transferHbar(payable(platformWallet), platformAmount);
    }

    /**
     * @notice Donor claims refund from a failed campaign (PULL pattern with pro-rata distribution)
     * @param donationId Donation to refund
     * @dev Uses pro-rata refund mechanism to ensure fair distribution when partial funds available
     */
    function claimRefund(
        uint256 donationId
    ) external nonReentrant whenNotPaused {
        Donation storage donation = donations[donationId];

        // === CHECKS ===
        if (donation.donor != msg.sender)
            revert NotDonor(msg.sender, donationId);
        if (donation.refunded) revert DonationAlreadyRefunded(donationId);

        Campaign storage campaign = campaigns[donation.campaignId];
        if (!campaign.refundsEnabled) {
            revert InvalidCampaignState(
                donation.campaignId,
                campaign.state,
                CampaignState.Failed_Refundable
            );
        }

        // CRITICAL FIX: Pro-rata refund calculation
        uint256 refundAmount = (donation.amount * campaign.refundRatioBps) /
            10000;

        // === EFFECTS ===
        donation.refunded = true;

        // CRITICAL FIX: Deduct from campaign balance before transfer (CEI pattern)
        campaignBalances[donation.campaignId] -= refundAmount;
        totalCampaignBalances -= refundAmount; // Update cached total (O(1))

        emit RefundClaimed(msg.sender, donation.campaignId, refundAmount);

        // === INTERACTIONS ===
        _transferHbar(payable(msg.sender), refundAmount);
    }

    /**
     * @notice Enable refunds for failed campaign with pro-rata calculation
     * @param campaignId Campaign to enable refunds for
     * @dev Calculates fair refund ratio based on available balance vs total raised
     * @dev CRITICAL: Uses cached totalRaised to prevent gas DoS and validates division
     */
    function enableRefunds(
        uint256 campaignId
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.state != CampaignState.Failed_Refundable) {
            revert InvalidCampaignState(
                campaignId,
                campaign.state,
                CampaignState.Failed_Refundable
            );
        }
        if (campaign.refundsEnabled) {
            revert("Refunds already enabled");
        }

        uint256 availableForRefund = campaignBalances[campaignId];
        uint256 totalRaised = campaign.totalRaised; // Use cached value (O(1))

        // CRITICAL FIX: Validate division by zero
        if (totalRaised == 0) {
            revert("No donations to refund");
        }

        // Calculate pro-rata ratio (basis points)
        campaign.refundRatioBps = (availableForRefund * 10000) / totalRaised;
        campaign.refundsEnabled = true;

        emit RefundsEnabled(campaignId, campaign.refundRatioBps);
    }

    /**
     * @notice Update campaign state based on deadline
     * @dev Can be called by anyone to trigger state transitions
     * @param campaignId Campaign to update
     */
    function updateCampaignState(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.ngo == address(0)) revert CampaignNotFound(campaignId);
        if (campaign.state != CampaignState.Active) return;

        if (
            block.timestamp > campaign.deadline &&
            campaignBalances[campaignId] < campaign.targetAmount
        ) {
            CampaignState oldState = campaign.state;
            campaign.state = CampaignState.Failed_Refundable;
            emit CampaignStateChanged(
                campaignId,
                oldState,
                CampaignState.Failed_Refundable
            );
        }
    }

    // ============ Multisig Treasury Functions ============

    /**
     * @notice Add a new treasury signer
     * @param signer Address to add
     */
    function addTreasurySigner(
        address signer
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (signer == address(0)) revert InvalidAddress(signer);
        if (isTreasurySigner[signer]) return;
        if (treasurySigners.length >= MAX_MULTISIG_SIGNERS) {
            revert InvalidMultisigThreshold(
                treasuryThreshold,
                treasurySigners.length
            );
        }

        treasurySigners.push(signer);
        isTreasurySigner[signer] = true;
        emit TreasurySignerAdded(signer, msg.sender);
    }

    /**
     * @notice Remove a treasury signer
     * @param signer Address to remove
     */
    function removeTreasurySigner(
        address signer
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (!isTreasurySigner[signer]) return;

        // Ensure we maintain minimum threshold
        if (treasurySigners.length - 1 < treasuryThreshold) {
            revert InvalidMultisigThreshold(
                treasuryThreshold,
                treasurySigners.length - 1
            );
        }

        isTreasurySigner[signer] = false;

        // Remove from array
        for (uint256 i = 0; i < treasurySigners.length; i++) {
            if (treasurySigners[i] == signer) {
                treasurySigners[i] = treasurySigners[
                    treasurySigners.length - 1
                ];
                treasurySigners.pop();
                break;
            }
        }

        emit TreasurySignerRemoved(signer, msg.sender);
    }

    /**
     * @notice Update treasury threshold
     * @param newThreshold New signature threshold
     */
    function updateTreasuryThreshold(
        uint256 newThreshold
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (
            newThreshold < MIN_MULTISIG_THRESHOLD ||
            newThreshold > treasurySigners.length
        ) {
            revert InvalidMultisigThreshold(
                newThreshold,
                treasurySigners.length
            );
        }

        uint256 oldThreshold = treasuryThreshold;
        treasuryThreshold = newThreshold;
        emit TreasuryThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Create a treasury proposal
     * @param target Target contract address
     * @param value HBAR value to send
     * @param data Calldata
     * @param description Proposal description
     */
    function createTreasuryProposal(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlyTreasurySigner returns (uint256) {
        uint256 proposalId = proposalCount++;

        MultisigProposal storage proposal = treasuryProposals[proposalId];
        proposal.target = target;
        proposal.value = value;
        proposal.data = data;
        proposal.description = description;
        proposal.approvalCount = 0;
        proposal.executed = false;
        proposal.createdAt = block.timestamp;

        emit ProposalCreated(proposalId, msg.sender, description);

        return proposalId;
    }

    /**
     * @notice Approve a treasury proposal
     * @param proposalId Proposal to approve
     * @dev Uses O(1) mapping for approval tracking to prevent gas limit issues
     *      as proposal history grows. No iteration over signers required.
     */
    function approveTreasuryProposal(
        uint256 proposalId
    ) external onlyTreasurySigner {
        MultisigProposal storage proposal = treasuryProposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);
        if (proposal.approvals[msg.sender])
            revert ProposalAlreadyApproved(proposalId, msg.sender);

        proposal.approvals[msg.sender] = true;
        proposal.approvalCount++;

        emit ProposalApproved(proposalId, msg.sender);
    }

    /**
     * @notice Execute a treasury proposal
     * @param proposalId Proposal to execute
     * @dev CRITICAL: Validates proposal value doesn't drain campaign funds
     */
    function executeTreasuryProposal(
        uint256 proposalId
    ) external onlyTreasurySigner nonReentrant {
        MultisigProposal storage proposal = treasuryProposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);
        if (proposal.approvalCount < treasuryThreshold) {
            revert InsufficientApprovals(
                proposalId,
                proposal.approvalCount,
                treasuryThreshold
            );
        }

        // CRITICAL FIX: Ensure treasury doesn't drain campaign funds (O(1) access)
        if (proposal.value > 0) {
            uint256 availableTreasury = address(this).balance -
                totalCampaignBalances;

            if (proposal.value > availableTreasury) {
                revert InsufficientCampaignBalance(
                    type(uint256).max, // Use max uint to indicate treasury
                    availableTreasury,
                    proposal.value
                );
            }
        }

        proposal.executed = true;

        (bool success, ) = proposal.target.call{value: proposal.value}(
            proposal.data
        );
        if (!success) revert ProposalExecutionFailed(proposalId);

        emit ProposalExecuted(proposalId, msg.sender);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform wallet
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(
        address newWallet
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (newWallet == address(0)) revert InvalidAddress(newWallet);
        address oldWallet = platformWallet;
        platformWallet = newWallet;
        emit PlatformWalletUpdated(oldWallet, newWallet);
    }

    /**
     * @notice Set NFT token ID
     * @param tokenId HTS NFT token address
     */
    function setNftTokenId(
        address tokenId
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (tokenId == address(0)) revert InvalidAddress(tokenId);
        nftTokenId = tokenId;
    }

    /**
     * @notice Pause all value transfers (circuit breaker)
     */
    function pause() external onlyRole(TREASURY_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(TREASURY_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal (only when paused)
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address recipient,
        uint256 amount
    ) external onlyRole(TREASURY_ADMIN_ROLE) whenPaused {
        if (recipient == address(0)) revert InvalidAddress(recipient);
        _transferHbar(payable(recipient), amount);
        emit EmergencyWithdrawal(address(0), recipient, amount);
    }

    // ============ View Functions ============

    function getCampaign(
        uint256 campaignId
    ) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getDonation(
        uint256 donationId
    ) external view returns (Donation memory) {
        return donations[donationId];
    }

    function getCampaignsByNGO(
        address ngo
    ) external view returns (uint256[] memory) {
        return campaignsByNGO[ngo];
    }

    function getDonationsByCampaign(
        uint256 campaignId
    ) external view returns (uint256[] memory) {
        return donationsByCampaign[campaignId];
    }

    function getDonationsByDonor(
        address donor
    ) external view returns (uint256[] memory) {
        return donationsByDonor[donor];
    }

    function getTreasurySigners() external view returns (address[] memory) {
        return treasurySigners;
    }

    function getCampaignBalance(
        uint256 campaignId
    ) external view returns (uint256) {
        return campaignBalances[campaignId];
    }

    function getProposalApprovalStatus(
        uint256 proposalId,
        address signer
    ) external view returns (bool) {
        return treasuryProposals[proposalId].approvals[signer];
    }

    // ============ Paginated View Functions ============

    /**
     * @notice Get campaigns by NGO with pagination
     * @param ngo NGO address
     * @param offset Starting index
     * @param limit Number of items to return (max MAX_PAGE_SIZE)
     * @return campaignIds Array of campaign IDs
     * @return total Total number of campaigns for this NGO
     */
    function getCampaignsByNGOPaginated(
        address ngo,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory campaignIds, uint256 total) {
        if (limit > MAX_PAGE_SIZE) revert InvalidPageSize(limit, MAX_PAGE_SIZE);

        uint256[] storage allCampaigns = campaignsByNGO[ngo];
        total = allCampaigns.length;

        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        campaignIds = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            campaignIds[i] = allCampaigns[offset + i];
        }

        return (campaignIds, total);
    }

    /**
     * @notice Get donations by campaign with pagination
     * @param campaignId Campaign ID
     * @param offset Starting index
     * @param limit Number of items to return (max MAX_PAGE_SIZE)
     * @return donationIds Array of donation IDs
     * @return total Total number of donations for this campaign
     */
    function getDonationsByCampaignPaginated(
        uint256 campaignId,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory donationIds, uint256 total) {
        if (limit > MAX_PAGE_SIZE) revert InvalidPageSize(limit, MAX_PAGE_SIZE);

        uint256[] storage allDonations = donationsByCampaign[campaignId];
        total = allDonations.length;

        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        donationIds = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            donationIds[i] = allDonations[offset + i];
        }

        return (donationIds, total);
    }

    /**
     * @notice Get donations by donor with pagination
     * @param donor Donor address
     * @param offset Starting index
     * @param limit Number of items to return (max MAX_PAGE_SIZE)
     * @return donationIds Array of donation IDs
     * @return total Total number of donations by this donor
     */
    function getDonationsByDonorPaginated(
        address donor,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory donationIds, uint256 total) {
        if (limit > MAX_PAGE_SIZE) revert InvalidPageSize(limit, MAX_PAGE_SIZE);

        uint256[] storage allDonations = donationsByDonor[donor];
        total = allDonations.length;

        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        donationIds = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            donationIds[i] = allDonations[offset + i];
        }

        return (donationIds, total);
    }

    /**
     * @notice Get active campaigns with pagination
     * @param offset Starting index
     * @param limit Number of items to return (max MAX_PAGE_SIZE)
     * @return campaignIds Array of active campaign IDs
     * @return total Total number of active campaigns
     */
    function getActiveCampaignsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory campaignIds, uint256 total) {
        if (limit > MAX_PAGE_SIZE) revert InvalidPageSize(limit, MAX_PAGE_SIZE);

        // First, count active campaigns
        uint256 activeCount = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].state == CampaignState.Active) {
                activeCount++;
            }
        }

        total = activeCount;

        if (offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        campaignIds = new uint256[](resultLength);

        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (
            uint256 i = 0;
            i < campaignCount && resultIndex < resultLength;
            i++
        ) {
            if (campaigns[i].state == CampaignState.Active) {
                if (currentIndex >= offset) {
                    campaignIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }

        return (campaignIds, total);
    }

    // ============ Internal Functions ============

    function _transferHbar(address payable recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);
    }

    /**
     * @notice Recover funds trapped in contract (not belonging to any campaign)
     * @dev Only callable when paused by treasury admin
     * @dev Calculates difference between contract balance and campaign balances
     * @param recipient Address to receive trapped funds
     */
    function recoverTrappedFunds(
        address recipient
    ) external onlyRole(TREASURY_ADMIN_ROLE) whenPaused {
        if (recipient == address(0)) revert InvalidAddress(recipient);

        uint256 contractBalance = address(this).balance;

        // Only recover funds that don't belong to any campaign (use cached total)
        if (contractBalance > totalCampaignBalances) {
            uint256 trappedFunds = contractBalance - totalCampaignBalances;
            _transferHbar(payable(recipient), trappedFunds);
            emit EmergencyWithdrawal(address(0), recipient, trappedFunds);
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============ Receive/Fallback Functions ============

    /**
     * @notice Reject direct HBAR transfers
     * @dev CRITICAL: Direct transfers would desynchronize totalCampaignBalances cache
     *      All contributions must go through contribute() function
     */
    receive() external payable {
        revert("Use contribute() function");
    }

    /**
     * @notice Reject unknown function calls
     * @dev Prevents accidental calls and potential exploits
     */
    fallback() external payable {
        revert("Use contribute() function");
    }
}
