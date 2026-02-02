# Deployed Contracts - DonateOnChain

**Network:** Hedera Testnet  
**Chain ID:** 296  
**Deployed:** 2026-02-01 12:28:27 UTC+1  
**Deployment Script:** `DeployDonateOnChainFast.s.sol`

---

## 📝 Contract Addresses

### Main Contract (Use This)
```
PROXY_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
CONTRACT_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
```

### Implementation (Reference Only)
```
IMPLEMENTATION_ADDRESS=0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7
```

---

## 🔗 Explorer Links

### Main Contract (Proxy)
**Hedera HashScan:**  
https://hashscan.io/testnet/contract/0xebA3fc3b4cDBA1A4625203347a8397a69d52D242

### Implementation Contract
**Hedera HashScan:**  
https://hashscan.io/testnet/contract/0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7

---

## 📊 Deployment Transactions

| Transaction | Hash | Block | Gas Used |
|------------|------|-------|----------|
| **Implementation** | `0x388dbedd5144a9d221f4b177aaddf2a115c129d6d4f326285e0b67b0833ea81c` | 30949126 | 3,725,957 |
| **Proxy** | `0x5f4a8ee4bc38dd1c52a8a3d4e47e1194503c55bb4cc4a5384d6cf6969b0b2dce` | 30949129 | 427,391 |
| **Compliance Officer Role** | `0x53eb017a9039c22cb07b3b2dd008eb0e4f6a2a1f45667eed7ba1bb70ee6c63cd` | 30949132 | 56,379 |
| **Campaign Manager Role** | `0xeeec5be753d8a06d551f930360c51ac535859708ad132a4fca85695829e33979` | 30949135 | 56,391 |

---

## 🔐 Configuration

### Admin & Roles
```bash
ADMIN_ADDRESS=0xb4648dAFaE73cF618c29f948b60959578a90FeCc
COMPLIANCE_OFFICER=0xaAad869Fc370cAE24b2b102Ace840f2f488cE5c0
CAMPAIGN_MANAGER=0xaAad869Fc370cAE24b2b102Ace840f2f488cE5c0
```

### Platform
```bash
PLATFORM_WALLET=0x98169d84DcA044Df94EB30c03DF1e20CaFEC5C2A
```

### Treasury Multisig (2-of-3)
```bash
TREASURY_THRESHOLD=2
TREASURY_SIGNER_1=0xb4648dAFaE73cF618c29f948b60959578a90FeCc
TREASURY_SIGNER_2=0xaAad869Fc370cAE24b2b102Ace840f2f488cE5c0
TREASURY_SIGNER_3=0x1E3ea2dEc6c0cFA8c2CF99dF09126142698C7Bb8
```

---

## 🌐 RPC Endpoints

### Hedera Testnet
```bash
RPC_URL=https://testnet.hashio.io/api
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
```


---

## 💻 Frontend Environment Variables

Add these to your `frontend/.env`:

```bash
# Smart Contract Addresses (Hedera Testnet)
VITE_CONTRACT_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
VITE_PROXY_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
VITE_IMPLEMENTATION_ADDRESS=0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7

# Network Configuration
VITE_CHAIN_ID=296
VITE_NETWORK_NAME=hedera-testnet
VITE_RPC_URL=https://testnet.hashio.io/api

# Explorer
VITE_EXPLORER_URL=https://hashscan.io/testnet
```

---

## 🔧 Backend Environment Variables

Add these to your `services/api/.env`:

```bash
# Smart Contract Addresses (Hedera Testnet)
CONTRACT_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
PROXY_ADDRESS=0xebA3fc3b4cDBA1A4625203347a8397a69d52D242
IMPLEMENTATION_ADDRESS=0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7

# Network Configuration
CHAIN_ID=296
NETWORK=hedera-testnet
RPC_URL=https://testnet.hashio.io/api

# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.7802825
```


---

## 📚 Additional Resources

- **Hedera Docs:** https://docs.hedera.com
- **HashScan Explorer:** https://hashscan.io/testnet
- **Contract ABI:** Located in `out/DonateOnChain.sol/DonateOnChain.json`
- **Deployment Details:** See `deployments/hedera-testnet-latest.json`

---

## ⚠️ Important Notes

1. **Use Proxy Address:** Always interact with the proxy address, not the implementation
2. **Network:** This is deployed on Hedera Testnet (Chain ID: 296)
3. **Upgradeable:** This is a UUPS upgradeable contract
4. **Roles:** Admin can grant/revoke roles as needed

---

## 🔍 Verification Status

### Current Status: ⏳ Pending Verification

Both contracts need to be verified on HashScan:

- [ ] **Implementation Contract** - `0x8D20b16C7AF2479dbD8F6bfd93c7ce1760da10D7`
- [ ] **Proxy Contract** - `0xebA3fc3b4cDBA1A4625203347a8397a69d52D242`

---

## ✅ Frontend & Backend Integration

### Status: Completed ✅

Contract addresses have been added to both frontend and backend:

#### Frontend (apps/web):
- ✅ `src/contracts/addresses.ts` - Full address configuration
- ✅ `src/contracts/address.ts` - Simple exports
- ✅ `src/contracts/index.ts` - Central config with ABI
- ✅ `src/contracts/DonateOnChain.abi.json` - Contract ABI
- ✅ `.env.example` - Environment template

#### Backend (services/api):
- ✅ `src/addresses/index.js` - Address configuration
- ✅ `src/addresses/DonateOnChain.abi.json` - Contract ABI
- ✅ `.env` - Updated with CONTRACT_ID

### Usage in Frontend:
```typescript
import { CONTRACT_ADDRESS, ABI, NETWORK_CONFIG } from '@/contracts';

// Use the contract
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

### Usage in Backend:
```javascript
const { CONTRACT_ADDRESS, CONTRACT_ID, CHAIN_ID } = require('./addresses');
```

---

## ✅ Contract Verification Tests

### Status: All Tests Passed ✅

Contract functionality verified via RPC calls:

| Function | Result | Description |
|----------|--------|-------------|
| `platformWallet()` | `0x98169d84DcA044Df94EB30c03DF1e20CaFEC5C2A` | ✅ Platform wallet configured correctly |
| `paused()` | `false` | ✅ Contract is active and not paused |
| `campaignCount()` | `0` | ✅ No campaigns created yet |
| `treasuryThreshold()` | `2` | ✅ 2-of-3 multisig threshold confirmed |

### Test Commands:
```bash
# Check if contract is paused
cast call 0xebA3fc3b4cDBA1A4625203347a8397a69d52D242 "paused()(bool)" --rpc-url https://testnet.hashio.io/api

# Check campaign count
cast call 0xebA3fc3b4cDBA1A4625203347a8397a69d52D242 "campaignCount()(uint256)" --rpc-url https://testnet.hashio.io/api

# Check treasury threshold
cast call 0xebA3fc3b4cDBA1A4625203347a8397a69d52D242 "treasuryThreshold()(uint256)" --rpc-url https://testnet.hashio.io/api

# Check platform wallet
cast call 0xebA3fc3b4cDBA1A4625203347a8397a69d52D242 "platformWallet()(address)" --rpc-url https://testnet.hashio.io/api
```

---

**Last Updated:** 2026-02-02 02:18:00 UTC+1
