import { wagmiConfig } from '../config/reownConfig'
import { readContract, writeContract, waitForTransactionReceipt, simulateContract, getPublicClient } from '@wagmi/core'
import type { Abi } from 'viem'

export const APP_CHAIN_ID = (() => {
  const raw = import.meta.env.VITE_CHAIN_ID
  if (raw !== undefined && raw !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return 296
})()

export async function read<T>({ address, abi, functionName, args }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[] }): Promise<T> {
  return await readContract(wagmiConfig, { address, abi, functionName, args, chainId: APP_CHAIN_ID }) as unknown as T
}

export async function simulate({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  return await simulateContract(wagmiConfig, { address, abi, functionName, args, value, chainId: APP_CHAIN_ID })
}

export async function write({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  const hash = await writeContract(wagmiConfig, { address, abi, functionName, args, value, chainId: APP_CHAIN_ID } as any)
  return hash
}

export async function wait(hash: `0x${string}`) {
  return await waitForTransactionReceipt(wagmiConfig, { hash, chainId: APP_CHAIN_ID })
}

export function publicClient() {
  return getPublicClient(wagmiConfig, { chainId: APP_CHAIN_ID })
}



