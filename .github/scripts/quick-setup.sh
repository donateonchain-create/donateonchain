#!/bin/bash

# Quick Setup - DonateOnChain GitHub Automation
# Run this after you have your GitHub token ready

echo "🚀 Quick Setup for DonateOnChain"
echo "================================"
echo ""

# Step 1: Check for token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "📝 Step 1: Set your GitHub token"
  echo ""
  echo "Choose one method:"
  echo ""
  echo "Method A - Export directly (temporary):"
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  echo ""
  echo "Method B - Use .env.github file (recommended):"
  echo "  1. Edit .env.github and add your token"
  echo "  2. Run: source .env.github"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✅ GitHub token found"
echo ""

# Step 2: Test token
echo "📝 Step 2: Testing token..."
cd "$(dirname "$0")"

if node test-token.js; then
  echo ""
  echo "✅ Token is valid!"
  echo ""
  
  # Step 3: Run setup
  echo "📝 Step 3: Running setup..."
  echo ""
  ./run-setup.sh
else
  echo ""
  echo "❌ Token test failed. Please check the errors above."
  echo ""
  echo "Common fixes:"
  echo "  - Use a Classic token (easier): https://github.com/settings/tokens"
  echo "  - Grant organization access for fine-grained tokens"
  echo "  - Ensure 'repo' scope is selected"
  exit 1
fi
