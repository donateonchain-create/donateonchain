import { formatUnits } from 'viem'

export function weiToHbar(wei: bigint | string | number): number {
  if (typeof wei === 'bigint') {
    return Number(formatUnits(wei, 18))
  }
  if (typeof wei === 'number') {
    return Number.isFinite(wei) ? wei : 0
  }
  const s = String(wei).trim()
  if (!s) return 0
  if (/^\d+$/.test(s)) {
    try {
      return Number(formatUnits(BigInt(s), 18))
    } catch {
      return Number(s) || 0
    }
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const LIKELY_WEI_THRESHOLD = 1e12

export function normalizeLikelyWeiNumber(n: number): number {
  if (!Number.isFinite(n) || n === 0) return n
  const abs = Math.abs(n)
  if (abs >= LIKELY_WEI_THRESHOLD) {
    return n / 1e18
  }
  return n
}

export function computeCampaignPercent(raised: number, target: number): number {
  const r = normalizeLikelyWeiNumber(Number(raised))
  const t = normalizeLikelyWeiNumber(Number(target))
  if (!Number.isFinite(r) || !Number.isFinite(t) || t <= 0) return 0
  const p = (r / t) * 100
  return Number.isFinite(p) ? Math.max(0, p) : 0
}

export function normalizeCampaignAmounts<T extends { target?: number; amountRaised?: number; percentage?: number }>(
  c: T
): T {
  const target = normalizeLikelyWeiNumber(Number(c.target ?? 0))
  const amountRaised = normalizeLikelyWeiNumber(Number(c.amountRaised ?? 0))
  const percentage = computeCampaignPercent(amountRaised, target)
  return { ...c, target, amountRaised, percentage }
}

export function mergeCampaignRaisedHBAR(
  chainHBAR: number,
  api?: { raisedAmount?: string | null; donationTotal?: string | null } | null
): number {
  const c = Number(chainHBAR) || 0
  if (!api) return c
  let apiMax = 0
  const ra = api.raisedAmount
  if (ra != null && String(ra).trim() !== '') {
    apiMax = Math.max(apiMax, weiToHbar(ra))
  }
  const dt = api.donationTotal
  if (dt != null && String(dt).trim() !== '') {
    apiMax = Math.max(apiMax, weiToHbar(dt))
  }
  return Math.max(c, apiMax)
}

export function formatHbarDisplay(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const v = normalizeLikelyWeiNumber(value)
  return v.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 0 })
}

export function getRemainingToTargetHBAR(target: number, raised: number): number {
  const t = normalizeLikelyWeiNumber(Number(target))
  const r = normalizeLikelyWeiNumber(Number(raised))
  if (!Number.isFinite(t) || t <= 0) return 0
  if (!Number.isFinite(r) || r < 0) return t
  return Math.max(0, t - r)
}

const HBAR_COMPARE_DECIMALS = 6

export function roundHbarForCompare(n: number): number {
  if (!Number.isFinite(n)) return 0
  const v = normalizeLikelyWeiNumber(n)
  const f = 10 ** HBAR_COMPARE_DECIMALS
  return Math.round(v * f) / f
}

export function donationAmountExceedsRemaining(donation: number, remaining: number): boolean {
  if (!Number.isFinite(donation) || !Number.isFinite(remaining)) return false
  if (remaining <= 0) return false
  return roundHbarForCompare(donation) > roundHbarForCompare(remaining)
}

export function formatCampaignPercentLabel(percent: number): string {
  const p = Number.isFinite(percent) ? Math.max(0, percent) : 0
  if (p === 0) return '0%'
  if (p >= 100) return `${Math.round(Math.min(p, 99999))}%`
  const rounded = Math.round(p * 10) / 10
  return `${rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)}%`
}
