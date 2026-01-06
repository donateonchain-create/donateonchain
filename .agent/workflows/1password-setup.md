---
description: How to set up and use 1Password for environment variables
---

# 1Password Environment Variables Setup

This workflow explains how to manage environment variables securely using 1Password.

## Prerequisites

1. 1Password account (Personal, Families, or Teams/Business)
2. 1Password CLI installed (`op`)
3. 1Password desktop app (recommended for biometric unlock)

## Initial Setup

### Step 1: Sign in to 1Password CLI

```bash
# Sign in to your 1Password account
op signin
```

If you have the 1Password desktop app with biometric unlock enabled, you can enable CLI integration:
1. Open 1Password desktop app
2. Go to Settings → Developer
3. Enable "Integrate with 1Password CLI"

### Step 2: Create a Vault (if needed)

```bash
# Create a new vault for development secrets
op vault create "Development"
```

### Step 3: Create an Item for DonateOnChain

```bash
# Create a new item with your secrets
op item create \
  --category="API Credential" \
  --title="DonateOnChain" \
  --vault="Development" \
  'PRIVATE_KEY[password]=your_private_key_here' \
  'HEDERA_TESTNET_RPC_URL[text]=https://testnet.hashio.io/api' \
  'HEDERA_MAINNET_RPC_URL[text]=https://mainnet.hashio.io/api' \
  'ETHERSCAN_API_KEY[password]=your_etherscan_key' \
  'WALLET_CONNECT_ID[password]=your_wallet_connect_id' \
  'CONTRACT_ADDRESS[text]=0x...'
```

Or create the item interactively in the 1Password app/web.

## Usage

### Running Commands with Secrets

```bash
# Run Foundry commands with secrets injected
op run --env-file=.env.1password -- forge script script/Deploy.s.sol --broadcast

# Run npm scripts with secrets
op run --env-file=.env.1password -- npm run dev

# Run any command
op run --env-file=.env.1password -- echo $PRIVATE_KEY
```

### Generate a Traditional .env File (When Needed)

**⚠️ Warning**: This creates a file with actual secrets. Use carefully!

```bash
# Generate .env from 1Password template
op inject -i .env.1password -o .env

# Don't forget to delete when done
rm .env
```

### Useful 1Password CLI Commands

```bash
# List all vaults
op vault list

# List items in a vault
op item list --vault="Development"

# Get a specific secret
op read "op://Development/DonateOnChain/PRIVATE_KEY"

# Edit an existing item
op item edit "DonateOnChain" --vault="Development" 'PRIVATE_KEY[password]=new_value'
```

## Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use `op run` instead of generating `.env`** - Secrets only exist in memory
3. **Use descriptive vault/item names** - Makes secret references readable
4. **Rotate secrets regularly** - Easy with 1Password
5. **Use service accounts for CI/CD** - 1Password has service account support

## CI/CD Integration

For GitHub Actions, use 1Password's official action:

```yaml
- name: Load secrets from 1Password
  uses: 1password/load-secrets-action@v2
  with:
    export-env: true
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    PRIVATE_KEY: op://Development/DonateOnChain/PRIVATE_KEY
```

## Troubleshooting

### "not signed in"
Run `op signin` to authenticate.

### "item not found"
Check vault and item names match exactly (case-sensitive).

### "could not resolve secret reference"
Verify the secret reference format: `op://<vault>/<item>/<field>`
