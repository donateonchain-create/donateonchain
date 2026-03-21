import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hederaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';
dotenv.config();

const ABI = [
  {
    type: 'function',
    name: 'contribute',
    stateMutability: 'payable',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'metadataHash', type: 'string' }
    ],
    outputs: [{ type: 'uint256' }],
  }
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const contractAddress = process.env.PROXY_ADDRESS as `0x${string}`;
  const rpcUrl = process.env.RPC_URL || 'https://testnet.hashio.io/api';

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  
  const walletClient = createWalletClient({ account, chain: hederaTestnet, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: hederaTestnet, transport: http(rpcUrl) });

  console.log(`Testing contribute with 5 HBAR (parseEther)...`);
  
  try {
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: ABI,
      functionName: 'contribute',
      args: [0n, ''], // assuming campaign 0 exists and is active
      value: parseEther('5'),
      account,
    });
    console.log("Simulation successful!", request);
  } catch (err: any) {
    console.error("Simulation failed:", err.shortMessage || err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
  }

  console.log(`\nTesting contribute with 5 HBAR (in tinybars, 500000000)...`);
  try {
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: ABI,
      functionName: 'contribute',
      args: [0n, ''], 
      value: 500000000n, // tinybars
      account,
    });
    console.log("Simulation successful!", request);
  } catch (err: any) {
    console.error("Simulation failed:", err.shortMessage || err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
  }
}

main().catch(console.error);
