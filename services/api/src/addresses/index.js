/**
 * DonateOnChain Contract Configuration
 * Network: Hedera Testnet (Chain ID: 296)
 * Deployed: 2026-02-01
 */

// Contract Addresses
const CONTRACT_CONFIG = {
    // Main contract address (use this for all interactions)
    CONTRACT_ADDRESS: '0xebA3fc3b4cDBA1A4625203347a8397a69d52D242',

    // Implementation address (reference only, do not interact directly)
    IMPLEMENTATION_ADDRESS: '0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7',

    // Contract IDs on Hedera
    CONTRACT_ID: '0.0.7802966',
    IMPLEMENTATION_ID: '0.0.7802965',
};

// Network Configuration
const NETWORK_CONFIG = {
    CHAIN_ID: 296,
    NETWORK_NAME: 'hedera-testnet',
    RPC_URL: 'https://testnet.hashio.io/api',
    MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
    EXPLORER_URL: 'https://hashscan.io/testnet',
};

// Role Hashes
const ROLES = {
    DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
    CAMPAIGN_MANAGER_ROLE: '0x5022544358ee0bece556b72ae8983c7f24341bd5b9483ce8a19bff5efbb2de92',
    COMPLIANCE_OFFICER_ROLE: '0xb6f0283bd1ed00c6aa7e988a7516070240f3610a34d167391359b648eb37cefc',
};

// Platform Configuration
const PLATFORM_CONFIG = {
    PLATFORM_WALLET: '0x98169d84DcA044Df94EB30c03DF1e20CaFEC5C2A',
    ADMIN_ADDRESS: '0xb4648dAFaE73cF618c29f948b60959578a90FeCc',
};

module.exports = {
    CONTRACT_CONFIG,
    NETWORK_CONFIG,
    ROLES,
    PLATFORM_CONFIG,

    // Convenience exports
    CONTRACT_ADDRESS: CONTRACT_CONFIG.CONTRACT_ADDRESS,
    CONTRACT_ID: CONTRACT_CONFIG.CONTRACT_ID,
    CHAIN_ID: NETWORK_CONFIG.CHAIN_ID,
    RPC_URL: NETWORK_CONFIG.RPC_URL,
    MIRROR_NODE_URL: NETWORK_CONFIG.MIRROR_NODE_URL,
};
