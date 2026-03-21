import { apiPath, request } from './client'

export interface MintNftResult {
  success: boolean
  serialNumber: number
  tokenId: string
  donorAccountId?: string
  explorerUrl?: string
  warning?: string
}

/**
 * Trigger NFT minting after a successful donation.
 * The backend uses the operator key to mint + transfer the HTS NFT to the donor.
 */
export async function mintDonationNFT(params: {
  donorAddress: string
  campaignId: string | number
  txHash: string
  amount: number
  campaignTitle?: string
  campaignImage?: string
}): Promise<MintNftResult> {
  return request<MintNftResult>(apiPath('/api/nft/mint'), {
    method: 'POST',
    body: params,
  })
}
