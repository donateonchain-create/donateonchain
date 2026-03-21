import { wagmiConfig } from '../config/reownConfig'
import { readContract, writeContract, waitForTransactionReceipt, simulateContract, getPublicClient } from '@wagmi/core'
import type { Abi } from 'viem'

export async function read<T>({ address, abi, functionName, args }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[] }): Promise<T> {
  return await readContract(wagmiConfig, { address, abi, functionName, args }) as unknown as T
}

export async function simulate({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  return await simulateContract(wagmiConfig, { address, abi, functionName, args, value })
}

export async function write({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  // Skip simulateContract on Hedera — the WalletConnect connector path fails with
  // "connection.connector.getChainId is not a function" during simulation.
  // We write directly; the contract itself will revert with a meaningful error if invalid.
  const hash = await writeContract(wagmiConfig, { address, abi, functionName, args, value } as any)
  return hash
}

export async function wait(hash: `0x${string}`) {
  return await waitForTransactionReceipt(wagmiConfig, { hash })
}

export function publicClient() {
  return getPublicClient(wagmiConfig)
}



