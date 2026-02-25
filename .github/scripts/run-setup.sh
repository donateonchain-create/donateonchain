#!/bin/bash

# GitHub Repository Setup Script
# Runs all setup scripts in the correct order

set -e  # Exit on error

echo "🚀 DonateOnChain Repository Setup"
echo "=================================="
echo ""

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN environment variable not set"
  echo ""
  echo "Please set your GitHub token:"
  echo "  export GITHUB_TOKEN=your_token_here"
  echo ""
  echo "Or load from .env.github:"
  echo "  source .env.github"
  echo ""
  exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Step 1: Test token
echo "Step 1: Testing GitHub token..."
echo "─────────────────────────────────"
if node test-token.js; then
  echo ""
  echo "✅ Token test passed!"
else
  echo ""
  echo "❌ Token test failed. Please fix the issues above and try again."
  exit 1
fi

echo ""
read -p "Continue with setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Setup cancelled."
  exit 0
fi

# Step 2: Setup labels
echo ""
echo "Step 2: Setting up labels..."
echo "─────────────────────────────────"
if node setup-labels.js; then
  echo "✅ Labels setup complete!"
else
  echo "❌ Labels setup failed"
  exit 1
fi

# Step 3: Setup milestones
echo ""
echo "Step 3: Setting up milestones..."
echo "─────────────────────────────────"
if node setup-milestones.js; then
  echo "✅ Milestones setup complete!"
else
  echo "❌ Milestones setup failed"
  exit 1
fi

# Summary
echo ""
echo "═══════════════════════════════════"
echo "🎉 Setup Complete!"
echo "═══════════════════════════════════"
echo ""
echo "✅ Labels created and configured"
echo "✅ Milestones created"
echo ""
echo "Next steps:"
echo "1. Review labels: https://github.com/donateonchain-create/donateonchain/labels"
echo "2. Review milestones: https://github.com/donateonchain-create/donateonchain/milestones"
echo "3. Set up branch protection rules"
echo "4. Configure GitHub teams for CODEOWNERS"
echo ""
echo "For more information, see:"
echo "  - .github/README.md"
echo "  - SETUP_SUMMARY.md"
echo ""
