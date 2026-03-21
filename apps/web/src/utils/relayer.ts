import { storeHash } from '../api/relayer'

/** @deprecated Use api/relayer.storeHash instead. This wrapper is kept for backwards compatibility. */
export async function storeHashViaRelayer(cid: string, userAddress: string) {
  return storeHash(cid, userAddress)
}
