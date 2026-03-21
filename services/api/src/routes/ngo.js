import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { normalizeAddress } from '../lib/utils.js'
import { verifyWalletSignature } from '../lib/walletAuth.js'
import { requireAdminApiKey } from '../middleware/admin.js'

const router = express.Router()

const NgoApplicationSubmitSchema = z.object({
  walletAddress: z.string().min(1),
  ngoName: z.string().min(1),
  email: z.string().min(3),
  phoneNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  yearFounded: z.string().optional(),
  website: z.string().optional(),
  organizationType: z.string().optional(),
  focusAreas: z.array(z.string()).default([]),
  addressLine: z.string().optional(),
  country: z.string().optional(),
  stateRegion: z.string().optional(),
  logoCid: z.string().optional(),
  annualReportCid: z.string().optional(),
  registrationCertCid: z.string().optional(),
  metadataCid: z.string().optional(),
})

router.post('/ngo/applications', async (req, res) => {
  const parsed = NgoApplicationSubmitSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const signature = req.get('x-wallet-signature')
  const timestamp = req.get('x-wallet-timestamp')
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'wallet_signature_required' })
  }

  const auth = await verifyWalletSignature({
    walletAddress: parsed.data.walletAddress,
    signature,
    timestamp,
    purpose: 'ngo_application_submit',
  })

  if (!auth.ok) {
    return res.status(401).json({ error: auth.error })
  }

  try {
    const stored = await prisma.ngoApplication.upsert({
      where: { walletAddress: normalizeAddress(parsed.data.walletAddress) },
      update: {
        ngoName: parsed.data.ngoName,
        email: parsed.data.email,
        phoneNumber: parsed.data.phoneNumber ?? null,
        registrationNumber: parsed.data.registrationNumber ?? null,
        yearFounded: parsed.data.yearFounded ?? null,
        website: parsed.data.website ?? null,
        organizationType: parsed.data.organizationType ?? null,
        focusAreas: parsed.data.focusAreas || [],
        addressLine: parsed.data.addressLine ?? null,
        country: parsed.data.country ?? null,
        stateRegion: parsed.data.stateRegion ?? null,
        logoCid: parsed.data.logoCid ?? null,
        annualReportCid: parsed.data.annualReportCid ?? null,
        registrationCertCid: parsed.data.registrationCertCid ?? null,
        metadataCid: parsed.data.metadataCid ?? null,
        status: 'pending',
        rejectionReason: null,
        statusUpdatedAt: null,
      },
      create: {
        walletAddress: normalizeAddress(parsed.data.walletAddress),
        ngoName: parsed.data.ngoName,
        email: parsed.data.email,
        phoneNumber: parsed.data.phoneNumber ?? null,
        registrationNumber: parsed.data.registrationNumber ?? null,
        yearFounded: parsed.data.yearFounded ?? null,
        website: parsed.data.website ?? null,
        organizationType: parsed.data.organizationType ?? null,
        focusAreas: parsed.data.focusAreas || [],
        addressLine: parsed.data.addressLine ?? null,
        country: parsed.data.country ?? null,
        stateRegion: parsed.data.stateRegion ?? null,
        logoCid: parsed.data.logoCid ?? null,
        annualReportCid: parsed.data.annualReportCid ?? null,
        registrationCertCid: parsed.data.registrationCertCid ?? null,
        metadataCid: parsed.data.metadataCid ?? null,
      },
    })

    res.status(201).json({ ok: true, application: stored, signedMessage: auth.message })
  } catch (e) {
    req.log?.error(e, 'ngo_application_submit_failed')
    res.status(500).json({ error: 'ngo_application_submit_failed' })
  }
})

router.get('/ngo/applications/:walletAddress', async (req, res) => {
  const walletAddress = normalizeAddress(req.params.walletAddress)

  const signature = req.get('x-wallet-signature')
  const timestamp = req.get('x-wallet-timestamp')
  if (signature && timestamp) {
    const auth = await verifyWalletSignature({
      walletAddress,
      signature,
      timestamp,
      purpose: 'ngo_application_read',
    })
    if (!auth.ok) return res.status(401).json({ error: auth.error })
  } else {
    return res.status(401).json({ error: 'wallet_signature_required' })
  }

  const record = await prisma.ngoApplication.findUnique({ where: { walletAddress } })
  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json(record)
})

const NgoApplicationAdminListQuerySchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

router.get('/admin/ngo-applications', requireAdminApiKey, async (req, res) => {
  const parsed = NgoApplicationAdminListQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { page, limit, status } = parsed.data
  const where = status ? { status } : {}
  const [total, items] = await Promise.all([
    prisma.ngoApplication.count({ where }),
    prisma.ngoApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
  ])

  res.json({ page, limit, total, items })
})

const NgoApplicationAdminUpdateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'rejected']),
  rejectionReason: z.string().max(1000).optional(),
})

router.patch('/admin/ngo-applications/:walletAddress', requireAdminApiKey, async (req, res) => {
  const walletAddress = normalizeAddress(req.params.walletAddress)
  const parsed = NgoApplicationAdminUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const updated = await prisma.ngoApplication.update({
      where: { walletAddress },
      data: {
        status: parsed.data.status,
        rejectionReason: parsed.data.status === 'rejected' ? (parsed.data.rejectionReason || 'Rejected') : null,
        statusUpdatedAt: new Date(),
      },
    })

    res.json({ ok: true, application: updated })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

export default router
