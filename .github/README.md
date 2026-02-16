# GitHub Configuration

This directory contains all GitHub-specific configuration files, workflows, and automation for the DonateOnChain repository.

## 📁 Directory Structure

```
.github/
├── ISSUE_TEMPLATE/         # Issue templates for bugs, features, security, questions
├── workflows/              # GitHub Actions CI/CD workflows
├── scripts/                # Setup and automation scripts
├── CODEOWNERS             # Code ownership and review assignments
├── dependabot.yml         # Automated dependency updates
├── labeler.yml            # Auto-labeling configuration
└── pull_request_template.md  # Pull request template
```

## 🔧 Workflows

### CI/CD Workflows

| Workflow | Description | Triggers |
|----------|-------------|----------|
| `test.yml` | Smart contract tests with Foundry | Push, PR to main/develop |
| `frontend-ci.yml` | Frontend linting and build | Push, PR to main/develop |
| `api-ci.yml` | Backend API tests | Push, PR to main/develop |
| `security-scan.yml` | Security scanning (CodeQL, Slither) | Push, PR, Weekly |
| `dependency-review.yml` | Review dependency changes | PR to main |
| `release.yml` | Create releases and build artifacts | Tag push (v*) |

### Automation Workflows

| Workflow | Description | Triggers |
|----------|-------------|----------|
| `auto-label.yml` | Auto-label PRs by file changes | PR opened/synced |
| `pr-size.yml` | Label PRs by size | PR opened/synced |
| `stale.yml` | Mark/close stale issues and PRs | Daily |
| `welcome.yml` | Welcome first-time contributors | Issue/PR opened |
| `comment-commands.yml` | Handle slash commands in comments | Comment created |

## 📝 Issue Templates

We provide structured templates for different types of issues:

- **Bug Report** (`bug_report.yml`) - Report bugs or unexpected behavior
- **Feature Request** (`feature_request.yml`) - Suggest new features
- **Security Vulnerability** (`security_vulnerability.yml`) - Report security issues
- **Question** (`question.yml`) - Ask questions about the project

## 🏷️ Labels

Labels are automatically created and managed. Main categories:

- **Type**: bug, enhancement, documentation, question
- **Priority**: critical, high, medium, low
- **Status**: blocked, in-progress, needs-review, ready
- **Component**: smart-contracts, frontend, backend, relayer
- **Security**: security, vulnerability
- **Size**: XS, S, M, L, XL, XXL (auto-applied to PRs)

Run the setup script to create all labels:
```bash
GITHUB_TOKEN=your_token node .github/scripts/setup-labels.js
```

## 🎯 Milestones

Milestones help organize work towards specific goals:

- **v1.1.0** - Enhanced Features
- **v1.2.0** - Scaling & Performance  
- **v2.0.0** - Major Upgrade
- **Security Audit** - Security improvements
- **Documentation** - Documentation improvements
- **Community & Growth** - Team growth and adoption

Run the setup script to create milestones:
```bash
GITHUB_TOKEN=xxx node .github/scripts/setup-milestones.js
```

## 👥 Code Owners

The `CODEOWNERS` file automatically assigns reviewers based on file paths:

- **Smart Contracts** → Contract Team
- **Frontend** → Frontend Team
- **Backend** → Backend Team
- **CI/CD** → DevOps Team
- **Security** → Security Team

## 🤖 Dependabot

Automated dependency updates are configured to run **monthly** to reduce PR noise while keeping dependencies reasonably up-to-date.

### Update Schedule

| Ecosystem | Directory | Day | PR Limit |
|-----------|-----------|-----|----------|
| npm (root) | `/` | Monday | 3 |
| npm (frontend) | `/apps/web` | Monday | 3 |
| npm (API) | `/services/api` | Monday | 3 |
| npm (relayer) | `/services/relayer` | Tuesday | 3 |
| GitHub Actions | `/` | Wednesday | 3 |

### Update Policy

#### Critical Blockchain Libraries (🔒 Stable)
These packages are **pinned** to current versions and ignore minor/patch updates:
- `viem` - Only security updates allowed
- `wagmi` - Only security updates allowed
- `@hashgraph/sdk` - No major version updates
- `@hashgraph/hedera-wallet-connect` - No major version updates

**Why?** Blockchain libraries require extensive testing. Changes can break wallet integrations or transaction logic.

#### Core Framework Libraries (⚠️ Major Locked)
- `react`, `react-dom` - No major version updates (breaking changes)

#### Stable Utilities (📌 Patch Ignored)
These packages ignore patch updates (too frequent, low impact):
- `dotenv`, `express`, `cors`, `typescript`

#### Grouped Updates
Related packages are updated together in a single PR:
- **React ecosystem**: `react*`, `@types/react*`
- **Web3 stack**: `viem`, `wagmi`, `@reown/*`
- **Hedera packages**: `@hashgraph/*`, `hashconnect`
- **Prisma**: `@prisma/*`, `prisma`
- **Express**: `express`, `cors`, `multer`
- **GitHub Actions**: All actions

### Handling Dependabot PRs

✅ **Auto-merge** (after CI passes):
- Type definition updates (`@types/*`)
- Non-critical dev dependency patches
- GitHub Actions minor updates

⚠️ **Review Required**:
- Minor version updates to core libraries
- Any database-related updates (Prisma)
- Updates with breaking changes noted

❌ **Close/Reject**:
- PRs that violate the ignore policy (e.g., viem patch updates)
- Updates during feature freeze
- Updates right before production deployments

### Security Updates

Security vulnerabilities **bypass all ignore rules**. These PRs should be:
1. Reviewed immediately
2. Tested thoroughly
3. Merged as soon as possible
4. Deployed to production promptly

### Modifying Dependabot Config

The configuration is in `.github/dependabot.yml`. To adjust:

```yaml
# Ignore specific dependency
ignore:
  - dependency-name: "package-name"
    update-types: ["version-update:semver-patch"]

# Change frequency
schedule:
  interval: "weekly"  # or "daily", "monthly"

# Reduce PR limit
open-pull-requests-limit: 3
```

After changes, validate with:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"
```

## 🔐 Security

### Security Scanning
- **CodeQL** - Automated code security analysis
- **Slither** - Smart contract security analysis
- **Dependency Review** - Check for vulnerable dependencies

### Reporting Security Issues
Use the security vulnerability issue template or GitHub's private vulnerability reporting feature.

## 🎨 Auto-Labeling

PRs are automatically labeled based on:
- **File paths** - Component labels (smart-contracts, frontend, etc.)
- **Size** - Number of lines changed (XS to XXL)

## 📋 Pull Request Template

All PRs must use the provided template which includes:
- Description and type of change
- Testing checklist
- Code quality checklist
- Documentation checklist
- Security considerations

## 💬 Comment Commands

Use these commands in issue/PR comments:
- `/assign` - Assign yourself to the issue
- `/unassign` - Unassign yourself
- `/help` - Show available commands

## 🚀 Getting Started

### Getting Started

1. Read [TEAM_GUIDELINES.md](../TEAM_GUIDELINES.md)
2. Check issue templates before creating issues
3. Use PR template when submitting changes
4. Watch for automated checks and reviews

### For Team Leaders
1. Run setup scripts to initialize labels and milestones
2. Configure CODEOWNERS teams in repository settings
3. Set up required status checks for branch protection
4. Configure GitHub tokens for workflows if needed

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

## 🛠️ Maintenance

### Regular Tasks
- Review and update workflows as needed
- Keep dependencies in workflows up to date
- Review and adjust stale bot settings
- Update milestones based on project progress
- Refine auto-labeling rules based on usage

### Monitoring
- Check workflow runs regularly
- Review security scanning results
- Monitor Dependabot PRs
- Track issue and PR metrics

---

**Questions?** Open a discussion or contact the maintainers.
