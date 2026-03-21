import { verifyAccessToken } from '../lib/jwt.js'
import { normalizeAddress } from '../lib/utils.js'

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || ''
  const parts = header.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'missing_token' })
  }

  try {
    const decoded = verifyAccessToken(parts[1])
    const sub = decoded?.sub
    if (!sub) return res.status(401).json({ error: 'invalid_token' })
    req.auth = {
      walletAddress: normalizeAddress(sub),
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
    }
    return next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export function requireWalletMatch(paramName = 'walletAddress') {
  return (req, res, next) => {
    const claimed = req.auth?.walletAddress
    const provided = normalizeAddress(req.params[paramName] || req.body?.[paramName] || '')
    if (!claimed || !provided || claimed !== provided) {
      return res.status(403).json({ error: 'wallet_mismatch' })
    }
    return next()
  }
}
