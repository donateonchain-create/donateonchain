import { timingSafeEqualString, normalizeAddress } from '../lib/utils.js'
import { verifyAccessToken } from '../lib/jwt.js'

export function requireAdminApiKey(req, res, next) {
  const adminApiKey = process.env.KYC_ADMIN_API_KEY
  if (!adminApiKey || String(adminApiKey).trim() === '') {
    return res.status(503).json({ error: 'admin_api_key_not_configured' })
  }
  if (!timingSafeEqualString(req.get('x-api-key'), adminApiKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

export function requireAdminApiKeyIfConfigured(req, res, next) {
  const adminApiKey = process.env.KYC_ADMIN_API_KEY
  if (!adminApiKey || String(adminApiKey).trim() === '') {
    return next()
  }
  if (!timingSafeEqualString(req.get('x-api-key'), adminApiKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

export function requireAuthOrAdmin(req, res, next) {
  const adminApiKey = process.env.KYC_ADMIN_API_KEY
  if (adminApiKey && req.get('x-api-key') && timingSafeEqualString(req.get('x-api-key'), adminApiKey)) {
    req.isAdmin = true
    return next()
  }

  const authHeader = req.get('authorization') || ''
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    try {
      const decoded = verifyAccessToken(parts[1])
      if (decoded?.sub) {
        req.auth = {
          walletAddress: normalizeAddress(decoded.sub),
          roles: Array.isArray(decoded.roles) ? decoded.roles : [],
        }
        return next()
      }
    } catch {}
  }

  return res.status(401).json({ error: 'Unauthorized' })
}
