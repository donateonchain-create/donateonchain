# GitHub Repository Setup Scripts

This directory contains automation scripts for setting up and managing the GitHub repository.

## Scripts

### setup-labels.js
Creates a comprehensive set of labels for the repository to help organize issues and pull requests.

**Usage:**
```bash
GITHUB_TOKEN=your_token GITHUB_REPOSITORY=owner/repo node .github/scripts/setup-labels.js
```

**Labels Created:**
- Type labels (bug, enhancement, documentation, etc.)
- Priority labels (critical, high, medium, low)
- Status labels (blocked, in-progress, needs-review, etc.)
- Component labels (smart-contracts, frontend, backend, etc.)
- Security labels
- Contributor-friendly labels (good first issue, help wanted)
- Automation labels (stale, needs-triage, etc.)
- Size labels for PRs (XS, S, M, L, XL, XXL)

### setup-milestones.js
Creates initial milestones for the repository to help plan releases and track progress.

**Usage:**
```bash
GITHUB_TOKEN=your_token GITHUB_REPOSITORY=owner/repo node .github/scripts/setup-milestones.js
```

**Milestones Created:**
- v1.1.0 - Enhanced Features
- v1.2.0 - Scaling & Performance
- v2.0.0 - Major Upgrade
- Security Audit
- Documentation Improvements
- Community & Growth

### close-failed-prs.js
Identifies and closes open pull requests that have failed CI checks. Useful for cleaning up PRs with persistent CI failures.

**Usage:**
```bash
# Dry run mode (shows which PRs would be closed without actually closing them)
GITHUB_TOKEN=your_token GITHUB_REPOSITORY=owner/repo node .github/scripts/close-failed-prs.js --dry-run

# Actually close failed PRs
GITHUB_TOKEN=your_token GITHUB_REPOSITORY=owner/repo node .github/scripts/close-failed-prs.js
```

**What it does:**
- Fetches all open pull requests
- Checks the CI status for each PR (both GitHub Actions check-runs and legacy status checks)
- Identifies PRs with failed or cancelled checks
- Adds a comment explaining why the PR is being closed
- Closes the PR

**When to use:**
- Cleaning up stale PRs with persistent CI failures
- Automated maintenance of PR queue
- After fixing CI infrastructure issues that caused multiple PRs to fail

## Requirements

- Node.js 18+
- GitHub Personal Access Token with `repo` scope
- Repository access permissions

## Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token (required)
- `GITHUB_REPOSITORY` - Repository in format `owner/repo` (optional, defaults to donateonchain-create/donateonchain)

## Running in CI

These scripts can be run manually or integrated into GitHub Actions workflows. The repository owner or maintainers should run these scripts once to initialize the repository organization.

## Security

⚠️ **Important**: Never commit your GitHub token to the repository. Always use environment variables or GitHub Secrets when running these scripts.
