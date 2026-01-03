# DonateOnChain

A decentralized donation platform built on Hedera that connects NGOs with donors through transparent, secure, and verifiable charitable giving. DonateOnChain combines smart contract security with an intuitive web interface to revolutionize how charitable donations are made and tracked.

## 🌟 Overview

DonateOnChain is a full-stack Web3 application that enables:
- **NGOs** to create and manage fundraising campaigns
- **Donors** to contribute securely and receive NFT proof of donation
- **Designers** to create campaign visuals and earn revenue share
- **Admins** to ensure compliance and platform integrity

### Key Features

#### 🔒 Security & Compliance
- **UUPS Upgradeable Smart Contracts**: Gas-efficient upgrade pattern
- **KYC/AML Compliance**: Gatekeeper pattern for verified participants
- **Multisig Treasury**: Multi-signature protection for critical operations
- **Circuit Breaker**: Emergency pause functionality
- **Reentrancy Protection**: Comprehensive security guards

#### 🎯 Campaign Management
- **State Machine**: Structured campaign lifecycle (Pending → Active → Goal Reached/Failed → Closed)
- **Pull-Over-Push Pattern**: Secure fund distribution model
- **Flexible Revenue Sharing**: Configurable splits between NGO, designer, and platform
- **Campaign Vetting**: Admin approval workflow

#### 🏆 NFT Proof of Donation
- **HTS Integration**: Native Hedera Token Service for NFT minting
- **Dynamic Metadata**: Updateable impact reports
- **Immutable Records**: Permanent on-chain donation proof

#### 🎨 Modern Web Interface
- **React + TypeScript**: Type-safe frontend development
- **Wallet Integration**: HashPack, WalletConnect support
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Real-time Updates**: Live campaign status and donation tracking

## 🏗️ Project Structure

```
DonateOnChain/
├── src/                          # Smart contracts (Solidity)
│   ├── DonateOnChain.sol        # Main UUPS upgradeable contract
│   ├── AMLCompliance.sol        # KYC/AML module
│   └── interfaces/              # Contract interfaces
├── frontend/                     # Web application (React + TypeScript)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── config/              # Wallet & network configuration
│   │   ├── utils/               # Helper functions
│   │   └── lib/                 # HashPack integration
│   └── server/                  # Backend relayer service
├── script/                       # Deployment scripts
├── test/                         # Smart contract tests
└── setup/                        # Setup utilities
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ and npm
- **Foundry** (for smart contract development)
- **Git**
- **Hedera Testnet Account**

### Installation

```bash
# Clone the repository
git clone https://github.com/donateonchain-create/donateonchain.git
cd donateonchain

# Install smart contract dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Configure your environment variables
# Edit .env and frontend/.env with your settings
```

### Running Locally

#### Frontend Development Server

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

#### Smart Contract Development

```bash
# Run tests
forge test -vvv

# Run tests with gas reporting
forge test --gas-report

# Generate coverage report
forge coverage
```

## 📋 Smart Contract Architecture

### Core Contracts

#### DonateOnChain.sol
Main upgradeable contract implementing:
- Campaign creation and management
- Donation processing
- Fund distribution (pull-over-push)
- NFT minting integration
- Role-based access control

#### AMLCompliance.sol
Compliance module providing:
- KYC verification
- Account blacklisting
- Compliance officer management

### Contract Roles

| Role | Permissions |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | Contract upgrades, role management |
| `COMPLIANCE_OFFICER_ROLE` | KYC verification, blacklisting |
| `CAMPAIGN_MANAGER_ROLE` | Campaign vetting, impact updates |
| `TREASURY_ADMIN_ROLE` | Emergency controls, platform settings |

## 🌐 Frontend Application

### Technology Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: TanStack Query
- **Wallet Integration**: 
  - HashConnect (HashPack wallet)
  - Reown AppKit (WalletConnect)
- **Build Tool**: Vite
- **Deployment**: Netlify

### Key Components

- **Campaign Browser**: Discover and explore active campaigns
- **Campaign Creator**: Create new fundraising campaigns (NGOs)
- **Donation Flow**: Secure contribution process with wallet integration
- **User Dashboard**: Track donations and campaign progress
- **Admin Panel**: Campaign vetting and compliance management

## 🔧 Configuration

### Smart Contract Environment (`.env`)

```bash
# Deployment
ADMIN_ADDRESS=0x...
PLATFORM_WALLET=0x...
COMPLIANCE_OFFICER=0x...
CAMPAIGN_MANAGER=0x...

# Treasury Multisig
TREASURY_SIGNER_1=0x...
TREASURY_SIGNER_2=0x...
TREASURY_SIGNER_3=0x...
TREASURY_THRESHOLD=2

# Network
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
PRIVATE_KEY=your_private_key
```

### Frontend Environment (`frontend/.env`)

```bash
# Hedera Network
VITE_HEDERA_NETWORK=testnet
VITE_CONTRACT_ADDRESS=0x...

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Firebase (optional)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...

# Supabase (optional)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 📦 Deployment

### Smart Contracts

Deploy to Hedera Testnet:

```bash
forge script script/DeployDonateOnChain.s.sol \
  --rpc-url hedera_testnet \
  --broadcast \
  --verify
```

### Frontend

#### Deploy to Netlify

```bash
cd frontend
npm run build:netlify
```

Or connect your GitHub repository to Netlify for automatic deployments.

#### Manual Deployment

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting provider
```

## 💡 Usage Examples

### For NGOs

1. **Get KYC Verified**: Complete off-chain KYC process with compliance officer
2. **Create Campaign**: Use the web interface to create a new fundraising campaign
3. **Wait for Approval**: Campaign manager reviews and approves your campaign
4. **Monitor Progress**: Track donations in real-time through your dashboard
5. **Claim Funds**: Once goal is reached, claim funds through the platform

### For Donors

1. **Connect Wallet**: Use HashPack or WalletConnect to connect your Hedera wallet
2. **Browse Campaigns**: Explore active campaigns and choose one to support
3. **Make Donation**: Contribute any amount (minimum applies)
4. **Receive NFT**: Get an NFT proof of donation minted to your wallet
5. **Track Impact**: View campaign updates and impact reports

### For Admins

**Campaign Management:**
```solidity
// Vet and approve campaigns
donateOnChain.vetCampaign(campaignId, true);

// Update impact reports
donateOnChain.updateImpactReport(campaignId, "ipfs://QmNewReport");
```

**Compliance:**
```solidity
// Verify user accounts
donateOnChain.verifyAccount(userAddress);

// Blacklist suspicious accounts
donateOnChain.blacklistAccount(suspiciousAddress);

// Emergency pause
donateOnChain.pause();
```

## 🧪 Testing

### Smart Contract Tests

```bash
# Run all tests
forge test -vvv

# Run specific test file
forge test --match-contract DonateOnChainTest

# Run specific test
forge test --match-test test_ClaimFunds

# Coverage report
forge coverage

# Gas report
forge test --gas-report
```

### Frontend Tests

```bash
cd frontend

# Run linter
npm run lint

# Build for production (validates TypeScript)
npm run build
```

## 🔐 Security

### Audit Status
- ⏳ **Pending**
- 📋 **Edge Cases**: See [SecurityEdgeCases.md](./SecurityEdgeCases.md)
- 🛡️ **Vulnerability Response**: See [VULNERABILITY_RESPONSE.md](./VULNERABILITY_RESPONSE.md)

### Security Features
- Pull-over-push pattern prevents reentrancy
- Multisig treasury for critical operations
- KYC/AML compliance gatekeeper
- Emergency pause functionality
- Comprehensive access control

### Known Considerations
1. **View Functions**: May fail with very large datasets - use off-chain indexing for production
2. **HTS Integration**: Complete integration required before mainnet deployment
3. **Timelock**: Consider adding timelock for critical operations

### Bug Bounty
Coming soon - details will be published after audit completion.

## 🔄 Upgrading Contracts

The contract uses UUPS pattern for upgrades:

```solidity
// Deploy new implementation
DonateOnChain newImplementation = new DonateOnChain();

// Upgrade (requires DEFAULT_ADMIN_ROLE)
donateOnChain.upgradeToAndCall(address(newImplementation), "");
```

**Important**: Always test upgrades on testnet first and verify storage layout compatibility.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow Solidity and TypeScript style guides
- Add tests for all new features
- Update documentation as needed
- Run `forge fmt` for Solidity code before committing
- Ensure all tests pass before submitting PR

## 📚 Documentation

- **[Guide.md](./Guide.md)**: Comprehensive development guide
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)**: Security improvements and enhancements
- **[SecurityEdgeCases.md](./SecurityEdgeCases.md)**: Security edge cases documentation
- **[VULNERABILITY_RESPONSE.md](./VULNERABILITY_RESPONSE.md)**: Vulnerability response plan

## 🛣️ Roadmap

- [x] UUPS upgradeable smart contracts
- [x] KYC/AML compliance module
- [x] Frontend web application
- [x] HashPack wallet integration
- [ ] Complete HTS NFT integration
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support

## � License

MIT License - see [LICENSE](./LICENSE) file for details

## 🎥 Media

- **Pitch Deck**: [View on Google Drive](https://drive.google.com/drive/folders/1f1D9xZ-WepsuDXEhkqD5jvA_mneYSCTY?usp=drive_link)
- **Demo Video**: [Watch on YouTube](https://youtu.be/jBzNm6H1OXk)

## 📞 Contact

- **Project**: DonateOnChain
- **GitHub**: [@donateonchain-create](https://github.com/donateonchain-create)
- **Network**: Hedera Testnet
- **Website**: Coming soon

## 🙏 Acknowledgments

- **OpenZeppelin** for upgradeable contract libraries
- **Hedera** for HTS integration and network support
- **Foundry** for development framework
- **HashPack** for wallet integration support

---

Built with ❤️ for transparent charitable giving on Hedera
