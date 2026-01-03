// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IHederaTokenService
 * @notice Interface for Hedera Token Service precompile at 0x167
 * @dev Simplified interface for NFT operations
 */
interface IHederaTokenService {
    struct TokenKey {
        uint256 keyType;
        bytes key;
    }

    struct Expiry {
        uint32 second;
        address autoRenewAccount;
        uint32 autoRenewPeriod;
    }

    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;
        int64 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    /**
     * @notice Mints NFTs to a token
     * @param token The token address
     * @param amount Number of NFTs to mint
     * @param metadata Array of metadata for each NFT
     * @return responseCode HTS response code (22 = SUCCESS)
     * @return newTotalSupply New total supply
     * @return serialNumbers Array of minted serial numbers
     */
    function mintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    )
        external
        returns (
            int64 responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        );

    /**
     * @notice Updates NFT metadata
     * @param token The token address
     * @param serialNumber The NFT serial number
     * @param metadata New metadata
     * @return responseCode HTS response code
     */
    function updateNftMetadata(
        address token,
        int64 serialNumber,
        bytes memory metadata
    ) external returns (int64 responseCode);

    /**
     * @notice Transfers NFT
     * @param token The token address
     * @param sender From address
     * @param recipient To address
     * @param serialNumber NFT serial number
     * @return responseCode HTS response code
     */
    function transferNFT(
        address token,
        address sender,
        address recipient,
        int64 serialNumber
    ) external returns (int64 responseCode);

    /**
     * @notice Associates token with account
     * @param account Account to associate
     * @param token Token address
     * @return responseCode HTS response code
     */
    function associateToken(
        address account,
        address token
    ) external returns (int64 responseCode);

    /**
     * @notice Creates a new NFT collection
     * @param token Token configuration
     * @return responseCode HTS response code
     * @return tokenAddress Created token address
     */
    function createNonFungibleToken(
        HederaToken memory token
    ) external payable returns (int64 responseCode, address tokenAddress);
}
