import { useQuery } from '@tanstack/react-query'
import { useAccount, useSignMessage } from 'wagmi'
import { fetchNgoApplicationState } from '../utils/storageApi'

export function useNgoApplicationQuery(options?: {
  enabled?: boolean
  useWalletSignature?: boolean
}) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const enabled = options?.enabled !== false
  const useWalletSignature = options?.useWalletSignature === true

  return useQuery({
    queryKey: ['ngoApplication', address, isConnected, useWalletSignature],
    queryFn: () =>
      fetchNgoApplicationState(address as string, useWalletSignature ? signMessageAsync : undefined),
    enabled: enabled && !!address && isConnected,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
