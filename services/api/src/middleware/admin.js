import { timingSafeEqualString } from '../lib/utils.js'

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
