import { decodeErrorResult, formatUnits, parseEther } from 'viem'
import type { Abi } from 'viem'
import DonateOnChainAbi from '../contracts/DonateOnChain.abi.json'
import { formatHbarDisplay } from '../utils/hbar'

export const MIN_DONATION_HBAR = 10
export const MIN_DONATION_WEI = parseEther(String(MIN_DONATION_HBAR))

const DONATE_ABI = DonateOnChainAbi as Abi

const CAMPAIGN_STATE_LABELS = [
  'pending approval',
  'active',
  'goal reached',
  'ended (refunds available)',
  'closed',
] as const

function collectErrorChain(err: unknown): unknown[] {
  const out: unknown[] = []
  const seen = new Set<unknown>()
  let cur: unknown = err
  for (let i = 0; i < 24 && cur; i++) {
    if (seen.has(cur)) break
    seen.add(cur)
    out.push(cur)
    cur =
      cur && typeof cur === 'object' && 'cause' in (cur as object)
        ? (cur as { cause?: unknown }).cause
        : undefined
  }
  return out
}

function extractRevertDataHex(error: unknown): `0x${string}` | null {
  for (const item of collectErrorChain(error)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const data = o.data
    if (typeof data === 'string' && data.startsWith('0x') && data.length >= 10) {
      return data as `0x${string}`
    }
    for (const key of ['details', 'message', 'shortMessage'] as const) {
      const s = o[key]
      if (typeof s !== 'string') continue
      const m = s.match(/0x[a-fA-F0-9]{8,}/)
      if (m && m[0].length >= 10) return m[0] as `0x${string}`
    }
  }
  const top = error && typeof error === 'object' ? (error as { message?: string }).message : undefined
  if (typeof top === 'string') {
    const m = top.match(/0x[a-fA-F0-9]{8,}/)
    if (m && m[0].length >= 10) return m[0] as `0x${string}`
  }
  return null
}

function isUserRejection(error: unknown): boolean {
  const parts = collectErrorChain(error)
    .map((e) => {
      if (!e || typeof e !== 'object') return ''
      const o = e as Record<string, unknown>
      return [o.message, o.shortMessage, o.name].filter((x) => typeof x === 'string').join(' ')
    })
    .join(' ')
    .toLowerCase()
  return (
    parts.includes('user rejected') ||
    parts.includes('rejected the request') ||
    parts.includes('denied transaction') ||
    parts.includes('user denied')
  )
}

function isInsufficientFunds(error: unknown): boolean {
  const s = collectErrorChain(error)
    .map((e) => (e && typeof e === 'object' ? String((e as { message?: string }).message ?? '') : ''))
    .join(' ')
    .toLowerCase()
  return s.includes('insufficient funds') || s.includes('insufficient balance')
}

function formatDecodedDonationError(
  decoded: { errorName: string; args: readonly unknown[] },
  campaignId: bigint
): string {
  switch (decoded.errorName) {
    case 'BelowMinimumDonation': {
      const min = decoded.args[1] as bigint
      const minHbar = formatHbarDisplay(Number(formatUnits(min, 18)))
      return `The minimum donation is ${minHbar} HBAR.`
    }
    case 'DonationExceedsRemaining': {
      const remainingWei = decoded.args[0] as bigint
      const remHbar = formatHbarDisplay(Number(formatUnits(remainingWei, 18)))
      return `This amount exceeds what is left to reach the campaign goal. You can donate up to ${remHbar} HBAR more.`
    }
    case 'CampaignNotFound':
      return `Campaign ${campaignId} was not found on-chain. It may not exist on this network.`
    case 'InvalidCampaignState': {
      const current = Number(decoded.args[1])
      const required = Number(decoded.args[2])
      const curLabel = CAMPAIGN_STATE_LABELS[current] ?? 'unknown'
      const reqLabel = CAMPAIGN_STATE_LABELS[required] ?? 'required state'
      if (required === 1) {
        return `This campaign is not accepting donations (status: ${curLabel}). It must be approved and active before you can donate.`
      }
      return `This campaign cannot accept donations right now (status: ${curLabel}; expected: ${reqLabel}).`
    }
    case 'DeadlineInPast':
      return 'This campaign’s deadline has passed. Donations are no longer accepted.'
    case 'NotKycVerified':
      return 'Your wallet must be KYC verified on-chain before you can donate.'
    case 'AccountBlacklistedError':
      return 'Your account cannot make donations at this time.'
    case 'EnforcedPause':
      return 'Donations are temporarily paused by the platform. Please try again later.'
    case 'ReentrancyGuardReentrantCall':
      return 'Please wait a moment and try again.'
    case 'ZeroAmount':
      return 'Donation amount must be greater than zero.'
    case 'TransferFailed':
      return 'The transfer could not be completed. Check your wallet balance and try again.'
    default:
      return ''
  }
}

export function interpretDonationWriteError(
  error: unknown,
  ctx: { campaignId: bigint; valueWei: bigint }
): Error {
  if (isUserRejection(error)) {
    return new Error('You cancelled the transaction.')
  }
  if (isInsufficientFunds(error)) {
    return new Error('Your wallet does not have enough HBAR to cover this donation and fees.')
  }

  const hex = extractRevertDataHex(error)
  if (hex && hex.length >= 10) {
    try {
      const decoded = decodeErrorResult({ abi: DONATE_ABI, data: hex })
      const msg = formatDecodedDonationError(decoded as { errorName: string; args: readonly unknown[] }, ctx.campaignId)
      if (msg) return new Error(msg)
    } catch {
      //
    }
  }

  if (ctx.valueWei > 0n && ctx.valueWei < MIN_DONATION_WEI) {
    return new Error(`The minimum donation is ${MIN_DONATION_HBAR} HBAR.`)
  }

  const raw = collectErrorChain(error)
    .map((e) => (e && typeof e === 'object' ? String((e as { message?: string }).message ?? '') : ''))
    .find((m) => m.length > 0)

  const lower = (raw ?? '').toLowerCase()
  if (lower.includes('contract_revert') || lower.includes('execution reverted')) {
    return new Error(
      'The contract rejected this donation. Check the minimum amount, that your wallet is KYC verified, and that the campaign is active and before its deadline.'
    )
  }

  if (lower.includes('notkyc') || lower.includes('kyc')) {
    return new Error('Your wallet must be KYC verified on-chain before you can donate.')
  }
  if (lower.includes('blacklist')) {
    return new Error('Your account cannot make donations at this time.')
  }
  if (lower.includes('belowminimum')) {
    return new Error(`The minimum donation is ${MIN_DONATION_HBAR} HBAR.`)
  }

  const short = raw?.replace(/^Donation failed:\s*/i, '').trim()
  if (short && short.length < 200 && !short.includes('Raw Call Arguments')) {
    return new Error(short)
  }

  return new Error('Could not complete the donation. Please try again or verify your amount, KYC status, and network.')
}
