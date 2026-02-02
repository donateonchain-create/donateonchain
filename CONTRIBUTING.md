# Contributing to DonateOnChain

Thank you for your interest in contributing to DonateOnChain! 🎉

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our code of conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Foundry (for smart contract development)
- Git
- A GitHub account

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/donateonchain.git
   cd donateonchain
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/donateonchain-create/donateonchain.git
   ```

4. **Install dependencies**
   ```bash
   # Smart contracts
   forge install
   
   # Frontend
   cd apps/web && npm install
   
   # Backend API
   cd services/api && npm install
   
   # Relayer
   cd services/relayer && npm install
   ```

5. **Run tests to verify setup**
   ```bash
   # Smart contracts
   forge test
   
   # Frontend
   cd apps/web && npm run lint
   ```

## 🔄 Development Workflow

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Smart contracts
   forge test -vvv
   forge fmt --check
   
   # Frontend
   cd apps/web
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template completely

## 📝 Contribution Guidelines

### What to Contribute

We welcome contributions in many forms:
- 🐛 **Bug fixes** - Fix issues and improve stability
- ✨ **New features** - Add new functionality
- 📚 **Documentation** - Improve or add documentation
- 🧪 **Tests** - Add or improve test coverage
- ♻️ **Refactoring** - Improve code quality
- 🎨 **UI/UX** - Improve user interface and experience
- 🔒 **Security** - Fix security vulnerabilities

### Before You Start

1. **Check existing issues** - Look for existing issues or feature requests
2. **Create an issue** - For significant changes, create an issue first to discuss
3. **Get assigned** - Wait to be assigned to avoid duplicate work
4. **Ask questions** - Don't hesitate to ask for clarification

## 🔍 Pull Request Process

### PR Requirements

1. **Fill out the PR template** completely
2. **Link related issues** using "Closes #123" or "Fixes #123"
3. **Ensure all checks pass**:
   - ✅ All tests pass
   - ✅ Code is properly formatted
   - ✅ No linting errors
   - ✅ Build succeeds
   - ✅ Security scans pass

4. **Add appropriate labels**
5. **Request reviews** from relevant team members
6. **Respond to feedback** promptly and professionally

### PR Review Process

1. **Automated checks** run first (CI/CD)
2. **Code review** by maintainers
3. **Testing** by reviewers
4. **Approval** by at least one maintainer
5. **Merge** when approved and all checks pass

### What Reviewers Look For

- Code quality and maintainability
- Test coverage
- Documentation updates
- Security implications
- Performance impact
- Breaking changes
- Backward compatibility

## 💻 Coding Standards

### Solidity (Smart Contracts)

```solidity
// Use NatSpec comments
/// @notice Transfer tokens from one address to another
/// @param from The address to transfer from
/// @param to The address to transfer to
/// @param amount The amount to transfer
function transfer(address from, address to, uint256 amount) public {
    // Function body
}

// Follow Solidity style guide
// Use custom errors for gas efficiency
// Implement proper access control
// Add comprehensive tests
```

**Style Guide:**
- Use `forge fmt` for formatting
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use custom errors instead of require strings
- Implement security best practices
- Add NatSpec documentation

### TypeScript/JavaScript (Frontend & Backend)

```typescript
// Use TypeScript for type safety
interface User {
  address: string;
  name: string;
  isVerified: boolean;
}

// Use descriptive names
function processUserDonation(user: User, amount: number): boolean {
  // Function body
}

// Add JSDoc comments for complex functions
/**
 * Processes a donation from a user
 * @param user - The user making the donation
 * @param amount - The donation amount
 * @returns Whether the donation was successful
 */
```

**Style Guide:**
- Use ESLint for linting
- Follow existing code style
- Use TypeScript types
- Write meaningful comments
- Keep functions small and focused

### General Guidelines

- **DRY** - Don't Repeat Yourself
- **KISS** - Keep It Simple, Stupid
- **YAGNI** - You Aren't Gonna Need It
- **Write self-documenting code**
- **Test your changes**
- **Think about edge cases**

## 🧪 Testing Guidelines

### Smart Contract Tests

```solidity
// Test file: test/DonateOnChain.t.sol
function testDonation() public {
    // Arrange
    uint256 amount = 100 ether;
    
    // Act
    vm.prank(donor);
    donateOnChain.donate{value: amount}(campaignId);
    
    // Assert
    assertEq(donateOnChain.getCampaignFunds(campaignId), amount);
}

// Test edge cases
function testDonationWithZeroAmount() public {
    vm.expectRevert(InvalidAmount.selector);
    donateOnChain.donate{value: 0}(campaignId);
}
```

**Best Practices:**
- Test happy path and edge cases
- Test access control
- Test error conditions
- Use descriptive test names
- Achieve high coverage

### Frontend Tests

```typescript
// Use descriptive test names
describe('DonationForm', () => {
  it('should submit donation successfully', async () => {
    // Test implementation
  });
  
  it('should show error for invalid amount', async () => {
    // Test implementation
  });
});
```

## 📚 Documentation

### What to Document

- **Code comments** - Explain complex logic
- **README updates** - Keep README current
- **API documentation** - Document endpoints
- **Smart contract docs** - Use NatSpec
- **Architecture docs** - Explain design decisions

### Documentation Style

- Clear and concise
- Use proper grammar
- Include examples
- Keep it up to date
- Use diagrams when helpful

## 🎯 Areas for Contribution

### High Priority

- 🔒 Security improvements
- 🐛 Bug fixes
- 📚 Documentation improvements
- 🧪 Test coverage

### Medium Priority

- ✨ New features (discussed in issues)
- ♻️ Code refactoring
- ⚡ Performance improvements
- 🎨 UI/UX enhancements

### Good First Issues

Look for issues labeled:
- `good first issue`
- `help wanted`
- `documentation`

## 💬 Communication

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas, general discussion
- **Pull Requests** - Code contributions
- **Code Reviews** - Feedback on PRs

## 🙏 Thank You!

Thank you for contributing to DonateOnChain! Your efforts help make transparent, secure charitable giving accessible to everyone.

### Questions?

- Check existing documentation
- Search closed issues
- Ask in GitHub Discussions
- Tag maintainers for urgent matters

---

**Happy Coding! 🚀**
