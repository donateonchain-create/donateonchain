# Team Guidelines - DonateOnChain

## 📋 Overview

This document provides guidelines for the internal development team working on the DonateOnChain project.

## 🚀 Development Workflow

### Branch Strategy

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - New features
- **`fix/*`** - Bug fixes
- **`hotfix/*`** - Urgent production fixes

### Workflow Steps

1. **Create a branch** from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** and commit regularly
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   **Commit Message Convention:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test changes
   - `chore:` Maintenance tasks

3. **Push to remote**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Use the PR template
   - Link related issues
   - Request review from team members
   - Wait for CI checks to pass

5. **Address Review Feedback**
   - Respond to comments
   - Make requested changes
   - Push updates

6. **Merge** when approved
   - Squash and merge for cleaner history
   - Delete branch after merge

## 🧪 Testing

### Smart Contracts

```bash
# Run all tests
forge test -vvv

# Run specific test
forge test --match-test testDonation

# Check coverage
forge coverage

# Check gas usage
forge test --gas-report

# Format code
forge fmt
```

### Frontend

```bash
cd apps/web

# Run linter
npm run lint

# Build
npm run build

# Run dev server
npm run dev
```

### Backend API

```bash
cd services/api

# Run development server
npm run dev

# Run Prisma migrations
npm run prisma:migrate:dev

# Generate Prisma client
npm run prisma:generate
```

## 📝 Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Write clear descriptions
- Add tests for new functionality
- Update documentation
- Respond to feedback promptly

### For Reviewers

- Review within 24-48 hours
- Be constructive and specific
- Test the changes locally if needed
- Approve when satisfied
- Use GitHub suggestions for small fixes

## 🔒 Security

### Best Practices

- Never commit secrets or private keys
- Use environment variables for sensitive data
- Review security scan results
- Update dependencies regularly
- Follow security guidelines for smart contracts

### Reporting Security Issues

Use the security vulnerability issue template and mark as `security` label. For critical issues, notify the team immediately.

## 🏷️ Labels & Milestones

### Using Labels

- Add type labels: `bug`, `enhancement`, `documentation`
- Add priority: `priority: critical/high/medium/low`
- Add component: `smart-contracts`, `frontend`, `backend`, `relayer`
- Add status: `status: in-progress`, `status: blocked`, `status: needs-review`

### Milestones

- Assign issues to appropriate milestones
- Update milestone progress regularly
- Close milestones when completed

## 🎯 Issue Management

### Creating Issues

- Use appropriate template
- Provide clear description
- Add relevant labels
- Assign to team member if known
- Link to milestone if applicable

### Working on Issues

- Assign yourself when starting work
- Add `status: in-progress` label
- Link PR when created
- Update status regularly
- Close when completed

## 📊 Project Organization

### GitHub Projects

- Add issues to project board when created
- Move cards as status changes
- Use automation where possible

### Priorities

- **Critical** - Production issues, security vulnerabilities
- **High** - Important features, significant bugs
- **Medium** - Standard features and improvements
- **Low** - Nice-to-have, optimizations

## 🔄 Release Process

1. **Prepare Release**
   - Create release branch from `develop`
   - Update version numbers
   - Update CHANGELOG.md
   - Test thoroughly

2. **Create Tag**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. **Deploy**
   - Release workflow will run automatically
   - Monitor deployment
   - Verify in production

4. **Post-Release**
   - Merge release branch to `main`
   - Create GitHub release
   - Announce to team

## 💻 Environment Setup

### Prerequisites

- Node.js v18+
- Foundry
- PostgreSQL (for API)
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/donateonchain-create/donateonchain.git
cd donateonchain

# Install smart contract dependencies
forge install

# Install frontend dependencies
cd apps/web && npm install && cd ../..

# Install API dependencies
cd services/api && npm install && cd ../..

# Install relayer dependencies
cd services/relayer && npm install && cd ../..

# Set up environment variables
cp .env.example .env
# Edit .env with your values
```

## 🛠️ Useful Commands

### Git Commands

```bash
# Update your branch with latest develop
git checkout develop
git pull origin develop
git checkout your-branch
git rebase develop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View commit history
git log --oneline --graph
```

### Project Management

```bash
# Run setup scripts (maintainers only)
GITHUB_TOKEN=xxx node .github/scripts/setup-labels.js
GITHUB_TOKEN=xxx node .github/scripts/setup-milestones.js
```

## 📚 Documentation

### Keep Updated

- README.md - Project overview and setup
- CHANGELOG.md - Version history
- Smart contract NatSpec comments
- API documentation
- Architecture diagrams

### Writing Documentation

- Clear and concise
- Include examples
- Keep it current
- Use proper formatting

## 🤝 Communication

### Channels

- **GitHub Issues** - Bug reports, feature requests, tasks
- **Pull Requests** - Code changes and reviews
- **Team Meetings** - Regular sync-ups
- **Direct Messages** - Quick questions

### Best Practices

- Be respectful and professional
- Provide context
- Be responsive
- Ask for help when needed
- Share knowledge

## ⚡ Tips & Tricks

### Efficiency

- Use GitHub CLI (`gh`) for faster workflows
- Set up git aliases for common commands
- Use VS Code extensions for better DX
- Automate repetitive tasks

### Code Quality

- Run linters before committing
- Write tests as you code
- Keep functions small and focused
- Use meaningful variable names
- Comment complex logic

### Problem Solving

- Check existing issues first
- Read error messages carefully
- Use debugger tools
- Ask team members
- Document solutions

## 🎓 Learning Resources

### Internal

- [Workflow Documentation](.github/WORKFLOWS.md)
- [GitHub Configuration](.github/README.md)
- Project README files

### External

- [Solidity Documentation](https://docs.soliditylang.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [React Documentation](https://react.dev/)
- [Hedera Documentation](https://docs.hedera.com/)

---

**Questions?** Ask your team members or create an issue for discussion.
