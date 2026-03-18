import { recoverMessageAddress } from 'viem'
import { normalizeAddress } from './utils.js'

export async function verifyWalletSignature({ walletAddress, signature, timestamp, purpose }) {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return { ok: false, error: 'invalid_timestamp' }
  const now = Date.now()
  const driftMs = Math.abs(now - ts)
  const maxDriftMs = Number(process.env.WALLET_AUTH_MAX_DRIFT_MS || 5 * 60 * 1000)
  if (driftMs > maxDriftMs) return { ok: false, error: 'timestamp_out_of_range' }

  const msg = `DonateOnChain:${purpose}:${ts}`
  let recovered
  try {
    recovered = await recoverMessageAddress({ message: msg, signature })
  } catch {
    return { ok: false, error: 'invalid_signature' }
  }

  if (normalizeAddress(recovered) !== normalizeAddress(walletAddress)) {
    return { ok: false, error: 'signature_mismatch' }
  }

  return { ok: true, message: msg }
}
