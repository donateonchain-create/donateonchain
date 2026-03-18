import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAdminApiKey } from '../middleware/admin.js'

const router = express.Router()

const AdminKycUpdateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'expired']),
  triggerOnChain: z.boolean().optional(),
})

router.post('/kyc/verifications/:id/admin-update', requireAdminApiKey, async (req, res) => {
  const parsed = AdminKycUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const record = await prisma.kycVerification.findUnique({ where: { id: req.params.id } })
  if (!record) return res.status(404).json({ error: 'Not found' })

  const nextStatus = parsed.data.status
  const updated = await prisma.kycVerification.update({
    where: { id: record.id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'expired' ? new Date() : null,
    },
  })

  if (parsed.data.triggerOnChain && nextStatus === 'approved') {
    try {
      const chainResult = await req.verifyAccountOnChain(updated.walletAddress)
      return res.json({ ok: true, verification: updated, chainResult })
    } catch (chainError) {
      req.log?.error(chainError, 'kyc_chain_sync_failed')
      return res.json({ ok: true, verification: updated, chainError: 'kyc_chain_sync_failed' })
    }
  }

  res.json({ ok: true, verification: updated })
})

export default router
