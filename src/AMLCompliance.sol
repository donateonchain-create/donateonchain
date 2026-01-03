// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAdminRegistry} from "./interfaces/IAdminRegistry.sol";
import {Errors} from "./Errors.sol";

/**
 * @title AMLCompliance
 * @notice Manages AML compliance including account freezing/unfreezing
 * @dev Implements freeze functionality with admin controls for error correction
 */
contract AMLCompliance is Ownable {
    IAdminRegistry public immutable ADMIN_REGISTRY;

    // Mapping to track frozen accounts
    mapping(address => bool) private frozenAccounts;

    // Mapping to track freeze reasons for audit trail
    mapping(address => string) private freezeReasons;

    // Mapping to track freeze timestamps
    mapping(address => uint256) private freezeTimestamps;

    // Array to track all frozen accounts for monitoring
    address[] private frozenAccountsList;

    // Events
    event AccountFrozen(
        address indexed account,
        string reason,
        address indexed frozenBy,
        uint256 timestamp
    );

    event AccountUnfrozen(
        address indexed account,
        string reason,
        address indexed unfrozenBy,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        if (!ADMIN_REGISTRY.isAdmin(msg.sender))
            revert Errors.NotAdmin(msg.sender);
        _;
    }

    constructor(
        address initialOwner,
        address _adminRegistry
    ) Ownable(initialOwner) {
        if (_adminRegistry == address(0))
            revert Errors.InvalidAddress(_adminRegistry);
        ADMIN_REGISTRY = IAdminRegistry(_adminRegistry);
    }

    /**
     * @notice Freeze an account due to AML concerns
     * @param account The address to freeze
     * @param reason The reason for freezing (for audit trail)
     */
    function freezeAccount(
        address account,
        string calldata reason
    ) external onlyAdmin {
        if (account == address(0)) revert Errors.InvalidAddress(account);
        if (bytes(reason).length == 0) revert("Freeze reason required");
        if (frozenAccounts[account]) revert("Account already frozen");

        frozenAccounts[account] = true;
        freezeReasons[account] = reason;
        freezeTimestamps[account] = block.timestamp;
        frozenAccountsList.push(account);

        emit AccountFrozen(account, reason, msg.sender, block.timestamp);
    }

    /**
     * @notice Unfreeze an account (e.g., if frozen in error or after investigation)
     * @param account The address to unfreeze
     * @param reason The reason for unfreezing (for audit trail)
     */
    function unfreezeAccount(
        address account,
        string calldata reason
    ) external onlyAdmin {
        if (account == address(0)) revert Errors.InvalidAddress(account);
        if (bytes(reason).length == 0) revert("Unfreeze reason required");
        if (!frozenAccounts[account]) revert("Account not frozen");

        frozenAccounts[account] = false;

        emit AccountUnfrozen(account, reason, msg.sender, block.timestamp);

        // Note: We keep the freeze history (reason, timestamp) for audit purposes
        // but mark the account as unfrozen
    }

    /**
     * @notice Check if an account is frozen
     * @param account The address to check
     * @return bool True if account is frozen
     */
    function isFrozen(address account) external view returns (bool) {
        return frozenAccounts[account];
    }

    /**
     * @notice Get freeze details for an account
     * @param account The address to query
     * @return frozen Whether the account is currently frozen
     * @return reason The reason for the last freeze
     * @return timestamp When the account was frozen
     */
    function getFreezeDetails(
        address account
    )
        external
        view
        returns (bool frozen, string memory reason, uint256 timestamp)
    {
        return (
            frozenAccounts[account],
            freezeReasons[account],
            freezeTimestamps[account]
        );
    }

    /**
     * @notice Get all frozen accounts
     * @return address[] Array of frozen account addresses
     */
    function getFrozenAccounts() external view returns (address[] memory) {
        // Filter to only return currently frozen accounts
        uint256 count = 0;
        for (uint256 i = 0; i < frozenAccountsList.length; i++) {
            if (frozenAccounts[frozenAccountsList[i]]) {
                count++;
            }
        }

        address[] memory currentlyFrozen = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < frozenAccountsList.length; i++) {
            if (frozenAccounts[frozenAccountsList[i]]) {
                currentlyFrozen[index] = frozenAccountsList[i];
                index++;
            }
        }

        return currentlyFrozen;
    }

    /**
     * @notice Modifier to be used in other contracts to check if account is frozen
     * @dev This function should be called by other contracts before allowing transactions
     */
    function requireNotFrozen(address account) external view {
        if (frozenAccounts[account]) revert("Account is frozen");
    }
}
