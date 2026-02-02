# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CI/CD workflows for all project components
- Issue templates for bug reports, feature requests, security vulnerabilities, and questions
- Pull request template with detailed checklist
- CODEOWNERS file for automated code review assignments
- Dependabot configuration for automated dependency updates
- Auto-labeler for PRs and issues
- Stale bot configuration for issue and PR management
- Security scanning workflow with CodeQL and Slither
- Release workflow for automated releases
- Contributing guidelines

### Changed
- Enhanced smart contract CI workflow with coverage and gas reporting
- Updated workflow triggers to include 'develop' branch

### Security
- Added automated security scanning workflows
- Implemented dependency review for pull requests

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release of DonateOnChain platform
- UUPS upgradeable smart contracts
- React + TypeScript frontend application
- Backend API service with Prisma and PostgreSQL
- Relayer service for gasless transactions
- NFT proof of donation system
- KYC/AML compliance features
- Campaign management system
- Pull-over-push payment pattern
- Multisig treasury protection
- Role-based access control

### Security
- Implemented reentrancy protection
- Circuit breaker functionality
- KYC verification and blacklisting
- Comprehensive access control

---

## Types of Changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for security-related changes

## Version Format

- Major version (X.0.0) - Incompatible API changes
- Minor version (0.X.0) - Backwards-compatible functionality
- Patch version (0.0.X) - Backwards-compatible bug fixes
