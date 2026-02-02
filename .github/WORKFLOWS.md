# GitHub Actions Workflows Documentation

## Overview

This document provides detailed information about all GitHub Actions workflows in the DonateOnChain repository.

## 📊 Workflow Summary

| Workflow | Status Badge | Purpose |
|----------|--------------|---------|
| Smart Contract CI | ![CI](https://github.com/donateonchain-create/donateonchain/workflows/Smart%20Contract%20CI/badge.svg) | Test and build smart contracts |
| Frontend CI | ![Frontend](https://github.com/donateonchain-create/donateonchain/workflows/Frontend%20CI/badge.svg) | Test and build frontend |
| API CI | ![API](https://github.com/donateonchain-create/donateonchain/workflows/API%20Service%20CI/badge.svg) | Test backend API |
| Security Scan | ![Security](https://github.com/donateonchain-create/donateonchain/workflows/Security%20Scanning/badge.svg) | Security analysis |

## 🏗️ CI/CD Workflows

### Smart Contract CI (`test.yml`)

**Triggers:** Push/PR to main, master, develop branches (when smart contract files change)

**Steps:**
1. Checkout code with submodules
2. Install Foundry toolchain
3. Install forge dependencies
4. Check code formatting
5. Build contracts with size report
6. Run tests with verbose output
7. Generate gas report
8. Generate coverage report

**Environment:**
- Profile: `ci` (from foundry.toml)
- Runner: `ubuntu-latest`

**Key Features:**
- Submodule support
- Comprehensive test output
- Gas optimization tracking
- Coverage reporting

---

### Frontend CI (`frontend-ci.yml`)

**Triggers:** Push/PR to main, master, develop branches (when frontend files change)

**Steps:**
1. Checkout code
2. Setup Node.js with npm cache
3. Install dependencies
4. Run ESLint
5. Build application
6. Upload build artifacts

**Environment:**
- Node.js: v18
- Working directory: `apps/web`
- Build mode: Production

**Key Features:**
- npm cache for faster builds
- Legacy peer deps support
- Artifact retention (7 days)
- Mock environment variables for build

---

### API Service CI (`api-ci.yml`)

**Triggers:** Push/PR to main, master, develop branches (when API files change)

**Steps:**
1. Checkout code
2. Start PostgreSQL service
3. Setup Node.js with npm cache
4. Install dependencies
5. Generate Prisma client
6. Run migrations
7. Run tests (if configured)

**Services:**
- PostgreSQL 16 (testdb)

**Environment:**
- Node.js: v18
- Working directory: `services/api`
- Database: PostgreSQL on localhost:5432

**Key Features:**
- Integrated PostgreSQL service
- Health checks for database
- Prisma ORM support
- Conditional test execution

---

### Lint (`lint.yml`)

**Triggers:** Push/PR to main, master, develop branches

**Jobs:**

1. **lint-contracts**
   - Check Solidity formatting with `forge fmt`
   - Fail if any files need formatting

2. **lint-frontend**
   - Run ESLint on frontend code
   - Check TypeScript types

3. **lint-markdown**
   - Lint markdown files
   - Check formatting and style
   - Continue on error (advisory)

---

### Code Coverage (`code-coverage.yml`)

**Triggers:** Push/PR to main, master, develop branches (when contract/test files change)

**Steps:**
1. Generate coverage with Foundry
2. Create LCOV report
3. Upload to Codecov
4. Generate summary
5. Post comment on PR (if applicable)

**Key Features:**
- Codecov integration
- PR comment with coverage
- Job summary with results
- Update existing comment if present

---

## 🔒 Security Workflows

### Security Scanning (`security-scan.yml`)

**Triggers:** 
- Push/PR to main, master, develop
- Weekly on Monday at midnight
- Manual dispatch

**Jobs:**

1. **codeql**
   - Initialize CodeQL
   - Analyze JavaScript/TypeScript
   - Upload results to GitHub Security

2. **dependency-check**
   - Audit npm dependencies (frontend)
   - Audit npm dependencies (API)
   - Report high severity issues

3. **smart-contract-security**
   - Run Slither analysis
   - Upload SARIF results
   - Continue on error

**Permissions:**
- contents: read
- security-events: write
- actions: read

**Key Features:**
- Multi-language support
- SARIF reporting
- Integration with GitHub Security tab
- Weekly automated scans

---

### Dependency Review (`dependency-review.yml`)

**Triggers:** Pull requests to main, master

**Steps:**
1. Checkout code
2. Run dependency review action
3. Check for vulnerable dependencies
4. Comment summary in PR

**Key Features:**
- Fail on moderate+ severity
- Always comment in PR
- Blocks merging if issues found

---

## 🚀 Release & Deployment

### Release (`release.yml`)

**Triggers:** Push tags matching `v*` (e.g., v1.0.0)

**Jobs:**

1. **create-release**
   - Extract version from tag
   - Get changelog for version
   - Create GitHub release
   - Mark as prerelease if alpha/beta/rc

2. **build-and-deploy**
   - Build smart contracts
   - Build frontend for mainnet
   - Upload contract artifacts
   - Attach to release

**Key Features:**
- Automatic changelog extraction
- Prerelease detection
- Release notes generation
- Artifact attachment

---

## 🤖 Automation Workflows

### Auto Label (`auto-label.yml`)

**Triggers:** PR opened, synchronized, reopened

**Steps:**
1. Label based on file paths (using labeler.yml)
2. Label based on PR size

**Size Labels:**
- XS: < 20 lines
- S: 20-50 lines
- M: 50-200 lines
- L: 200-500 lines
- XL: 500-1000 lines
- XXL: > 1000 lines

---

### PR Size Labeler (`pr-size.yml`)

**Triggers:** PR opened, synchronized

**Steps:**
1. Calculate total changes (additions + deletions)
2. Remove old size labels
3. Add new size label

**Key Features:**
- Accurate size calculation
- Automatic label updates
- Helps reviewers prioritize

---

### Stale Bot (`stale.yml`)

**Triggers:** Daily at midnight UTC, manual dispatch

**Configuration:**

**Issues:**
- Mark stale after: 60 days
- Close after marked: 14 days
- Exempt labels: pinned, security, critical, in-progress

**Pull Requests:**
- Mark stale after: 30 days
- Close after marked: 7 days
- Exempt labels: pinned, security, critical, in-progress, do-not-close

**Key Features:**
- Friendly messages
- Different timings for issues vs PRs
- Exemption support
- Ascending order processing

---

### Welcome (`welcome.yml`)

**Triggers:** Issue or PR opened

**Steps:**
1. Detect first-time contributor
2. Post welcome message
3. Provide helpful links

**Key Features:**
- Different messages for issues vs PRs
- Links to contributing guide
- Encouragement for new contributors

---

### Comment Commands (`comment-commands.yml`)

**Triggers:** Comment created (starting with `/`)

**Commands:**
- `/assign` - Assign commenter to issue
- `/unassign` - Unassign commenter
- `/help` - Show help message

**Key Features:**
- Self-service assignment
- No maintainer intervention needed
- Helpful command documentation

---

### Project Board (`project-board.yml`)

**Triggers:** Issue/PR opened, closed, reopened, ready_for_review

**Steps:**
1. Add new items to project board
2. Move closed items to Done
3. Label based on milestone

**Key Features:**
- Automatic board management
- Milestone-based labeling
- Status tracking

---

### Setup Repository (`setup-repo.yml`)

**Triggers:** Manual dispatch only

**Jobs:**

1. **setup-labels**
   - Create all repository labels
   - Update existing labels

2. **setup-milestones**
   - Create predefined milestones
   - Skip if already exists

**Usage:**
Run once to initialize repository organization. Can be re-run to update labels.

---

## 🔧 Configuration Files

### Dependabot (`dependabot.yml`)

**Ecosystems Monitored:**
- npm (root, frontend, API, relayer)
- GitHub Actions

**Schedule:**
- npm: Weekly on Monday/Tuesday
- Actions: Weekly on Wednesday

**Features:**
- Grouped updates by ecosystem
- Reviewer assignment
- Label automation
- Ignore major version updates for critical packages

---

### Labeler (`labeler.yml`)

**Auto-label Rules:**
- Smart contracts: `src/**/*.sol`
- Frontend: `apps/web/**/*`
- Backend: `services/api/**/*`
- Relayer: `services/relayer/**/*`
- CI/CD: `.github/**/*`
- Documentation: `**/*.md`
- Dependencies: `**/package.json`, `**/package-lock.json`
- Tests: `test/**/*`, `**/*.test.*`, `**/*.spec.*`

---

## 📋 Best Practices

### For Contributors

1. **Before Pushing:**
   - Run `forge fmt` for Solidity
   - Run `npm run lint` for frontend
   - Ensure tests pass locally

2. **For PRs:**
   - Fill out PR template completely
   - Link related issues
   - Wait for all checks to pass
   - Respond to review feedback

3. **For Issues:**
   - Use appropriate template
   - Provide reproducible steps
   - Include environment details

### For Maintainers

1. **Workflow Maintenance:**
   - Keep actions up to date
   - Monitor workflow run times
   - Review and adjust timeouts
   - Update Node.js/Foundry versions

2. **Security:**
   - Review security scan results weekly
   - Act on Dependabot PRs promptly
   - Monitor for new vulnerabilities

3. **Organization:**
   - Triage issues regularly
   - Update milestones
   - Keep labels organized
   - Review stale items

---

## 🐛 Troubleshooting

### Common Issues

**Workflow fails on submodule checkout:**
- Ensure `submodules: recursive` is set
- Check submodule URLs are accessible

**npm install fails with peer dependency issues:**
- Use `--legacy-peer-deps` flag
- Update package.json if needed

**Foundry tests timeout:**
- Increase `timeout-minutes` in workflow
- Optimize test execution

**Security scan false positives:**
- Review and whitelist if necessary
- Update dependencies
- Add comments to justify ignoring

---

## 📊 Metrics & Monitoring

### Key Metrics to Track

1. **CI/CD Performance:**
   - Build times
   - Test coverage
   - Success rate

2. **Security:**
   - Vulnerabilities found
   - Time to fix
   - Open security issues

3. **Community:**
   - First-time contributors
   - PR merge time
   - Issue resolution time

### Recommended Tools

- GitHub Insights
- Codecov for coverage
- Dependabot alerts
- GitHub Security tab

---

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Foundry Book](https://book.getfoundry.sh/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

---

**Last Updated:** 2026-02-02

For questions or improvements, please open an issue or discussion.
