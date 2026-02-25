import { request, getRelayerUrl } from './client'

export interface StoreHashResult {
  transactionHash: string
  fileHash: string
}

export async function storeHash(
  cid: string,
  userAddress: string
): Promise<StoreHashResult> {
  const base = getRelayerUrl().replace(/\/$/, '')
  const res = await request<{ success: boolean; transactionHash?: string; fileHash?: string; error?: string }>(
    `${base}/api/store-hash`,
    {
      method: 'POST',
      body: { cid, userAddress },
    }
  )
  if (!res?.success || !res.transactionHash || !res.fileHash) {
    throw new Error((res as { error?: string })?.error || 'Failed to store hash via relayer')
  }
  return {
    transactionHash: res.transactionHash,
    fileHash: res.fileHash,
  }
}
