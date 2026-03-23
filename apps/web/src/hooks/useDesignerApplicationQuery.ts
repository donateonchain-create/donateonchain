import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import {
  fetchDesignerApplicationState,
  getDesignerApplicationStateSync,
} from '../utils/storageApi'

export function useDesignerApplicationQuery(options?: { enabled?: boolean }) {
  const { address, isConnected } = useAccount()
  const enabled = options?.enabled !== false

  return useQuery({
    queryKey: ['designerApplication', address, isConnected],
    queryFn: () => fetchDesignerApplicationState(address as string),
    enabled: enabled && !!address && isConnected,
    initialData: () => {
      if (!address) return undefined
      return getDesignerApplicationStateSync(address) ?? undefined
    },
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
