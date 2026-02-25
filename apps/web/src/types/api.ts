export interface PaginatedResponse<T> {
  page: number
  limit: number
  total: number
  items: T[]
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface CampaignApi {
  id: string
  ngoAddress: string
  designerAddress: string | null
  targetAmount: string
  deadline: string
  raisedAmount: string
  vettedApproved: boolean | null
  createdAt: string
  updatedAt: string
  donationCount?: number
  donationTotal?: string
}

export interface OrderItemApi {
  id: string
  orderId: string
  externalItemId: string
  quantity: number
  createdAt: string
}

export interface OrderApi {
  id: string
  buyer: string
  totalHBAR: string
  txHashes: string[]
  createdAt: string
  updatedAt: string
  items: OrderItemApi[]
}

export interface DonationApi {
  id: string
  donorAddress: string
  campaignId: string
  amount: string
  itemId: string | null
  itemName: string | null
  date: string
  txHash: string | null
  createdAt: string
}

export interface DonationEventApi {
  id: string
  campaignId: string
  donor: string
  amount: string
  txHash: string | null
  createdAt: string
}

export type KycStatusApi = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired'

export interface KycVerificationApi {
  id: string
  walletAddress: string
  provider: string
  providerRef: string | null
  status: KycStatusApi
  metadata: unknown
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface DesignIndexApi {
  designId: string
  metadataCid: string
  previewCid: string | null
  designCid: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOrderBody {
  buyer: string
  items: { id: number | string; quantity: number }[]
  totalHBAR: string
  txHashes?: string[]
}

export interface CreateDonationBody {
  donorAddress: string
  campaignId: number | string
  amount: number | string
  itemId?: number | string
  itemName?: string
  date?: string
  txHash?: string
}

export interface CreateKycVerificationBody {
  walletAddress: string
  provider?: string
  metadata?: unknown
}

export interface CampaignQuery {
  page?: number
  limit?: number
  ngoAddress?: string
  designerAddress?: string
  vettedApproved?: boolean
}

export interface DonationsQuery {
  donorAddress?: string
  campaignId?: string
  page?: number
  limit?: number
}

export interface OrdersQuery {
  buyer?: string
  page?: number
  limit?: number
}

export interface KycVerificationsQuery {
  walletAddress?: string
  page?: number
  limit?: number
}
