import { request, apiPath } from './client'
import type {
  KycVerificationApi,
  PaginatedResponse,
  KycVerificationsQuery,
  CreateKycVerificationBody,
} from '../types/api'

export interface KycHealthResponse {
  status: string
  config?: unknown
  lastVerification?: unknown
}

export function createKycVerification(
  body: CreateKycVerificationBody
): Promise<KycVerificationApi> {
  return request(apiPath('/api/kyc/verifications'), {
    method: 'POST',
    body: {
      walletAddress: body.walletAddress,
      provider: body.provider,
      metadata: body.metadata,
    },
  })
}

export function getKycVerifications(
  query: KycVerificationsQuery = {}
): Promise<PaginatedResponse<KycVerificationApi>> {
  const params = new URLSearchParams()
  if (query.walletAddress) params.set('walletAddress', query.walletAddress)
  if (query.page != null) params.set('page', String(query.page))
  if (query.limit != null) params.set('limit', String(query.limit))
  const qs = params.toString()
  return request(apiPath(`/api/kyc/verifications${qs ? `?${qs}` : ''}`), {
    method: 'GET',
  })
}

export function getKycVerificationById(id: string): Promise<KycVerificationApi> {
  return request(apiPath(`/api/kyc/verifications/${encodeURIComponent(id)}`), {
    method: 'GET',
  })
}

export function getKycHealth(): Promise<KycHealthResponse> {
  return request(apiPath('/api/kyc/health'), { method: 'GET' })
}
