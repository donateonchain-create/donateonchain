import { abis, addresses, roles } from './contracts'
import { read, write, wait, publicClient } from './client'
import type { Campaign, Design, NgoProfile, DesignerProfile, UserRoles, HexAddress } from '../types/onchain'
import { getIPFSURL } from '../utils/ipfs'
import { keccak256, stringToHex, decodeEventLog } from 'viem'

const CONTRACT = addresses.DONATE_ON_CHAIN as HexAddress
const ABI = abis.DonateOnChain as any

const CampaignState = { Pending_Vetting: 0, Active: 1, Goal_Reached: 2, Failed_Refundable: 3, Closed: 4 } as const

function toWei(hbar: number) {
  // Hedera EVM uses weibars (18 decimals) matching Ethereum — relay converts to tinybars internally
  return BigInt(Math.round(hbar * 1e18))
}

export { toWei }

export async function storeFileHashByDesigner(_cid: string) {
  return Promise.resolve()
}

export async function storeFileHashByNGO(_cid: string) {
  return Promise.resolve()
}

export async function verifyFile(_cid: string) {
  return true
}

export async function getUserRoles(user: HexAddress): Promise<UserRoles> {
  const [isAdmin, isKyc] = await Promise.all([
    read<boolean>({ address: CONTRACT, abi: ABI, functionName: 'hasRole', args: [roles.DEFAULT_ADMIN_ROLE, user] }),
    read<boolean>({ address: CONTRACT, abi: ABI, functionName: 'isKycVerified', args: [user] }),
  ])
  return { isAdmin, isNgo: !!isKyc, isDesigner: !!isKyc }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const result = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getActiveCampaignsPaginated', args: [0n, 100n] }).catch(() => [{ campaignIds: [], total: 0n }])
  const campaignIds = Array.isArray(result) ? (result[0] ?? []) : (result?.campaignIds ?? [])
  const results: Campaign[] = []
  for (const id of campaignIds) {
    try {
      const c = await getCampaign(id)
      results.push(c)
    } catch {
      continue
    }
  }
  return results
}

export async function listActiveCampaignIds(): Promise<bigint[]> {
  try {
    const result = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getActiveCampaignsPaginated', args: [0n, 100n] })
    return Array.isArray(result) ? (result[0] ?? []) : (result?.campaignIds ?? [])
  } catch {
    return []
  }
}

export async function getCampaignMetadataCid(_campaignId: bigint): Promise<string | null> {
  return null
}

export async function listActiveCampaignsWithMeta(): Promise<Array<{ id: number; title: string; description: string; category?: string; image?: string; onchainId?: bigint }>> {
  const ids = await listActiveCampaignIds()
  const results: Array<{ id: number; title: string; description: string; category?: string; image?: string; onchainId?: bigint }> = []
  for (const id of ids) {
    try {
      const c = await getCampaign(id)
      const image = c.image ? (c.image.startsWith('ipfs://') ? getIPFSURL(c.image.replace('ipfs://', '')) : c.image) : undefined
      results.push({ id: Number(id), title: c.title, description: c.description, image, onchainId: id })
    } catch {
      results.push({ id: Number(id), title: '', description: '', onchainId: id })
    }
  }
  return results
}

export async function listAllCampaignsFromChain(): Promise<any[]> {
  try {
    const activeIds = await listActiveCampaignIds()
    const campaigns: any[] = []

    for (const id of activeIds) {
      try {
        const chainCampaign = await getCampaign(id)
        let amountRaised = 0
        try {
          const donations = await getDonationsByCampaign(id)
          amountRaised = donations.totalRaisedHBAR
        } catch { }

        let title = chainCampaign.title || ''
        let description = chainCampaign.description || ''
        let category: string | undefined
        let image: string | undefined = chainCampaign.image
        let target = Number(chainCampaign.goalHBAR) / 1e18 // convert weibars → HBAR

        if (chainCampaign.image?.startsWith('Qm') || chainCampaign.image?.startsWith('baf')) {
          image = getIPFSURL(chainCampaign.image)
        }

        campaigns.push({
          id: Number(id),
          onchainId: Number(id),
          title,
          description,
          category,
          target,
          amountRaised,
          percentage: 0,
          ngoWallet: chainCampaign.ngo,
          designer: chainCampaign.designer,
          image,
          active: chainCampaign.active ?? true,
          createdAt: Date.now(),
        })
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load campaign ${id}:`, e)
        }
        continue
      }
    }

    for (const campaign of campaigns) {
      const target = campaign.target || 0
      campaign.percentage = target > 0 ? (campaign.amountRaised / target) * 100 : 0
    }

    return campaigns
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error listing active campaigns from chain:', error)
    }
    return []
  }
}

export async function listCampaignsByNGO(ngoAddress: string): Promise<any[]> {
  try {
    const ids = await read<bigint[]>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignsByNGO', args: [ngoAddress] })
    if (!ids || ids.length === 0) return [];

    const campaigns: any[] = []
    for (const id of ids) {
      try {
        const chainCampaign = await getCampaign(id)
        let amountRaised = 0
        try {
          const donations = await getDonationsByCampaign(id)
          amountRaised = donations.totalRaisedHBAR
        } catch { }

        let title = chainCampaign.title || ''
        let description = chainCampaign.description || ''
        let category: string | undefined
        let image: string | undefined = chainCampaign.image
        let target = Number(chainCampaign.goalHBAR) / 1e18 // convert weibars → HBAR

        if (chainCampaign.image?.startsWith('Qm') || chainCampaign.image?.startsWith('baf')) {
          image = getIPFSURL(chainCampaign.image)
        }

        campaigns.push({
          id: Number(id),
          onchainId: Number(id),
          title,
          description,
          category,
          target,
          amountRaised,
          percentage: target > 0 ? (amountRaised / target) * 100 : 0,
          ngoWallet: chainCampaign.ngo,
          designer: chainCampaign.designer,
          image,
          active: chainCampaign.active ?? true,
          createdAt: Date.now(),
        })
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load NGO campaign ${id}:`, e)
        }
        continue
      }
    }
    return campaigns
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error listing campaigns by NGO from chain:', error)
    }
    return []
  }
}

export async function getProofNftAddress(): Promise<HexAddress | null> {
  try {
    const tokenId = await read<string>({ address: CONTRACT, abi: ABI, functionName: 'nftTokenId', args: [] })
    return (tokenId ? `0x${tokenId}` : null) as HexAddress
  } catch {
    return null
  }
}

export async function getUserProofNFTs(owner: HexAddress): Promise<Array<{
  tokenId: bigint
  campaignId: bigint
  campaignTitle?: string
  image?: string
  amount?: bigint
  timestamp?: bigint
}>> {
  try {
    const donationIds = await read<bigint[]>({ address: CONTRACT, abi: ABI, functionName: 'getDonationsByDonor', args: [owner] })
    const results: Array<{
      tokenId: bigint
      campaignId: bigint
      campaignTitle?: string
      image?: string
      amount?: bigint
      timestamp?: bigint
    }> = []

    for (const id of donationIds ?? []) {
      try {
        // Fetch full donation struct to get campaignId and amount
        const donation = await read<{ donor: string; campaignId: bigint; amount: bigint; timestamp: bigint; nftSerialNumber: bigint; refunded: boolean }>(
          { address: CONTRACT, abi: ABI, functionName: 'getDonation', args: [id] }
        )
        let image: string | undefined
        let campaignTitle: string | undefined
        try {
          // Fetch campaign to get image hash
          const campaign = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getCampaign', args: [donation.campaignId] })
          const imageHash = campaign?.imageHash as string | undefined
          if (imageHash) {
            image = imageHash.startsWith('http') ? imageHash : getIPFSURL(imageHash)
          }
          campaignTitle = campaign?.title as string | undefined
          // Fallback: try to get metadata from IPFS
          if (!image && campaign?.metadataFileHash) {
            try {
              const metaCid = await read<string>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignMetadataCid', args: [donation.campaignId] }).catch(() => undefined)
              if (metaCid) {
                const meta = await fetch(getIPFSURL(metaCid)).then(r => r.json()).catch(() => null)
                if (meta?.image) image = meta.image
                if (meta?.title) campaignTitle = meta.title
              }
            } catch { /* skip */ }
          }
        } catch { /* campaign fetch failed, continue without image */ }
        results.push({
          tokenId: id,
          campaignId: donation.campaignId,
          campaignTitle,
          image,
          amount: donation.amount,
          timestamp: donation.timestamp,
        })
      } catch {
        // Fall back to bare entry if donation fetch fails
        results.push({ tokenId: id, campaignId: 0n })
      }
    }
    return results
  } catch {
    return []
  }
}


export async function syncCampaignsWithOnChain(storedCampaigns: any[]): Promise<any[]> {
  try {
    const activeIds = await listActiveCampaignIds()
    const syncedCampaigns: any[] = []

    for (const storedCampaign of storedCampaigns) {
      let onchainId: bigint | undefined

      if (storedCampaign.onchainId) {
        onchainId = BigInt(storedCampaign.onchainId)
      } else if (storedCampaign.ngoWallet) {
        for (const id of activeIds) {
          try {
            const chainCampaign = await getCampaign(id)
            if (chainCampaign.ngo?.toLowerCase() === storedCampaign.ngoWallet?.toLowerCase()) {
              onchainId = id
              break
            }
          } catch {
            continue
          }
        }
      }

      if (onchainId) {
        try {
          const chainCampaign = await getCampaign(onchainId)
          const donations = await getDonationsByCampaign(onchainId)
          syncedCampaigns.push({
            ...storedCampaign,
            id: Number(onchainId),
            onchainId: Number(onchainId),
            amountRaised: donations.totalRaisedHBAR,
            goal: Number(chainCampaign.goalHBAR) / 1e18, // convert weibars → HBAR
            active: chainCampaign.active ?? true,
            ngoWallet: chainCampaign.ngo,
          })
        } catch {
          syncedCampaigns.push({ ...storedCampaign, onchainId: Number(onchainId) })
        }
      } else {
        syncedCampaigns.push(storedCampaign)
      }
    }

    return syncedCampaigns
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error syncing campaigns with on-chain:', error)
    }
    return storedCampaigns
  }
}

export async function getCampaign(id: bigint): Promise<Campaign & { active?: boolean }> {
  const c = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getCampaign', args: [id] })
  const state = typeof c?.state === 'number' ? c.state : c?.[11] ?? 0
  const active = state === CampaignState.Active
  let image = c?.imageHash ?? c?.[4]
  if (image && (String(image).startsWith('Qm') || String(image).startsWith('baf'))) {
    image = getIPFSURL(String(image))
  }
  return {
    id: BigInt(id),
    title: c?.title ?? c?.[2] ?? '',
    description: c?.description ?? c?.[3] ?? '',
    goalHBAR: BigInt(c?.targetAmount ?? c?.[6] ?? 0n),
    ngo: (c?.ngo ?? c?.[0]) as HexAddress,
    designer: (c?.designer ?? c?.[1]) as HexAddress | undefined,
    image: image || undefined,
    active,
  }
}

export async function isCampaignActive(campaignId: bigint): Promise<boolean> {
  try {
    const activeIds = await listActiveCampaignIds()
    return activeIds.some((id) => id === campaignId)
  } catch {
    return false
  }
}

export async function deactivateCampaign(campaignId: bigint) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'updateCampaignState', args: [campaignId] })
  return await wait(hash)
}

export async function deactivateDesign(_designId: bigint) {
  return Promise.resolve()
}

export async function deactivateNGO(ngo: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'revokeVerification', args: [ngo] })
  return await wait(hash)
}

export async function deactivateDesigner(designer: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'revokeVerification', args: [designer] })
  return await wait(hash)
}

export async function createCampaignByNGO(params: {
  designer: HexAddress
  title: string
  description: string
  imageCid: string
  metadataCid: string
  targetHBAR: number
  ngoBps?: number
  designerBps?: number
  platformBps?: number
}): Promise<{ receipt: any; campaignId: bigint }> {
  const ngoBps = params.ngoBps ?? 7000
  const designerBps = params.designerBps ?? 2000
  const platformBps = params.platformBps ?? 1000
  const metadataHash = keccak256(stringToHex(params.metadataCid))
  const targetWei = toWei(params.targetHBAR)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60)

  const campaignCountBefore = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'campaignCount', args: [] }).catch(() => 0n)

  const hash = await write({
    address: CONTRACT,
    abi: ABI,
    functionName: 'createCampaign',
    args: [params.designer, params.title, params.description, params.imageCid, metadataHash, targetWei, deadline, BigInt(ngoBps), BigInt(designerBps), BigInt(platformBps)],
  })

  const receipt = await wait(hash)

  const status = receipt.status as string | number | undefined
  if (status === 'reverted' || status === 0 || status === '0x0') {
    throw new Error('Campaign creation transaction failed or was reverted')
  }

  let campaignId: bigint | undefined

  try {
    const client = publicClient()
    if (client) {
      const fullReceipt = await client.getTransactionReceipt({ hash })
      if (fullReceipt.logs) {
        for (const log of fullReceipt.logs) {
          try {
            const decoded = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics }) as any
            if (decoded.eventName === 'CampaignCreated' && decoded.args?.campaignId) {
              campaignId = BigInt(decoded.args.campaignId)
              break
            }
          } catch {
            continue
          }
        }
      }
    }
  } catch {
    //
  }

  if (!campaignId) {
    const campaignCountAfter = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'campaignCount', args: [] }).catch(() => 0n)
    if (campaignCountAfter > campaignCountBefore) {
      campaignId = campaignCountAfter - 1n
    }
  }

  if (campaignId === undefined) {
    throw new Error('Failed to retrieve campaign ID after creation. Transaction may have failed.')
  }

  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const verifyCampaign = await getCampaign(campaignId)
    if (!verifyCampaign || !verifyCampaign.ngo) {
      throw new Error('Campaign verification failed')
    }
  } catch {
    //
  }

  return { receipt, campaignId }
}

export async function getDesignById(_designId: bigint): Promise<Design | null> {
  return null
}

export async function listDesigns(): Promise<Design[]> {
  return []
}

export async function getDesignPrice(_designId: bigint): Promise<bigint> {
  return 0n
}

export async function getNgoProfile(owner: HexAddress): Promise<NgoProfile> {
  return { owner, name: '', description: '', image: undefined }
}

export async function getDesignerProfile(owner: HexAddress): Promise<DesignerProfile> {
  return { owner, name: '', bio: '', image: undefined }
}

export async function donate(params: { campaignId: bigint; valueHBAR: number; metadataHash?: string }) {
  if (params.valueHBAR <= 0) {
    throw new Error('Donation amount must be greater than zero')
  }

  const value = toWei(params.valueHBAR)
  const metadataHash = params.metadataHash || ''

  try {
    const hash = await write({
      address: CONTRACT,
      abi: ABI,
      functionName: 'contribute',
      args: [params.campaignId, metadataHash],
      value,
    })
    return await wait(hash)
  } catch (error: any) {
    const errorData = error?.data || error?.cause?.data || error?.reason
    const errorSignature = typeof errorData === 'string' && errorData.startsWith('0x') ? errorData.slice(0, 10) : null

    if (errorSignature) {
      switch (errorSignature) {
        case '0x2c067cd7':
          throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
        case '0xae921357':
          throw new Error(`Campaign ${params.campaignId} not found on-chain. The campaign may not exist or may have been removed.`)
        case '0x1f2a2005':
          throw new Error('Transfer failed. Unable to send funds. Please try again.')
        case '0x8456cb59':
          throw new Error('Reentrancy guard activated. Please wait and try again.')
      }
    }

    const msg = (error?.message || error?.shortMessage || '').toLowerCase()
    if (msg.includes('inactive') || msg.includes('invalidcampaignstate')) {
      throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
    }
    if (msg.includes('notkyc') || msg.includes('kyc')) {
      throw new Error('Your account must be KYC verified to donate.')
    }
    if (msg.includes('belowminimum')) {
      throw new Error('Donation amount must be at least 0.01 HBAR.')
    }
    if (msg.includes('blacklist')) {
      throw new Error('Your account cannot make donations at this time.')
    }

    throw new Error(`Donation failed: ${error?.message || error?.shortMessage || 'Unknown error. Please verify the campaign exists and try again.'}`)
  }
}

export async function getDonationsByCampaign(campaignId: bigint) {
  const donationIds = await read<bigint[]>({ address: CONTRACT, abi: ABI, functionName: 'getDonationsByCampaign', args: [campaignId] })
  const donors: HexAddress[] = []
  const amounts: bigint[] = []
  const timestamps: bigint[] = []
  const nftSerialNumbers: bigint[] = []
  let totalRaised = 0n

  for (const id of donationIds ?? []) {
    try {
      const d = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getDonation', args: [id] })
      const donor = d?.donor ?? d?.[0]
      const amount = BigInt(d?.amount ?? d?.[2] ?? 0n)
      const timestamp = BigInt(d?.timestamp ?? d?.[3] ?? 0n)
      const nftSerial = BigInt(d?.nftSerialNumber ?? d?.[4] ?? id)
      if (donor && !(d?.refunded ?? d?.[5])) {
        donors.push(donor as HexAddress)
        amounts.push(amount)
        timestamps.push(timestamp)
        nftSerialNumbers.push(nftSerial)
        totalRaised += amount
      }
    } catch {
      continue
    }
  }

  return {
    donors,
    amounts,
    timestamps,
    nftSerialNumbers,
    totalRaisedHBAR: Number(totalRaised) / 1e18, // weibars → HBAR
    count: donors.length,
  }
}

export async function purchaseDesign(_params: { designId: bigint; valueHBAR: number }) {
  throw new Error('Design marketplace is not available in the new contract.')
}

export async function purchaseDesignWithHBAR(_designId: bigint, _quantity: number) {
  return null
}

export async function batchPurchaseDesignsPayable(_items: { designId: bigint; quantity: number }[]) {
  throw new Error('Design marketplace is not available in the new contract.')
}

export async function simulatePurchase(_items: { designId: bigint; quantity: number }[]) {
  return 0n
}

export async function createDesign(_params: {
  campaignId: bigint
  designName: string
  description: string
  designFileCid: string
  previewImageCid: string
  metadataCid: string
  priceHBAR: number
}) {
  throw new Error('Design marketplace is not available in the new contract.')
}

export async function updateCampaignOnChain(campaignId: bigint, title: string, description: string, imageHash: string, targetHBAR: number) {
  try {
    console.log(`Updating campaign ${campaignId} on chain with target ${targetHBAR} HBAR...`);
    const targetWei = toWei(targetHBAR)
    const hash = await write({
      address: CONTRACT,
      abi: ABI,
      functionName: 'updateCampaign',
      args: [campaignId, title, description, imageHash, '0x0000000000000000000000000000000000000000000000000000000000000000', targetWei],
    })
    console.log(`Campaign ${campaignId} update tx sent: ${hash}. Waiting for receipt...`);
    const receipt = await wait(hash)
    console.log(`Campaign ${campaignId} update successful!`);
    return receipt;
  } catch (error) {
    console.error(`Failed to update campaign ${campaignId} on chain:`, error);
    throw error;
  }
}

export async function adminAddAdmin(admin: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'grantRole', args: [roles.DEFAULT_ADMIN_ROLE, admin] })
  return await wait(hash)
}

export async function adminRemoveAdmin(admin: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'revokeRole', args: [roles.DEFAULT_ADMIN_ROLE, admin] })
  return await wait(hash)
}

export async function adminApproveNgo(wallet: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'verifyAccount', args: [wallet] })
  const receipt = await wait(hash)
  return { ...receipt, hash }
}

export async function adminAddNgo(params: { wallet: HexAddress; metadataHash: string }) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'verifyAccount', args: [params.wallet] })
  return await wait(hash)
}

export async function adminApproveDesigner(wallet: HexAddress) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'verifyAccount', args: [wallet] })
  const receipt = await wait(hash)
  return { ...receipt, hash }
}

export async function adminAddDesigner(params: { wallet: HexAddress; portfolioHash: string }) {
  const hash = await write({ address: CONTRACT, abi: ABI, functionName: 'verifyAccount', args: [params.wallet] })
  return await wait(hash)
}

export async function listPendingNgos(): Promise<HexAddress[]> {
  return []
}

export async function listPendingDesigners(): Promise<HexAddress[]> {
  return []
}

export async function ngoRegisterPending(_params: { name: string; description: string; profileImageHash: string; metadataHash: string }) {
  return Promise.resolve({ transactionHash: undefined } as { transactionHash?: string })
}

export async function designerRegisterPending(_params: { name: string; bio: string; portfolioHash: string; profileImageHash: string }) {
  return Promise.resolve({ transactionHash: undefined } as { transactionHash?: string })
}
