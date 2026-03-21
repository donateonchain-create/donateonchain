import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAdminApiKey } from '../middleware/admin.js'

const router = express.Router()

const DesignIndexUpsertSchema = z.object({
  metadataCid: z.string().min(1),
  previewCid: z.string().min(1).optional(),
  designCid: z.string().min(1).optional(),
})

router.put('/design-index/:designId', requireAdminApiKey, async (req, res) => {
  const designId = req.params.designId
  const parsed = DesignIndexUpsertSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const data = parsed.data

  const record = await prisma.designIndex.upsert({
    where: { designId },
    update: {
      metadataCid: data.metadataCid,
      previewCid: data.previewCid ?? null,
      designCid: data.designCid ?? null,
    },
    create: {
      designId,
      metadataCid: data.metadataCid,
      previewCid: data.previewCid ?? null,
      designCid: data.designCid ?? null,
    },
  })

  res.json(record)
})

router.get('/design-index/:designId', async (req, res) => {
  const designId = req.params.designId
  const record = await prisma.designIndex.findUnique({ where: { designId } })
  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json(record)
})

export default router
