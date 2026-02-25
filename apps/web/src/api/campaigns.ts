import { request, apiPath } from './client'
import type {
  CampaignApi,
  PaginatedResponse,
  CampaignQuery,
} from '../types/api'

export function getCampaigns(
  query: CampaignQuery = {}
): Promise<PaginatedResponse<CampaignApi>> {
  const params = new URLSearchParams()
  if (query.page != null) params.set('page', String(query.page))
  if (query.limit != null) params.set('limit', String(query.limit))
  if (query.ngoAddress) params.set('ngoAddress', query.ngoAddress)
  if (query.designerAddress) params.set('designerAddress', query.designerAddress)
  if (query.vettedApproved !== undefined)
    params.set('vettedApproved', String(query.vettedApproved))
  const qs = params.toString()
  return request(apiPath(`/api/campaigns${qs ? `?${qs}` : ''}`), { method: 'GET' })
}

export function getCampaignById(id: string): Promise<CampaignApi> {
  return request(apiPath(`/api/campaigns/${encodeURIComponent(id)}`), {
    method: 'GET',
  })
}
