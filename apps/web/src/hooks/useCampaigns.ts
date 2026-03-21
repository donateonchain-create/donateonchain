import { useQuery } from '@tanstack/react-query'
import { getCampaigns, getCampaignById } from '../api/campaigns'
import type { CampaignQuery } from '../types/api'

export function useCampaigns(query?: CampaignQuery) {
  return useQuery({
    queryKey: ['campaigns', query],
    queryFn: () => getCampaigns(query || {}),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useCampaign(id: string | null | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => (id ? getCampaignById(id) : Promise.reject('no id')),
    enabled: !!id,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

