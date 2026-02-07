import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createPublicClient, createWalletClient, http } from 'viem'
import { hederaTestnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
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

function normalizeAddress(address) {
  return String(address).toLowerCase()
}

function normalizeMirrorContractIdOrAddress(value) {
  const v = String(value).trim()
  if (v.startsWith('0x') || v.startsWith('0X')) return v.toLowerCase()
  return v
}

function getMirrorConfig() {
  const baseUrl = (process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com').replace(/\/$/, '')
  const contractsRaw = process.env.MIRROR_CONTRACTS || ''
  const contracts = contractsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeMirrorContractIdOrAddress)

  const pollIntervalMs = Number(process.env.MIRROR_POLL_INTERVAL_MS || 15000)
  const startTimestamp = (process.env.MIRROR_START_TIMESTAMP || '').trim()

  return { baseUrl, contracts, pollIntervalMs, startTimestamp }
}

function buildMirrorLogsUrl(baseUrl, contractIdOrAddress, cursor) {
  const url = new URL(`${baseUrl}/api/v1/contracts/${contractIdOrAddress}/results/logs`)
  url.searchParams.set('order', 'asc')
  url.searchParams.set('limit', '100')
  if (cursor?.nextTimestamp) {
    url.searchParams.set('timestamp', `gte:${cursor.nextTimestamp}`)
  }
  return url.toString()
}

async function getOrInitMirrorCursor(contractIdOrAddress) {
  const { startTimestamp } = getMirrorConfig()

  const existing = await prisma.mirrorSyncCursor.findUnique({
    where: { contractIdOrAddress },
  })
  if (existing) return existing

  const initialTimestamp = startTimestamp && startTimestamp !== '' ? startTimestamp : '0.0'
  return prisma.mirrorSyncCursor.create({
    data: {
      contractIdOrAddress,
      nextTimestamp: initialTimestamp,
      nextIndex: 0,
    },
  })
}

async function upsertMirrorCursor(contractIdOrAddress, nextTimestamp, nextIndex) {
  return prisma.mirrorSyncCursor.upsert({
    where: { contractIdOrAddress },
    update: { nextTimestamp, nextIndex },
    create: { contractIdOrAddress, nextTimestamp, nextIndex },
  })
}

function computeNextCursor(current, log) {
  const ts = String(log.timestamp)
  const idx = Number(log.index)

  if (!current || current.nextTimestamp !== ts) {
    return { nextTimestamp: ts, nextIndex: idx + 1 }
  }

  if (idx >= Number(current.nextIndex)) {
    return { nextTimestamp: ts, nextIndex: idx + 1 }
  }

  return current
}

async function syncMirrorContractOnce(contractIdOrAddress, reqLogger) {
  const { baseUrl } = getMirrorConfig()

  const cursor = await getOrInitMirrorCursor(contractIdOrAddress)
  let nextCursor = { nextTimestamp: cursor.nextTimestamp, nextIndex: cursor.nextIndex }

  let url = buildMirrorLogsUrl(baseUrl, contractIdOrAddress, cursor)
  let fetched = 0
  let stored = 0

  while (url) {
    const response = await fetch(url)
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`mirror_fetch_failed ${response.status} ${body}`)
    }

    const data = await response.json()
    const logs = Array.isArray(data?.logs) ? data.logs : []
    fetched += logs.length

    for (const log of logs) {
      const ts = String(log.timestamp)
      const idx = Number(log.index)

      if (ts === cursor.nextTimestamp && idx < Number(cursor.nextIndex)) {
        continue
      }

      const topics = Array.isArray(log?.topics) ? log.topics.map(String) : []

      try {
        await prisma.mirrorContractLog.create({
          data: {
            contractIdOrAddress,
            timestamp: ts,
            index: idx,
            transactionHash: log.transaction_hash ? String(log.transaction_hash) : null,
            transactionIndex: log.transaction_index !== undefined ? Number(log.transaction_index) : null,
            blockHash: log.block_hash ? String(log.block_hash) : null,
            blockNumber: log.block_number !== undefined ? Number(log.block_number) : null,
            rootContractId: log.root_contract_id ? String(log.root_contract_id) : null,
            address: log.address ? String(log.address) : null,
            bloom: log.bloom ? String(log.bloom) : null,
            data: log.data ? String(log.data) : null,
            topics,
            raw: log,
          },
        })
        stored += 1
      } catch (e) {
        if (e?.code !== 'P2002') throw e
      }

      nextCursor = computeNextCursor(nextCursor, log)
    }

    const nextPath = data?.links?.next
    if (typeof nextPath === 'string' && nextPath.trim() !== '') {
      url = nextPath.startsWith('http') ? nextPath : `${baseUrl}${nextPath}`
    } else {
      url = null
    }
  }

  if (
    nextCursor.nextTimestamp !== cursor.nextTimestamp ||
    Number(nextCursor.nextIndex) !== Number(cursor.nextIndex)
  ) {
    await upsertMirrorCursor(contractIdOrAddress, nextCursor.nextTimestamp, nextCursor.nextIndex)
  }

  reqLogger?.info?.({ contractIdOrAddress, fetched, stored, cursor: nextCursor }, 'mirror_sync_complete')
  return { contractIdOrAddress, fetched, stored, cursor: nextCursor }
}

let mirrorSyncRunning = false
async function runMirrorSyncCycle() {
  const { contracts } = getMirrorConfig()
  if (!contracts.length) return
  if (mirrorSyncRunning) return
  mirrorSyncRunning = true

  try {
    for (const contractIdOrAddress of contracts) {
      await syncMirrorContractOnce(contractIdOrAddress)
    }
  } finally {
    mirrorSyncRunning = false
  }
}

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok' })
  } catch (e) {
    req.log?.error(e, 'healthcheck_failed')
    res.status(503).json({ status: 'db_unavailable' })
  }
})

const MirrorQuerySchema = z.object({
  contractIdOrAddress: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  timestampGte: z.string().min(1).optional(),
  timestampLte: z.string().min(1).optional(),
})

app.get('/api/mirror/status', async (req, res) => {
  const { baseUrl, contracts, pollIntervalMs } = getMirrorConfig()

  const cursors = await prisma.mirrorSyncCursor.findMany({
    where: contracts.length ? { contractIdOrAddress: { in: contracts } } : undefined,
    orderBy: { contractIdOrAddress: 'asc' },
  })

  res.json({ baseUrl, pollIntervalMs, contracts, cursors })
})

app.get('/api/mirror/logs', async (req, res) => {
  const parsed = MirrorQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const q = parsed.data
  const contractIdOrAddress = q.contractIdOrAddress
    ? normalizeMirrorContractIdOrAddress(q.contractIdOrAddress)
    : undefined

  const where = {
    ...(contractIdOrAddress ? { contractIdOrAddress } : {}),
    ...(q.timestampGte || q.timestampLte
      ? {
          timestamp: {
            ...(q.timestampGte ? { gte: q.timestampGte } : {}),
            ...(q.timestampLte ? { lte: q.timestampLte } : {}),
          },
        }
      : {}),
  }

  const logs = await prisma.mirrorContractLog.findMany({
    where,
    orderBy: [{ timestamp: 'desc' }, { index: 'desc' }],
    take: q.limit ?? 50,
  })

  res.json(logs)
})

app.post('/api/mirror/sync', async (req, res) => {
  const apiKey = process.env.MIRROR_ADMIN_API_KEY
  if (apiKey && req.get('x-api-key') !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { contracts } = getMirrorConfig()
  const results = []
  for (const contractIdOrAddress of contracts) {
    results.push(await syncMirrorContractOnce(contractIdOrAddress, req.log))
  }
  res.json({ ok: true, results })
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

const CreateKycVerificationSchema = z.object({
  walletAddress: AddressSchema,
  provider: z.string().min(1).optional(),
  metadata: z.any().optional(),
})

app.post('/api/kyc/verifications', async (req, res) => {
  const parsed = CreateKycVerificationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const provider = (parsed.data.provider || process.env.KYC_PROVIDER || 'mock').trim()

  const created = await prisma.kycVerification.create({
    data: {
      walletAddress: normalizeAddress(parsed.data.walletAddress),
      provider,
      providerRef: provider === 'mock' ? `mock_${Date.now()}_${Math.random().toString(16).slice(2)}` : null,
      status: 'pending',
      metadata: parsed.data.metadata ?? null,
    },
  })

  res.status(201).json(created)
})

app.get('/api/kyc/verifications', async (req, res) => {
  const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress : undefined

  const where = {
    ...(walletAddress ? { walletAddress: normalizeAddress(walletAddress) } : {}),
  }

  const verifications = await prisma.kycVerification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json(verifications)
})

app.get('/api/kyc/verifications/:id', async (req, res) => {
  const id = req.params.id
  const record = await prisma.kycVerification.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json(record)
})

const MockKycDecisionSchema = z.object({
  status: z.enum(['in_review', 'approved', 'rejected', 'expired']),
})

app.post('/api/kyc/mock/:id/decision', async (req, res) => {
  const id = req.params.id
  const parsed = MockKycDecisionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const apiKey = process.env.KYC_ADMIN_API_KEY
  if (apiKey && req.get('x-api-key') !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = await prisma.kycVerification.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Not found' })
  if (record.provider !== 'mock') return res.status(400).json({ error: 'Not a mock verification' })

  const nextStatus = parsed.data.status
  const updated = await prisma.kycVerification.update({
    where: { id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'expired' ? new Date() : null,
    },
  })

  res.json(updated)
})

const KycWebhookSchema = z.object({
  eventId: z.string().optional(),
  verificationId: z.string().optional(),
  providerRef: z.string().optional(),
  status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'expired']).optional(),
  payload: z.any().optional(),
})

const DIDIT_STATUS_MAP = {
  approved: 'approved',
  success: 'approved',
  completed: 'approved',
  rejected: 'rejected',
  declined: 'rejected',
  expired: 'expired',
  pending: 'pending',
  in_review: 'in_review',
}

const DONATEONCHAIN_ABI = [
  {
    type: 'function',
    name: 'verifyAccount',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
  },
]

let kycWalletClient
let kycPublicClient
let kycAccount

function initKycClients() {
  if (kycWalletClient && kycPublicClient && kycAccount) return
  const privateKey = process.env.KYC_COMPLIANCE_PRIVATE_KEY
  if (!privateKey) return
  kycAccount = privateKeyToAccount(privateKey)
  const rpcUrl = process.env.KYC_CHAIN_RPC_URL || 'https://testnet.hashio.io/api'
  kycWalletClient = createWalletClient({
    account: kycAccount,
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
  kycPublicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
}

async function verifyAccountOnChain(walletAddress) {
  initKycClients()
  const contractAddress = process.env.DONATEONCHAIN_PROXY_ADDRESS
  if (!kycWalletClient || !kycPublicClient || !contractAddress) {
    return { skipped: true }
  }
  const txHash = await kycWalletClient.writeContract({
    address: contractAddress,
    abi: DONATEONCHAIN_ABI,
    functionName: 'verifyAccount',
    args: [walletAddress],
  })
  const receipt = await kycPublicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash, receipt }
}

app.post('/api/kyc/webhook/:provider', async (req, res) => {
  const provider = req.params.provider
  const secret = process.env.KYC_WEBHOOK_SECRET
  const diditSecret = process.env.DIDIT_WEBHOOK_SECRET
  const headerSecret = req.get('x-webhook-secret') || req.get('x-didit-webhook-secret')
  if (secret && headerSecret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (provider === 'didit' && diditSecret && headerSecret !== diditSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const parsed = KycWebhookSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const eventId = parsed.data.eventId
    const verificationId = parsed.data.verificationId
    const providerRef = parsed.data.providerRef
    const rawPayload = parsed.data.payload ?? req.body
    const diditCandidateId =
      rawPayload?.applicantId ||
      rawPayload?.verificationId ||
      rawPayload?.userId ||
      rawPayload?.data?.applicantId ||
      rawPayload?.data?.verificationId ||
      null
    const diditStatusRaw =
      rawPayload?.status ||
      rawPayload?.reviewStatus ||
      rawPayload?.result ||
      rawPayload?.data?.status ||
      rawPayload?.data?.reviewStatus ||
      rawPayload?.data?.result ||
      null
    const normalizedStatus = diditStatusRaw ? DIDIT_STATUS_MAP[String(diditStatusRaw).toLowerCase()] : null

    const stored = await prisma.kycWebhookEvent.create({
      data: {
        provider,
        eventId: eventId ?? null,
        verificationId: verificationId ?? diditCandidateId ?? null,
        payload: rawPayload,
      },
    })

    let targetVerification = null
    if (verificationId) {
      targetVerification = await prisma.kycVerification.findUnique({ where: { id: verificationId } })
    }
    if (!targetVerification && (providerRef || diditCandidateId)) {
      targetVerification = await prisma.kycVerification.findFirst({
        where: {
          provider,
          providerRef: providerRef ?? diditCandidateId ?? undefined,
        },
      })
    }

    if (targetVerification && (parsed.data.status || normalizedStatus)) {
      const nextStatus = parsed.data.status ?? normalizedStatus
      const updated = await prisma.kycVerification.update({
        where: { id: targetVerification.id },
        data: {
          status: nextStatus,
          completedAt:
            nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'expired'
              ? new Date()
              : null,
          providerRef: targetVerification.providerRef ?? providerRef ?? diditCandidateId ?? null,
        },
      })

      if (provider === 'didit' && nextStatus === 'approved') {
        try {
          const walletAddress = updated.walletAddress
          const chainResult = await verifyAccountOnChain(walletAddress)
          return res.json({ ok: true, id: stored.id, verification: updated, chainResult })
        } catch (chainError) {
          req.log?.error(chainError, 'kyc_chain_sync_failed')
          return res.json({ ok: true, id: stored.id, verification: updated, chainError: 'kyc_chain_sync_failed' })
        }
      }

      return res.json({ ok: true, id: stored.id, verification: updated })
    }

    res.json({ ok: true, id: stored.id })
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.json({ ok: true, duplicate: true })
    }
    req.log?.error(e, 'kyc_webhook_failed')
    res.status(500).json({ error: 'kyc_webhook_failed' })
  }
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

  const { contracts, pollIntervalMs } = getMirrorConfig()
  if (contracts.length) {
    setTimeout(() => {
      runMirrorSyncCycle().catch((e) => console.error('[mirror] sync cycle failed', e))
      setInterval(() => {
        runMirrorSyncCycle().catch((e) => console.error('[mirror] sync cycle failed', e))
      }, pollIntervalMs)
    }, 1000)
  }
})
