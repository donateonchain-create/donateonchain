import express from 'express'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { normalizeAddress } from '../lib/utils.js'
import { signAccessToken } from '../lib/jwt.js'
import { recoverMessageAddress } from 'viem'

const router = express.Router()

const NonceRequestSchema = z.object({
  walletAddress: z.string().min(3),
})

router.post('/auth/nonce', async (req, res) => {
  const parsed = NonceRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const walletAddress = normalizeAddress(parsed.data.walletAddress)
  const nonce = randomBytes(16).toString('hex')
  const ttlMs = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000)
  const expiresAt = new Date(Date.now() + ttlMs)

  await prisma.authNonce.create({
    data: {
      walletAddress,
      nonce,
      expiresAt,
    },
  })

  const message = `DonateOnChain Sign-In\nWallet: ${walletAddress}\nNonce: ${nonce}`

  res.json({ walletAddress, nonce, expiresAt: expiresAt.toISOString(), message })
})

const VerifySchema = z.object({
  walletAddress: z.string().min(3),
  nonce: z.string().min(10),
  signature: z.string().min(10),
})

router.post('/auth/verify', async (req, res) => {
  const parsed = VerifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const walletAddress = normalizeAddress(parsed.data.walletAddress)
  const nonce = parsed.data.nonce

  const record = await prisma.authNonce.findUnique({ where: { nonce } })
  if (!record || normalizeAddress(record.walletAddress) !== walletAddress) {
    return res.status(401).json({ error: 'invalid_nonce' })
  }
  if (record.consumedAt) {
    return res.status(401).json({ error: 'nonce_already_used' })
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ error: 'nonce_expired' })
  }

  const message = `DonateOnChain Sign-In\nWallet: ${walletAddress}\nNonce: ${nonce}`

  let recovered
  try {
    recovered = await recoverMessageAddress({ message, signature: parsed.data.signature })
  } catch {
    return res.status(401).json({ error: 'invalid_signature' })
  }

  if (normalizeAddress(recovered) !== walletAddress) {
    return res.status(401).json({ error: 'signature_mismatch' })
  }

  await prisma.authNonce.update({ where: { nonce }, data: { consumedAt: new Date() } })

  const user = await prisma.user.upsert({
    where: { walletAddress },
    update: { lastLoginAt: new Date() },
    create: { walletAddress, roles: [], lastLoginAt: new Date() },
  })

  const token = signAccessToken({ walletAddress, roles: user.roles })
  res.json({ ok: true, token, user: { walletAddress: user.walletAddress, roles: user.roles } })
})

export default router
