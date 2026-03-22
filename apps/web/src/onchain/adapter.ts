import { abis, addresses, roles } from './contracts'
import { read, write, wait, publicClient } from './client'
import type { Campaign, Design, NgoProfile, DesignerProfile, UserRoles, HexAddress } from '../types/onchain'
import { getIPFSURL } from '../utils/ipfs'
import { keccak256, stringToHex, decodeEventLog, formatUnits, parseEther } from 'viem'
import { formatHbarDisplay, weiToHbar } from '../utils/hbar'
import { interpretDonationWriteError, MIN_DONATION_HBAR, MIN_DONATION_WEI } from './contractErrors'

export { MIN_DONATION_HBAR, MIN_DONATION_WEI }

const CONTRACT = addresses.DONATE_ON_CHAIN as HexAddress
const ABI = abis.DonateOnChain as any

const CampaignState = { Pending_Vetting: 0, Active: 1, Goal_Reached: 2, Failed_Refundable: 3, Closed: 4 } as const

const CAMPAIGN_STATUS_WORDS = [
  'pending admin approval',
  'active',
  'goal reached',
  'ended (refunds available)',
  'closed',
] as const

const ZERO = '0x0000000000000000000000000000000000000000' as HexAddress

function parseHbarInputToWei(input: string): bigint {
  const s = input.trim().replace(/,/g, '')
  if (!s) {
    throw new Error('Donation amount must be greater than zero')
  }
  try {
    return parseEther(s)
  } catch {
    throw new Error('Invalid donation amount')
  }
}

async function assertDonationAllowed(params: { campaignId: bigint; valueWei: bigint; donor: HexAddress }) {
  const { campaignId, valueWei, donor } = params
  if (valueWei < MIN_DONATION_WEI) {
    throw new Error(`The minimum donation is ${MIN_DONATION_HBAR} HBAR.`)
  }

  let paused = false
  let kyc = false
  let blacklisted = false
  try {
    ;[paused, kyc, blacklisted] = await Promise.all([
      read<boolean>({ address: CONTRACT, abi: ABI, functionName: 'paused', args: [] }),
      read<boolean>({ address: CONTRACT, abi: ABI, functionName: 'isKycVerified', args: [donor] }),
      read<boolean>({ address: CONTRACT, abi: ABI, functionName: 'isBlacklisted', args: [donor] }),
    ])
  } catch {
    throw new Error('Could not read contract state. Check your network connection and try again.')
  }

  if (paused) {
    throw new Error('Donations are temporarily paused by the platform. Please try again later.')
  }
  if (!kyc) {
    throw new Error('Your wallet must be KYC verified on-chain before you can donate.')
  }
  if (blacklisted) {
    throw new Error('Your account cannot make donations at this time.')
  }

  const campaign = await getCampaign(campaignId)
  const ngo = campaign.ngo ? String(campaign.ngo).toLowerCase() : ''
  if (!ngo || ngo === ZERO.toLowerCase()) {
    throw new Error(`Campaign ${campaignId} was not found on-chain.`)
  }

  const now = BigInt(Math.floor(Date.now() / 1000))
  if (campaign.deadline !== undefined && campaign.deadline > 0n && now > campaign.deadline) {
    throw new Error('This campaign’s deadline has passed. Donations are no longer accepted.')
  }

  const state = campaign.state ?? CampaignState.Pending_Vetting
  if (state !== CampaignState.Active) {
    const label = CAMPAIGN_STATUS_WORDS[state] ?? 'unknown'
    throw new Error(
      `This campaign is not accepting donations (status: ${label}). It must be approved and active before you can donate.`
    )
  }

  let raised: bigint
  try {
    raised = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignBalance', args: [campaignId] })
  } catch {
    throw new Error('Could not read campaign balance. Try again in a moment.')
  }

  const target = campaign.goalHBAR
  const remaining = target > raised ? target - raised : 0n
  if (valueWei > remaining) {
    const remHbar = formatHbarDisplay(Number(formatUnits(remaining, 18)))
    throw new Error(
      `This amount exceeds what is left to reach the campaign goal. You can donate up to ${remHbar} HBAR more.`
    )
  }
}

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

export async function isKycVerifiedOnChain(wallet: HexAddress): Promise<boolean> {
  try {
    return await read<boolean>({
      address: CONTRACT,
      abi: ABI,
      functionName: 'isKycVerified',
      args: [wallet],
    })
  } catch {
    return false
  }
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
    const countBn = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'campaignCount', args: [] }).catch(() => 0n)
    const total = Number(countBn)
    if (!Number.isFinite(total) || total <= 0) return []

    const campaigns: any[] = []

    for (let i = 0; i < total; i++) {
      const id = BigInt(i)
      try {
        const chainCampaign = await getCampaign(id)
        const st = chainCampaign.state ?? CampaignState.Pending_Vetting
        if (st !== CampaignState.Pending_Vetting && st !== CampaignState.Active) {
          continue
        }

        let amountRaised = 0
        try {
          amountRaised = await getCampaignRaisedHBAR(id)
        } catch {
          //
        }

        let title = chainCampaign.title || ''
        let description = chainCampaign.description || ''
        let category: string | undefined
        let image: string | undefined = chainCampaign.image
        let target = weiToHbar(chainCampaign.goalHBAR)

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
          vettingPending: st === CampaignState.Pending_Vetting,
          campaignState: st,
          createdAt: Date.now(),
        })
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load campaign ${i}:`, e)
        }
      }
    }

    for (const campaign of campaigns) {
      const t = campaign.target || 0
      campaign.percentage = t > 0 ? (campaign.amountRaised / t) * 100 : 0
    }

    return campaigns
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error listing campaigns from chain:', error)
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
          amountRaised = await getCampaignRaisedHBAR(id)
        } catch { }

        let title = chainCampaign.title || ''
        let description = chainCampaign.description || ''
        let category: string | undefined
        let image: string | undefined = chainCampaign.image
        let target = weiToHbar(chainCampaign.goalHBAR)

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
        const d = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getDonation', args: [id] })
        const donationCampaignId: bigint = BigInt(d?.campaignId ?? d?.[1] ?? 0n)
        const donationAmount: bigint = BigInt(d?.amount ?? d?.[2] ?? 0n)
        const donationTimestamp: bigint = BigInt(d?.timestamp ?? d?.[3] ?? 0n)
        let image: string | undefined
        let campaignTitle: string | undefined
        try {
          const campaign = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getCampaign', args: [donationCampaignId] })
          const imageHash = campaign?.imageHash as string | undefined
          if (imageHash) {
            image = imageHash.startsWith('http') ? imageHash : getIPFSURL(imageHash)
          }
          campaignTitle = campaign?.title as string | undefined
          if (!image && campaign?.metadataFileHash) {
            try {
              const metaCid = await read<string>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignMetadataCid', args: [donationCampaignId] }).catch(() => undefined)
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
          campaignId: donationCampaignId,
          campaignTitle,
          image,
          amount: donationAmount,
          timestamp: donationTimestamp,
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
          const raisedHbar = await getCampaignRaisedHBAR(onchainId)
          syncedCampaigns.push({
            ...storedCampaign,
            id: Number(onchainId),
            onchainId: Number(onchainId),
            amountRaised: raisedHbar,
            goal: weiToHbar(chainCampaign.goalHBAR),
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

export async function getCampaign(id: bigint): Promise<Campaign & { active?: boolean; state?: number }> {
  const c = await read<any>({ address: CONTRACT, abi: ABI, functionName: 'getCampaign', args: [id] })
  const state = typeof c?.state === 'number' ? c.state : c?.[11] ?? 0
  const active = state === CampaignState.Active
  let image = c?.imageHash ?? c?.[4]
  if (image && (String(image).startsWith('Qm') || String(image).startsWith('baf'))) {
    image = getIPFSURL(String(image))
  }
  const deadlineRaw = c?.deadline ?? c?.[7]
  const deadline =
    deadlineRaw !== undefined && deadlineRaw !== null ? BigInt(deadlineRaw) : undefined
  return {
    id: BigInt(id),
    title: c?.title ?? c?.[2] ?? '',
    description: c?.description ?? c?.[3] ?? '',
    goalHBAR: BigInt(c?.targetAmount ?? c?.[6] ?? 0n),
    ngo: (c?.ngo ?? c?.[0]) as HexAddress,
    designer: (c?.designer ?? c?.[1]) as HexAddress | undefined,
    image: image || undefined,
    active,
    state,
    ...(deadline !== undefined && deadline > 0n ? { deadline } : {}),
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
  deadlineUnixSeconds?: number
  ngoBps?: number
  designerBps?: number
  platformBps?: number
}): Promise<{ receipt: any; campaignId: bigint }> {
  const ngoBps = params.ngoBps ?? 7000
  const designerBps = params.designerBps ?? 2000
  const platformBps = params.platformBps ?? 1000
  const metadataHash = keccak256(stringToHex(params.metadataCid))
  const targetWei = toWei(params.targetHBAR)
  const nowSec = Math.floor(Date.now() / 1000)
  const fallbackDeadline = nowSec + 90 * 24 * 60 * 60
  const chosen =
    params.deadlineUnixSeconds != null && Number.isFinite(params.deadlineUnixSeconds)
      ? Math.floor(params.deadlineUnixSeconds)
      : fallbackDeadline
  const deadline = BigInt(Math.max(nowSec + 3600, chosen))

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

export async function donate(params: { campaignId: bigint; valueHbarDecimal: string; metadataHash?: string; donor: HexAddress }) {
  const valueWei = parseHbarInputToWei(params.valueHbarDecimal)
  if (valueWei === 0n) {
    throw new Error('Donation amount must be greater than zero')
  }

  const metadataHash = params.metadataHash || ''

  await assertDonationAllowed({
    campaignId: params.campaignId,
    valueWei,
    donor: params.donor,
  })

  try {
    const hash = await write({
      address: CONTRACT,
      abi: ABI,
      functionName: 'contribute',
      args: [params.campaignId, metadataHash],
      value: valueWei,
    })
    return await wait(hash)
  } catch (error: unknown) {
    throw interpretDonationWriteError(error, { campaignId: params.campaignId, valueWei })
  }
}

export async function getCampaignRaisedHBAR(campaignId: bigint): Promise<number> {
  const wei = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignBalance', args: [campaignId] })
  return weiToHbar(wei)
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

  let raisedWei = totalRaised
  try {
    raisedWei = await read<bigint>({ address: CONTRACT, abi: ABI, functionName: 'getCampaignBalance', args: [campaignId] })
  } catch {
    //
  }

  return {
    donors,
    amounts,
    timestamps,
    nftSerialNumbers,
    totalRaisedHBAR: weiToHbar(raisedWei),
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
