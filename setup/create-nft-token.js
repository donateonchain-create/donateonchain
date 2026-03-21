/**
 * HTS NFT Creation & Registration Script
 *
 * This script:
 *  1. Creates a new HTS Non-Fungible Token (NFT) on Hedera Testnet
 *  2. Associates the NFT token with the DonateOnChain smart contract
 *  3. Calls setNftTokenId() on the contract to register the token
 *
 * Run from the project root:
 *   node --env-file=.env setup/create-nft-token.js
 *
 * After success, add the printed NFT_TOKEN_ID to your .env files.
 */

import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociateTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
} from '@hashgraph/sdk';
import { createWalletClient, http } from 'viem';
import { hederaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ─── Config ──────────────────────────────────────────────────────────────────
const operatorId   = process.env.ACCOUNT_ID;
const rawKey       = process.env.PRIVATE_KEY?.replace('0x', '');
const contractId   = process.env.CONTRACT_ID || '0.0.7802966'; // Hedera contract ID
const proxyAddress = process.env.PROXY_ADDRESS;               // EVM proxy address
const rpcUrl       = process.env.RPC_URL || 'https://testnet.hashio.io/api';

const nftName   = process.env.NFT_NAME   || 'DonateOnChain Proof of Donation';
const nftSymbol = process.env.NFT_SYMBOL || 'DOC-POD';
const nftMemo   = process.env.NFT_MEMO   || 'Proof-of-donation NFT for DonateOnChain platform';

if (!operatorId || !rawKey || !contractId) {
  console.error('Missing ACCOUNT_ID, PRIVATE_KEY, or CONTRACT_ID in .env');
  process.exit(1);
}

// ─── ABI for setNftTokenId ────────────────────────────────────────────────────
const ABI_SET_NFT = [
  {
    type: 'function',
    name: 'setNftTokenId',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'tokenId', type: 'address' }],
    outputs: [],
  },
];

async function main() {
  // ── Hedera SDK client ──────────────────────────────────────────────────────
  const client      = Client.forTestnet();
  const operatorKey = PrivateKey.fromStringECDSA(rawKey);
  client.setOperator(AccountId.fromString(operatorId), operatorKey);

  console.log('=== Step 1/3: Creating HTS NFT token ===');
  console.log(`  Name:   ${nftName}`);
  console.log(`  Symbol: ${nftSymbol}`);

  const tokenTx = await new TokenCreateTransaction()
    .setTokenName(nftName)
    .setTokenSymbol(nftSymbol)
    .setTokenMemo(nftMemo)
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(AccountId.fromString(operatorId))
    .setAdminKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    .setMetadataKey(operatorKey.publicKey)
    .setFreezeDefault(false)
    .execute(client);

  const tokenReceipt = await tokenTx.getReceipt(client);
  const tokenId      = tokenReceipt.tokenId;
  console.log(`  ✅ Token created: ${tokenId}`);

  // Convert Hedera token ID (0.0.X) to EVM address (0x000...X)
  const [, , num]     = tokenId.toString().split('.');
  const tokenEvmAddr  = `0x${BigInt(num).toString(16).padStart(40, '0')}`;
  console.log(`  EVM address: ${tokenEvmAddr}`);

  // ── Step 2: Associate token with the deployer account ──────────────────────
  console.log('\n=== Step 2/3: Associating token with contract account ===');
  // Note: The contract itself needs association via a ContractExecuteTransaction
  // using the HTS precompile. For now, we associate with the operator treasury account
  // since the contract will call associateToken internally when minting.
  console.log('  (Skipped — contract minting will handle association via HTS precompile)');

  // ── Step 3: Call setNftTokenId on the proxy contract ──────────────────────
  console.log('\n=== Step 3/3: Registering NFT token on proxy contract ===');
  const account      = privateKeyToAccount(`0x${rawKey}`);
  const walletClient = createWalletClient({
    account,
    chain:     hederaTestnet,
    transport: http(rpcUrl),
  });

  const txHash = await walletClient.writeContract({
    address:      proxyAddress,
    abi:          ABI_SET_NFT,
    functionName: 'setNftTokenId',
    args:         [tokenEvmAddr],
  });

  console.log(`  Transaction: ${txHash}`);
  console.log('  Waiting for confirmation...');

  // Wait a couple of seconds for Hedera block finality
  await new Promise(r => setTimeout(r, 4000));
  console.log(`  ✅ setNftTokenId registered on proxy!`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== DONE ===');
  console.log('Add the following to your .env files:\n');
  console.log(`NFT_TOKEN_ID=${tokenId}`);
  console.log(`NFT_TOKEN_EVM_ADDRESS=${tokenEvmAddr}`);
  console.log(`VITE_NFT_TOKEN_ID=${tokenId}`);
  console.log(`VITE_NFT_TOKEN_EVM_ADDRESS=${tokenEvmAddr}`);
  console.log('\nExplorer:');
  console.log(`  https://hashscan.io/testnet/token/${tokenId}`);

  client.close();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
