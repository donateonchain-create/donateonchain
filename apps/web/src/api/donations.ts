import { request, apiPath } from './client'
import type {
  DonationApi,
  DonationEventApi,
  PaginatedResponse,
  DonationsQuery,
  CreateDonationBody,
} from '../types/api'

export function getDonations(
  query: DonationsQuery = {}
): Promise<PaginatedResponse<DonationApi>> {
  const params = new URLSearchParams()
  if (query.donorAddress) params.set('donorAddress', query.donorAddress)
  if (query.campaignId) params.set('campaignId', query.campaignId)
  if (query.page != null) params.set('page', String(query.page))
  if (query.limit != null) params.set('limit', String(query.limit))
  const qs = params.toString()
  return request(apiPath(`/api/donations${qs ? `?${qs}` : ''}`), { method: 'GET' })
}

export function getDonationsByCampaign(
  campaignId: string,
  limit?: number
): Promise<DonationEventApi[]> {
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', String(limit))
  const qs = params.toString()
  return request(
    apiPath(`/api/donations/${encodeURIComponent(campaignId)}${qs ? `?${qs}` : ''}`),
    { method: 'GET' }
  )
}

export function createDonation(body: CreateDonationBody): Promise<DonationApi> {
  return request(apiPath('/api/donations'), {
    method: 'POST',
    body: {
      donorAddress: body.donorAddress,
      campaignId: body.campaignId,
      amount: body.amount,
      itemId: body.itemId,
      itemName: body.itemName,
      date: body.date,
      txHash: body.txHash,
    },
  })
}
