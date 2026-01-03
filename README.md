# DonateOnChain - Production-Ready Smart Contract System

A UUPS upgradeable donation platform with KYC/AML compliance, campaign state machine, pull-over-push pattern, and multisig treasury protection for Hedera network.

## Features

### 🔒 Security
- **UUPS Upgradeable**: Gas-efficient upgrade pattern
- **Multisig Treasury**: Requires multiple signatures for critical operations
- **KYC/AML Compliance**: Gatekeeper pattern for verified participants
- **Circuit Breaker**: Emergency pause functionality
- **Reentrancy Protection**: NonReentrant guards on all value transfers
- **CEI Pattern**: Checks-Effects-Interactions pattern throughout

### 🎯 Campaign Management
- **State Machine**: Pending_Vetting → Active → Goal_Reached/Failed_Refundable → Closed
- **Pull-Over-Push**: NGOs and donors claim funds (no automatic transfers)
- **Flexible Revenue Sharing**: Configurable BPS splits between NGO, designer, and platform
- **Campaign Vetting**: Admin approval required before campaigns go live

### 🏆 NFT Proof of Donation
- **HTS Integration**: Native Hedera Token Service for NFT minting
- **Dynamic Metadata**: Update impact reports via HIP-850
- **Immutable Proof**: Permanent on-chain donation records

### 👥 Role-Based Access Control
- **DEFAULT_ADMIN_ROLE**: Contract upgrades and role management
- **COMPLIANCE_OFFICER_ROLE**: KYC verification and blacklisting
- **CAMPAIGN_MANAGER_ROLE**: Campaign vetting and impact updates
- **TREASURY_ADMIN_ROLE**: Emergency controls and platform settings

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ERC1967Proxy                             │
│                  (User-facing address)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ delegatecall
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 DonateOnChain.sol                           │
│              (Implementation Contract)                      │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ KYC/AML     │  │ Campaign     │  │ Donation     │      │
│  │ Module      │  │ State Machine│  │ Manager      │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Multisig    │  │ Access       │  │ Circuit      │      │
│  │ Treasury    │  │ Control      │  │ Breaker      │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ HTS (0x167) │
              │ NFT Minting │
              └─────────────┘
```

## Installation

```bash
# Clone repository
git clone https://github.com/Haykaybee3/DonateOnChain.git
cd DonateOnChain

# Install dependencies
forge install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

## Testing

```bash
# Run all tests
forge test -vvv

# Run with gas reporting
forge test --gas-report

# Run specific test file
forge test --match-contract DonateOnChainTest

# Run specific test
forge test --match-test test_ClaimFunds

# Coverage report
forge coverage
```

## Deployment

### 1. Configure Environment

Edit `.env` with your deployment parameters:
- Admin address
- Treasury multisig signers (minimum 3)
- Treasury threshold (minimum 2)
- Platform wallet
- Compliance officer and campaign manager addresses

### 2. Deploy to Hedera Testnet

```bash
forge script script/DeployDonateOnChain.s.sol \
  --rpc-url hedera_testnet \
  --broadcast \
  --verify
```

### 3. Post-Deployment Setup

1. **Verify Contracts**: Check Hedera Explorer for deployment
2. **Test KYC Flow**: Verify a test account
3. **Create Test Campaign**: Full end-to-end test
4. **Update Frontend**: Use proxy address (not implementation)

## Usage

### For NGOs

```solidity
// 1. Get KYC verified by compliance officer
// (Off-chain process, then on-chain verification)

// 2. Create campaign
uint256 campaignId = donateOnChain.createCampaign(
    designerAddress,
    "Campaign Title",
    "Description",
    "ipfs://QmImageHash",
    metadataFileHash,
    10 ether,              // target
    block.timestamp + 30 days,  // deadline
    7000,                  // 70% to NGO
    2000,                  // 20% to designer
    1000                   // 10% to platform
);

// 3. Wait for campaign manager to vet campaign

// 4. After goal reached, claim funds
donateOnChain.claimFunds(campaignId);
```

### For Donors

```solidity
// 1. Get KYC verified

// 2. Donate to campaign
uint256 nftId = donateOnChain.contribute{value: 1 ether}(
    campaignId,
    "ipfs://QmDonationMetadata"
);

// 3. If campaign fails, claim refund
donateOnChain.claimRefund(donationId);
```

### For Admins

```solidity
// Vet campaign
donateOnChain.vetCampaign(campaignId, true);  // approve

// Verify account
donateOnChain.verifyAccount(userAddress);

// Blacklist suspicious account
donateOnChain.blacklistAccount(suspiciousAddress);

// Emergency pause
donateOnChain.pause();
```

### For Treasury Multisig

```solidity
// Create proposal
uint256 proposalId = donateOnChain.createTreasuryProposal(
    targetAddress,
    value,
    calldata,
    "Proposal description"
);

// Approve (requires threshold signatures)
donateOnChain.approveTreasuryProposal(proposalId);

// Execute
donateOnChain.executeTreasuryProposal(proposalId);
```

## Security

### Audit Status
- ⏳ **Pending**: Q1 2026 security audit scheduled
- 📋 **Edge Cases**: See [SecurityEdgeCases.md](./SecurityEdgeCases.md)

### Known Limitations
1. **Unbounded Arrays**: View functions may fail with very large campaigns
   - Recommendation: Use off-chain indexing for production
2. **HTS Integration**: Placeholder implementation
   - Recommendation: Complete HTS integration before mainnet
3. **No Timelock**: Emergency functions lack timelock
   - Recommendation: Add timelock for critical operations

### Bug Bounty
Coming soon - details will be published after audit completion.

## Upgrading

The contract uses UUPS pattern for upgrades:

```solidity
// Deploy new implementation
DonateOnChain newImplementation = new DonateOnChain();

// Upgrade (requires DEFAULT_ADMIN_ROLE)
donateOnChain.upgradeToAndCall(address(newImplementation), "");
```

**Important**: Always test upgrades on testnet first and verify storage layout compatibility.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow Solidity style guide
- Add tests for all new features
- Update documentation
- Run `forge fmt` before committing
- Ensure all tests pass

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Pitch Deck
https://drive.google.com/drive/folders/1f1D9xZ-WepsuDXEhkqD5jvA_mneYSCTY?usp=drive_link

## Youtube Demo
https://youtu.be/jBzNm6H1OXk

## Contact

- **Project**: DonateOnChain
- **GitHub**: [@Haykaybee3](https://github.com/Haykaybee3)
- **Network**: Hedera Testnet

## Acknowledgments

- OpenZeppelin for upgradeable contract libraries
- Hedera for HTS integration
- Foundry for development framework
