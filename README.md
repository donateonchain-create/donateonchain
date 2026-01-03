# DonateOnChain

A decentralized donation platform built on Hedera that connects NGOs with donors through transparent, secure, and verifiable charitable giving.

## Overview

DonateOnChain is a full-stack Web3 application that enables:
- **NGOs** to create and manage fundraising campaigns
- **Donors** to contribute securely and receive NFT proof of donation
- **Designers** to create campaign visuals and earn revenue share
- **Admins** to ensure compliance and platform integrity

### Key Features

#### Security & Compliance
- UUPS Upgradeable Smart Contracts
- KYC/AML Compliance
- Multisig Treasury
- Circuit Breaker
- Reentrancy Protection

#### Campaign Management
- State Machine: Structured campaign lifecycle
- Pull-Over-Push Pattern
- Flexible Revenue Sharing
- Campaign Vetting

#### NFT Proof of Donation
- HTS Integration
- Dynamic Metadata
- Immutable Records

#### Web Interface
- React + TypeScript
- Wallet Integration (HashPack, WalletConnect)
- Responsive Design
- Real-time Updates

## Project Structure

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

## Quick Start

### Prerequisites

- Node.js v18+ and npm
- Foundry (for smart contract development)
- Git
- Hedera Testnet Account

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

## Smart Contract Architecture

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

## Frontend Application

### Technology Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: TanStack Query
- **Wallet Integration**: HashConnect, Reown AppKit
- **Build Tool**: Vite
- **Deployment**: Netlify

### Key Components

- Campaign Browser
- Campaign Creator
- Donation Flow
- User Dashboard
- Admin Panel

## Configuration

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

## Deployment

### Smart Contracts

Deploy to Hedera Testnet:

```bash
forge script script/DeployDonateOnChain.s.sol \
  --rpc-url hedera_testnet \
  --broadcast \
  --verify
```

## Testing

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

## Security

### Security Features
- Pull-over-push pattern prevents reentrancy
- Multisig treasury for critical operations
- KYC/AML compliance gatekeeper
- Emergency pause functionality
- Comprehensive access control

## Upgrading Contracts

The contract uses UUPS pattern for upgrades:

```solidity
// Deploy new implementation
DonateOnChain newImplementation = new DonateOnChain();

// Upgrade (requires DEFAULT_ADMIN_ROLE)
donateOnChain.upgradeToAndCall(address(newImplementation), "");
```

**Important**: Always test upgrades on testnet first and verify storage layout compatibility.

## Development Guidelines

- Follow Solidity and TypeScript style guides
- Add tests for all new features
- Update documentation as needed
- Run `forge fmt` for Solidity code before committing
- Ensure all tests pass before submitting PR

## License

MIT License - see [LICENSE](./LICENSE) file for details
