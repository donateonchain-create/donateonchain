import jwt from 'jsonwebtoken'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || String(secret).trim() === '') {
    throw new Error('JWT_SECRET is missing')
  }
  return secret
}

export function signAccessToken({ walletAddress, roles }) {
  const secret = getJwtSecret()
  const ttlSeconds = Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS || 60 * 15)
  return jwt.sign({ roles: roles || [] }, secret, {
    subject: walletAddress,
    expiresIn: ttlSeconds,
  })
}

export function verifyAccessToken(token) {
  const secret = getJwtSecret()
  return jwt.verify(token, secret)
}
