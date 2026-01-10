import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import pinoHttp from 'pino-http'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '2mb' }))
app.use(pinoHttp())

const upload = multer({ storage: multer.memoryStorage() })

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok' })
  } catch (e) {
    req.log?.error(e, 'healthcheck_failed')
    res.status(503).json({ status: 'db_unavailable' })
  }
})

const AddressSchema = z.string().min(3)

const OrderItemSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1)]),
  quantity: z.number().int().positive(),
})

const CreateOrderSchema = z.object({
  buyer: AddressSchema,
  items: z.array(OrderItemSchema).min(1),
  totalHBAR: z.string().min(1),
  txHashes: z.array(z.string().min(1)).default([]),
})

app.post('/api/orders', async (req, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const data = parsed.data

  const created = await prisma.order.create({
    data: {
      buyer: data.buyer.toLowerCase(),
      totalHBAR: data.totalHBAR,
      txHashes: data.txHashes,
      items: {
        create: data.items.map((it) => ({
          externalItemId: String(it.id),
          quantity: it.quantity,
        })),
      },
    },
    include: { items: true },
  })

  res.status(201).json(created)
})

app.get('/api/orders', async (req, res) => {
  const buyer = typeof req.query.buyer === 'string' ? req.query.buyer : undefined

  const where = buyer ? { buyer: buyer.toLowerCase() } : {}

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })

  res.json(orders)
})

const CreateDonationSchema = z.object({
  donorAddress: AddressSchema,
  campaignId: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  amount: z.union([z.number(), z.string().min(1)]),
  itemId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  itemName: z.string().optional(),
  date: z.string().optional(),
  txHash: z.string().optional(),
})

app.post('/api/donations', async (req, res) => {
  const parsed = CreateDonationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const data = parsed.data

  const created = await prisma.donation.create({
    data: {
      donorAddress: data.donorAddress.toLowerCase(),
      campaignId: String(data.campaignId),
      amount: String(data.amount),
      itemId: data.itemId !== undefined ? String(data.itemId) : null,
      itemName: data.itemName ?? null,
      date: data.date ?? new Date().toISOString(),
      txHash: data.txHash ?? null,
    },
  })

  res.status(201).json(created)
})

app.get('/api/donations', async (req, res) => {
  const donorAddress = typeof req.query.donorAddress === 'string' ? req.query.donorAddress : undefined
  const campaignId = typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined

  const where = {
    ...(donorAddress ? { donorAddress: donorAddress.toLowerCase() } : {}),
    ...(campaignId ? { campaignId: String(campaignId) } : {}),
  }

  const donations = await prisma.donation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json(donations)
})

const DesignIndexUpsertSchema = z.object({
  metadataCid: z.string().min(1),
  previewCid: z.string().min(1).optional(),
  designCid: z.string().min(1).optional(),
})

app.put('/api/design-index/:designId', async (req, res) => {
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

app.get('/api/design-index/:designId', async (req, res) => {
  const designId = req.params.designId
  const record = await prisma.designIndex.findUnique({ where: { designId } })
  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json(record)
})

const KvUpsertSchema = z.object({
  data: z.any(),
})

app.put('/api/kv/:collection/:key', async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

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

app.get('/api/kv/:collection/:key', async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

  const record = await prisma.kvDocument.findUnique({
    where: { collection_key: { collection, key } },
  })

  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json({ key: record.key, data: record.data })
})

app.get('/api/kv/:collection', async (req, res) => {
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

app.delete('/api/kv/:collection/:key', async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key
  try {
    await prisma.kvDocument.delete({ where: { collection_key: { collection, key } } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

function withTimeout(ms) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

function getPinataConfig() {
  const jwt = process.env.PINATA_JWT
  const url = process.env.PINATA_URL || 'https://api.pinata.cloud'
  if (!jwt || jwt.trim() === '') {
    throw new Error('PINATA_JWT is missing')
  }
  return { jwt, url }
}

app.post('/api/ipfs/pin-file', upload.single('file'), async (req, res) => {
  try {
    const { jwt, url } = getPinataConfig()
    if (!req.file) return res.status(400).json({ error: 'Missing file' })

    const formData = new FormData()
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname)

    const ctl = withTimeout(25000)
    const response = await fetch(`${url}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: formData,
      signal: ctl.signal,
    })
    ctl.clear()

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: errText })
    }

    const data = await response.json()
    res.json({ cid: data.IpfsHash })
  } catch (e) {
    req.log?.error(e, 'pin_file_failed')
    res.status(500).json({ error: 'pin_file_failed' })
  }
})

const PinJsonSchema = z.object({
  content: z.any(),
  name: z.string().optional(),
})

app.post('/api/ipfs/pin-json', async (req, res) => {
  const parsed = PinJsonSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const { jwt, url } = getPinataConfig()
    const ctl = withTimeout(25000)

    const response = await fetch(`${url}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataMetadata: parsed.data.name ? { name: parsed.data.name } : undefined,
        pinataContent: parsed.data.content,
      }),
      signal: ctl.signal,
    })

    ctl.clear()

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: errText })
    }

    const data = await response.json()
    res.json({ cid: data.IpfsHash })
  } catch (e) {
    req.log?.error(e, 'pin_json_failed')
    res.status(500).json({ error: 'pin_json_failed' })
  }
})

app.delete('/api/ipfs/unpin/:cid', async (req, res) => {
  const cid = req.params.cid
  try {
    const { jwt, url } = getPinataConfig()
    const ctl = withTimeout(15000)
    const response = await fetch(`${url}/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
      signal: ctl.signal,
    })
    ctl.clear()

    res.json({ ok: response.ok })
  } catch (e) {
    req.log?.error(e, 'unpin_failed')
    res.status(500).json({ error: 'unpin_failed' })
  }
})

const PORT = Number(process.env.PORT || 3002)
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${PORT}`)
})
