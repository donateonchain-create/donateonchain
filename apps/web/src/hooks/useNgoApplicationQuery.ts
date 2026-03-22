import { useQuery } from '@tanstack/react-query'
import { useAccount, useSignMessage } from 'wagmi'
import { fetchNgoApplicationState } from '../utils/storageApi'

export function useNgoApplicationQuery(options?: { enabled?: boolean }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const enabled = options?.enabled !== false

  return useQuery({
    queryKey: ['ngoApplication', address, isConnected],
    queryFn: () => fetchNgoApplicationState(address as string, signMessageAsync),
    enabled: enabled && !!address && isConnected,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
