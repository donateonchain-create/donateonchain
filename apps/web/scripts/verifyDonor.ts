import { createWalletClient, createPublicClient, http, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hederaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load .env from process.cwd() (run this from project root)
dotenv.config();

const ABI = [
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'grantRole',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'verifyAccount',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
  }
];

const COMPLIANCE_OFFICER_ROLE = keccak256(toHex('COMPLIANCE_OFFICER_ROLE'));

async function main() {
  const addressToVerify = process.argv[2] as `0x${string}`;
  if (!addressToVerify || !addressToVerify.startsWith('0x')) {
    console.error('Usage: npx tsx apps/web/scripts/verifyDonor.ts <wallet-address>');
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const contractAddress = process.env.PROXY_ADDRESS as `0x${string}`;
  const rpcUrl = process.env.RPC_URL || 'https://testnet.hashio.io/api';

  if (!privateKey || !contractAddress) {
    console.error('ERROR: PRIVATE_KEY and PROXY_ADDRESS must be set in .env');
    process.exit(1);
  }

  try {
    const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
    console.log(`Using deployer account: ${account.address}`);
    
    const walletClient = createWalletClient({
      account,
      chain: hederaTestnet,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http(rpcUrl),
    });

    // Check if the deployer has the COMPLIANCE_OFFICER_ROLE
    const hasRole = await publicClient.readContract({
      address: contractAddress,
      abi: ABI,
      functionName: 'hasRole',
      args: [COMPLIANCE_OFFICER_ROLE, account.address],
    });

    if (!hasRole) {
      console.log(`Deployer missing COMPLIANCE_OFFICER_ROLE. Granting now...`);
      const grantTx = await walletClient.writeContract({
        address: contractAddress,
        abi: ABI,
        functionName: 'grantRole',
        args: [COMPLIANCE_OFFICER_ROLE, account.address],
      });
      console.log(`Waiting for grantRole receipt: ${grantTx}...`);
      await publicClient.waitForTransactionReceipt({ hash: grantTx });
      console.log(`✅ Granted COMPLIANCE_OFFICER_ROLE to ${account.address}`);
    }

    console.log(`Verifying account ${addressToVerify} on contract ${contractAddress}...`);
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ABI,
      functionName: 'verifyAccount',
      args: [addressToVerify],
    });

    console.log(`Transaction sent! Hash: ${txHash}`);
    console.log('Waiting for receipt...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'success') {
      console.log(`✅ Successfully verified account: ${addressToVerify}`);
      console.log('You can now use this account to make donations on the frontend!');
    } else {
      console.error('❌ Transaction failed');
      console.log(receipt);
    }
  } catch (error) {
    console.error('Error verifying account:', error);
  }
}

main().catch(console.error);
