/**
 * DonateOnChain Contract Configuration
 * Central configuration file for all contract interactions
 * 
 * Network: Hedera Testnet (Chain ID: 296)
 * Deployed: 2026-02-01
 */

// Import the ABI
import ABI from './DonateOnChain.abi.json';

// ============================================
// CONTRACT ADDRESSES
// ============================================

/**
 * Main contract address - use this for all interactions
 */
export const CONTRACT_ADDRESS = '0xebA3fc3b4cDBA1A4625203347a8397a69d52D242' as const;

/**
 * Implementation address - reference only, do not interact directly
 */
export const IMPLEMENTATION_ADDRESS = '0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7' as const;

/**
 * Contract IDs on Hedera
 */
export const CONTRACT_ID = '0.0.7802966' as const;
export const IMPLEMENTATION_ID = '0.0.7802965' as const;

// ============================================
// NETWORK CONFIGURATION
// ============================================

export const NETWORK_CONFIG = {
    chainId: 296,
    name: 'Hedera Testnet',
    rpcUrl: 'https://testnet.hashio.io/api',
    explorerUrl: 'https://hashscan.io/testnet',
    nativeSymbol: 'HBAR',
    decimals: 18,
} as const;

// ============================================
// ACCESS CONTROL ROLES
// ============================================

export const ROLES = {
    DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
    CAMPAIGN_MANAGER_ROLE: '0x5022544358ee0bece556b72ae8983c7f24341bd5b9483ce8a19bff5efbb2de92',
    COMPLIANCE_OFFICER_ROLE: '0xb6f0283bd1ed00c6aa7e988a7516070240f3610a34d167391359b648eb37cefc',
} as const;

// ============================================
// PLATFORM ADDRESSES
// ============================================

export const PLATFORM = {
    wallet: '0x98169d84DcA044Df94EB30c03DF1e20CaFEC5C2A',
    admin: '0xb4648dAFaE73cF618c29f948b60959578a90FeCc',
    complianceOfficer: '0xaAad869Fc370cAE24b2b102Ace840f2f488cE5c0',
    campaignManager: '0xaAad869Fc370cAE24b2b102Ace840f2f488cE5c0',
} as const;

// ============================================
// CONTRACT ABI (exported directly)
// ============================================

export { ABI };

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the explorer URL for a contract
 */
export const getContractExplorerUrl = (address: string = CONTRACT_ADDRESS): string => {
    return `${NETWORK_CONFIG.explorerUrl}/contract/${address}`;
};

/**
 * Get the explorer URL for a transaction
 */
export const getTransactionExplorerUrl = (txHash: string): string => {
    return `${NETWORK_CONFIG.explorerUrl}/transaction/${txHash}`;
};

/**
 * Get the explorer URL for an account
 */
export const getAccountExplorerUrl = (address: string): string => {
    return `${NETWORK_CONFIG.explorerUrl}/account/${address}`;
};

// ============================================
// DEFAULT EXPORT
// ============================================

const config = {
    address: CONTRACT_ADDRESS,
    implementationAddress: IMPLEMENTATION_ADDRESS,
    contractId: CONTRACT_ID,
    abi: ABI,
    network: NETWORK_CONFIG,
    roles: ROLES,
    platform: PLATFORM,
    getContractExplorerUrl,
    getTransactionExplorerUrl,
    getAccountExplorerUrl,
};

export default config;
