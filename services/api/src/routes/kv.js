import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuthOrAdmin } from '../middleware/admin.js'

const router = express.Router()

function isProtectedKvCollection(collection) {
  return [
    'ngoApplications',
        'systemData',
    'adminList',
    'waitlist',
  ].includes(String(collection || ''))
}

const KvUpsertSchema = z.object({
  data: z.any(),
})

router.put('/kv/:collection/:key', requireAuthOrAdmin, async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

  if (isProtectedKvCollection(collection)) {
    return res.status(403).json({ error: 'kv_collection_write_blocked' })
  }

  const parsed = KvUpsertSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const record = await prisma.kvDocument.upsert({
    where: { collection_key: { collection, key } },
    update: { data: parsed.data.data },
    create: { collection, key, data: parsed.data.data },
  })

  res.json({ key: record.key, data: record.data })
})

router.get('/kv/:collection/:key', async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

  const record = await prisma.kvDocument.findUnique({
    where: { collection_key: { collection, key } },
  })

  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json({ key: record.key, data: record.data })
})

router.get('/kv/:collection', async (req, res) => {
  const collection = req.params.collection
  const keyPrefix = typeof req.query.keyPrefix === 'string' ? req.query.keyPrefix : undefined

  const records = await prisma.kvDocument.findMany({
    where: {
      collection,
      ...(keyPrefix ? { key: { startsWith: keyPrefix } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })

  res.json(records.map((r) => ({ key: r.key, data: r.data })))
})

router.delete('/kv/:collection/:key', requireAuthOrAdmin, async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

  if (isProtectedKvCollection(collection)) {
    return res.status(403).json({ error: 'kv_collection_write_blocked' })
  }

  try {
    await prisma.kvDocument.delete({ where: { collection_key: { collection, key } } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

export default router
