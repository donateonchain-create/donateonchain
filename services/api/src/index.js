import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createPublicClient, createWalletClient, decodeEventLog, http, keccak256, stringToHex } from 'viem'
import { hederaTestnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import multer from 'multer'
import pinoHttp from 'pino-http'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const app = express()
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean)
const allowAllOrigins = corsOrigins.length === 0 || corsOrigins.includes('*')
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowAllOrigins) return callback(null, true)
      if (!origin) return callback(null, true)
      if (corsOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('CORS blocked'))
    },
  })
)
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  })
)
app.use(pinoHttp())

const upload = multer({ storage: multer.memoryStorage() })

const adminApiKey = process.env.KYC_ADMIN_API_KEY

function requireAdminApiKey(req, res, next) {
  if (adminApiKey && !timingSafeEqualString(req.get('x-api-key'), adminApiKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

const rateLimitWindowMs = Number(process.env.KYC_RATE_LIMIT_WINDOW_MS || 60000)
const rateLimitMax = Number(process.env.KYC_RATE_LIMIT_MAX || 30)
const kycRateLimits = new Map()

function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for')
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function kycRateLimit(req, res, next) {
  const now = Date.now()
  const ip = getClientIp(req)
  const entry = kycRateLimits.get(ip)
  if (!entry || now - entry.start > rateLimitWindowMs) {
    kycRateLimits.set(ip, { start: now, count: 1 })
    return next()
  }
  if (entry.count >= rateLimitMax) {
    return res.status(429).json({ error: 'rate_limited' })
  }
  entry.count += 1
  kycRateLimits.set(ip, entry)
  return next()
}

const AdminKycUpdateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'expired']),
  triggerOnChain: z.boolean().optional(),
})

app.post('/api/kyc/verifications/:id/admin-update', async (req, res) => {
  const apiKey = process.env.KYC_ADMIN_API_KEY
  if (apiKey && req.get('x-api-key') !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

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
      completedAt:
        nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'expired' ? new Date() : null,
    },
  })

  if (parsed.data.triggerOnChain && nextStatus === 'approved') {
    try {
      const chainResult = await verifyAccountOnChain(updated.walletAddress)
      return res.json({ ok: true, verification: updated, chainResult })
    } catch (chainError) {
      req.log?.error(chainError, 'kyc_chain_sync_failed')
      return res.json({ ok: true, verification: updated, chainError: 'kyc_chain_sync_failed' })
    }
  }

  res.json({ ok: true, verification: updated })
})

function normalizeAddress(address) {
  return String(address).toLowerCase()
}

function normalizeMirrorContractIdOrAddress(value) {
  const v = String(value).trim()
  if (v.startsWith('0x') || v.startsWith('0X')) return v.toLowerCase()
  return v
}

function timingSafeEqualString(input, expected) {
  if (!input || !expected) return false
  const inputBuf = Buffer.from(String(input))
  const expectedBuf = Buffer.from(String(expected))
  if (inputBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(inputBuf, expectedBuf)
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

const CAMPAIGN_CREATED_EVENT_ABI = [
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'ngo', type: 'address', indexed: true },
      { name: 'designer', type: 'address', indexed: true },
      { name: 'targetAmount', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
]

const CAMPAIGN_CREATED_REGISTRY_EVENT_ABI = [
  {
    type: 'event',
    name: 'CampaignCreated',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'ngo', type: 'address', indexed: true },
      { name: 'designer', type: 'address', indexed: true },
      { name: 'ngoShareBps', type: 'uint256', indexed: false },
      { name: 'designerShareBps', type: 'uint256', indexed: false },
      { name: 'platformShareBps', type: 'uint256', indexed: false },
      { name: 'metadataFileHash', type: 'bytes32', indexed: false },
      { name: 'createdBy', type: 'address', indexed: false },
    ],
  },
]

const CAMPAIGN_VETTED_EVENT_ABI = [
  {
    type: 'event',
    name: 'CampaignVetted',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'approved', type: 'bool', indexed: false },
      { name: 'vettedBy', type: 'address', indexed: true },
    ],
  },
]

const FUNDS_CLAIMED_EVENT_ABI = [
  {
    type: 'event',
    name: 'FundsClaimed',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'ngo', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
]

const DONATION_MADE_EVENT_ABI = [
  {
    type: 'event',
    name: 'DonationMade',
    inputs: [
      { name: 'donor', type: 'address', indexed: true },
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'nftSerialNumber', type: 'uint256', indexed: false },
    ],
  },
]

const DONATION_MADE_MANAGER_EVENT_ABI = [
  {
    type: 'event',
    name: 'DonationMade',
    inputs: [
      { name: 'donor', type: 'address', indexed: true },
      { name: 'campaignId', type: 'uint256', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'ngoAmount', type: 'uint256', indexed: false },
      { name: 'designerAmount', type: 'uint256', indexed: false },
      { name: 'platformAmount', type: 'uint256', indexed: false },
      { name: 'ngoRecipient', type: 'address', indexed: true },
      { name: 'designerRecipient', type: 'address', indexed: false },
      { name: 'platformRecipient', type: 'address', indexed: false },
      { name: 'nftSerialNumber', type: 'uint256', indexed: false },
    ],
  },
]

async function upsertNgo(address) {
  if (!address) return
  await prisma.ngo.upsert({
    where: { address: address.toLowerCase() },
    update: {},
    create: { address: address.toLowerCase() },
  })
}

async function upsertCampaignBase({ id, ngoAddress, designerAddress, targetAmount, deadline }) {
  const safeNgo = ngoAddress ? ngoAddress.toLowerCase() : 'unknown'
  await prisma.campaign.upsert({
    where: { id },
    update: {
      ngoAddress: safeNgo,
      designerAddress: designerAddress ? designerAddress.toLowerCase() : null,
      targetAmount: targetAmount ?? '0',
      deadline: deadline ?? '0',
    },
    create: {
      id,
      ngoAddress: safeNgo,
      designerAddress: designerAddress ? designerAddress.toLowerCase() : null,
      targetAmount: targetAmount ?? '0',
      deadline: deadline ?? '0',
    },
  })
}

async function recordDonation({ campaignId, donor, amount, txHash }) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.campaign.findUnique({ where: { id: campaignId } })
    const previousRaised = existing?.raisedAmount ? BigInt(existing.raisedAmount) : 0n
    const nextRaised = previousRaised + BigInt(amount)

    await tx.campaign.upsert({
      where: { id: campaignId },
      update: { raisedAmount: nextRaised.toString() },
      create: {
        id: campaignId,
        ngoAddress: existing?.ngoAddress ?? 'unknown',
        targetAmount: existing?.targetAmount ?? '0',
        deadline: existing?.deadline ?? '0',
        raisedAmount: nextRaised.toString(),
      },
    })

    await tx.donationEvent.create({
      data: {
        campaignId,
        donor: donor.toLowerCase(),
        amount: amount.toString(),
        txHash: txHash ?? null,
      },
    })
  })
}

async function handleMirrorEvent(log) {
  if (!log?.topics || !log?.data) return

  const payload = { data: String(log.data), topics: log.topics.map(String) }
  const txHash = log.transaction_hash ? String(log.transaction_hash) : null

  const decodeWith = (abi) => decodeEventLog({ abi, data: payload.data, topics: payload.topics })

  try {
    const decoded = decodeWith(CAMPAIGN_CREATED_EVENT_ABI)
    if (decoded.eventName === 'CampaignCreated') {
      const campaignId = String(decoded.args.campaignId)
      const ngo = decoded.args.ngo
      const designer = decoded.args.designer
      const targetAmount = decoded.args.targetAmount ? String(decoded.args.targetAmount) : '0'
      const deadline = decoded.args.deadline ? String(decoded.args.deadline) : '0'
      await upsertNgo(ngo)
      await upsertCampaignBase({ id: campaignId, ngoAddress: ngo, designerAddress: designer, targetAmount, deadline })
      return
    }
  } catch {}

  try {
    const decoded = decodeWith(CAMPAIGN_CREATED_REGISTRY_EVENT_ABI)
    if (decoded.eventName === 'CampaignCreated') {
      const campaignId = String(decoded.args.campaignId)
      const ngo = decoded.args.ngo
      const designer = decoded.args.designer
      await upsertNgo(ngo)
      await upsertCampaignBase({ id: campaignId, ngoAddress: ngo, designerAddress: designer, targetAmount: '0', deadline: '0' })
      return
    }
  } catch {}

  try {
    const decoded = decodeWith(CAMPAIGN_VETTED_EVENT_ABI)
    if (decoded.eventName === 'CampaignVetted') {
      const campaignId = String(decoded.args.campaignId)
      const approved = Boolean(decoded.args.approved)
      await prisma.campaign.upsert({
        where: { id: campaignId },
        update: { vettedApproved: approved },
        create: {
          id: campaignId,
          ngoAddress: 'unknown',
          targetAmount: '0',
          deadline: '0',
          vettedApproved: approved,
        },
      })
      return
    }
  } catch {}

  try {
    const decoded = decodeWith(FUNDS_CLAIMED_EVENT_ABI)
    if (decoded.eventName === 'FundsClaimed') {
      const campaignId = String(decoded.args.campaignId)
      const ngo = decoded.args.ngo
      await upsertNgo(ngo)
      await prisma.campaign.upsert({
        where: { id: campaignId },
        update: { ngoAddress: ngo ? ngo.toLowerCase() : 'unknown' },
        create: {
          id: campaignId,
          ngoAddress: ngo ? ngo.toLowerCase() : 'unknown',
          targetAmount: '0',
          deadline: '0',
        },
      })
      return
    }
  } catch {}

  try {
    const decoded = decodeWith(DONATION_MADE_EVENT_ABI)
    if (decoded.eventName === 'DonationMade') {
      const campaignId = String(decoded.args.campaignId)
      const donor = String(decoded.args.donor)
      const amount = decoded.args.amount ? String(decoded.args.amount) : '0'
      await recordDonation({ campaignId, donor, amount, txHash })
    }
  } catch {}

  try {
    const decoded = decodeWith(DONATION_MADE_MANAGER_EVENT_ABI)
    if (decoded.eventName === 'DonationMade') {
      const campaignId = String(decoded.args.campaignId)
      const donor = String(decoded.args.donor)
      const amount = decoded.args.totalAmount ? String(decoded.args.totalAmount) : '0'
      await recordDonation({ campaignId, donor, amount, txHash })
    }
  } catch {}
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
        await handleMirrorEvent(log)
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
    await Promise.all(contracts.map((contractIdOrAddress) => syncMirrorContractOnce(contractIdOrAddress)))
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

const VerifyHashSchema = z.object({
  cid: z.string().min(1),
  expectedHash: z.string().min(1).optional(),
  hashType: z.enum(['sha256', 'keccak256']).optional(),
})

app.post('/api/verify-hash', async (req, res) => {
  const parsed = VerifyHashSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  try {
    const { cid, expectedHash, hashType } = parsed.data
    const { buf, url } = await fetchIpfsBytes(cid)

    const sha256 = createHash('sha256').update(buf).digest('hex')
    const keccak = keccak256(stringToHex(buf))
    const cidKeccak = keccak256(stringToHex(cid))

    let matched = null
    if (expectedHash) {
      const target = expectedHash.toLowerCase()
      const resultHash = (hashType === 'keccak256' ? keccak : sha256).toLowerCase()
      matched = resultHash === target
    }

    res.json({
      cid,
      url,
      hashes: {
        sha256,
        keccak256: keccak,
        cidKeccak256: cidKeccak,
      },
      matched,
    })
  } catch (e) {
    req.log?.error(e, 'verify_hash_failed')
    res.status(500).json({ error: 'verify_hash_failed' })
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

const CampaignQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  ngoAddress: z.string().min(3).optional(),
  designerAddress: z.string().min(3).optional(),
  vettedApproved: z.coerce.boolean().optional(),
})

app.get('/api/campaigns', async (req, res) => {
  const parsed = CampaignQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { page = 1, limit = 20, ngoAddress, designerAddress, vettedApproved } = parsed.data
  const where = {
    ...(ngoAddress ? { ngoAddress: ngoAddress.toLowerCase() } : {}),
    ...(designerAddress ? { designerAddress: designerAddress.toLowerCase() } : {}),
    ...(vettedApproved === undefined ? {} : { vettedApproved }),
  }

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ])

  res.json({ page, limit, total, items })
})

const WaitlistCreateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email(),
  role: z.string().min(1).max(80).optional(),
  source: z.string().min(1).max(120).optional(),
  metadata: z.any().optional(),
})

const WaitlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
})

app.post('/api/waitlist', async (req, res) => {
  const parsed = WaitlistCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const data = parsed.data
  const created = await prisma.waitlistEntry.upsert({
    where: { email: data.email.toLowerCase() },
    update: {
      name: data.name ?? undefined,
      role: data.role ?? undefined,
      source: data.source ?? undefined,
      metadata: data.metadata ?? undefined,
    },
    create: {
      name: data.name ?? null,
      email: data.email.toLowerCase(),
      role: data.role ?? null,
      source: data.source ?? null,
      metadata: data.metadata ?? null,
    },
  })

  res.status(201).json({ id: created.id, email: created.email })
})

app.get('/api/admin/waitlist', requireAdminApiKey, async (req, res) => {
  const parsed = WaitlistQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { page = 1, limit = 50, email, role } = parsed.data
  const where = {
    ...(email ? { email: email.toLowerCase() } : {}),
    ...(role ? { role } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.waitlistEntry.count({ where }),
  ])

  res.json({ page, limit, total, items })
})

app.get('/api/admin/waitlist/export', requireAdminApiKey, async (req, res) => {
  const entries = await prisma.waitlistEntry.findMany({ orderBy: { createdAt: 'desc' } })
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"')

  const header = 'id,name,email,role,source,createdAt\n'
  const rows = entries
    .map((entry) => {
      const cells = [entry.id, entry.name ?? '', entry.email, entry.role ?? '', entry.source ?? '', entry.createdAt.toISOString()]
      return cells.map((cell) => String(cell).replace(/"/g, '""')).map((cell) => `"${cell}"`).join(',')
    })
    .join('\n')

  res.send(`${header}${rows}`)
})

app.get('/api/campaigns/:id', async (req, res) => {
  const id = req.params.id
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign) return res.status(404).json({ error: 'Not found' })

  const [donationCount, donationTotal] = await Promise.all([
    prisma.donationEvent.count({ where: { campaignId: id } }),
    prisma.donationEvent.aggregate({
      where: { campaignId: id },
      _sum: { amount: true },
    }),
  ])

  res.json({
    ...campaign,
    donationCount,
    donationTotal: donationTotal._sum.amount ?? '0',
  })
})

app.post('/api/campaigns/sync-states', requireAdminApiKey, async (req, res) => {
  const result = await runCampaignStateSync(req.log)
  res.json({ ok: true, ...result })
})

app.get('/api/donations/:campaignId', async (req, res) => {
  const campaignId = req.params.campaignId
  const limit = Number(req.query.limit || 50)
  const donations = await prisma.donationEvent.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 200),
  })
  res.json(donations)
})

app.post('/api/mirror/sync', async (req, res) => {
  const apiKey = process.env.MIRROR_ADMIN_API_KEY
  if (apiKey && !timingSafeEqualString(req.get('x-api-key'), apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { contracts } = getMirrorConfig()
  const results = await Promise.all(
    contracts.map((contractIdOrAddress) => syncMirrorContractOnce(contractIdOrAddress, req.log))
  )
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
  const page = Number(req.query.page || 1)
  const limit = Math.min(Number(req.query.limit || 20), 100)

  const where = buyer ? { buyer: buyer.toLowerCase() } : {}

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  res.json({ page, limit, total, items })
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
  const page = Number(req.query.page || 1)
  const limit = Math.min(Number(req.query.limit || 20), 100)

  const where = {
    ...(donorAddress ? { donorAddress: donorAddress.toLowerCase() } : {}),
    ...(campaignId ? { campaignId: String(campaignId) } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.donation.count({ where }),
  ])

  res.json({ page, limit, total, items })
})

const CreateKycVerificationSchema = z.object({
  walletAddress: AddressSchema,
  provider: z.string().min(1).optional(),
  metadata: z.any().optional(),
})

app.post('/api/kyc/verifications', kycRateLimit, async (req, res) => {
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
  const page = Number(req.query.page || 1)
  const limit = Math.min(Number(req.query.limit || 20), 100)

  const where = {
    ...(walletAddress ? { walletAddress: normalizeAddress(walletAddress) } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.kycVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kycVerification.count({ where }),
  ])

  res.json({ page, limit, total, items })
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

app.get('/api/kyc/health', async (req, res) => {
  const config = {
    provider: process.env.KYC_PROVIDER || 'mock',
    webhookSecretSet: Boolean(process.env.KYC_WEBHOOK_SECRET || process.env.DIDIT_WEBHOOK_SECRET),
    onchainConfigured: Boolean(process.env.KYC_COMPLIANCE_PRIVATE_KEY && process.env.DONATEONCHAIN_PROXY_ADDRESS),
    rpcUrl: process.env.KYC_CHAIN_RPC_URL || 'https://testnet.hashio.io/api',
  }

  const lastVerification = await prisma.kycVerification.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    status: 'ok',
    config,
    lastVerification,
  })
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
  eventId: z.union([z.string(), z.number()]).optional(),
  verificationId: z.union([z.string(), z.number()]).optional(),
  providerRef: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  payload: z.any().optional(),
}).passthrough()

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
  {
    type: 'function',
    name: 'updateCampaignState',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
  },
]

function getKycClients() {
  const privateKey = process.env.KYC_COMPLIANCE_PRIVATE_KEY
  if (!privateKey) return null
  const rpcUrl = process.env.KYC_CHAIN_RPC_URL || 'https://testnet.hashio.io/api'
  const account = privateKeyToAccount(privateKey)
  const walletClient = createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
  return { walletClient, publicClient }
}

async function verifyAccountOnChain(walletAddress) {
  const contractAddress = process.env.DONATEONCHAIN_PROXY_ADDRESS
  const clients = getKycClients()
  if (!clients || !contractAddress) {
    return { skipped: true }
  }
  const { walletClient, publicClient } = clients
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: DONATEONCHAIN_ABI,
    functionName: 'verifyAccount',
    args: [walletAddress],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash, receipt }
}

function getCampaignSyncClients() {
  const privateKey = process.env.CAMPAIGN_SYNC_PRIVATE_KEY
  if (!privateKey) return null
  const rpcUrl = process.env.CAMPAIGN_SYNC_RPC_URL || process.env.KYC_CHAIN_RPC_URL || 'https://testnet.hashio.io/api'
  const account = privateKeyToAccount(privateKey)
  const walletClient = createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(rpcUrl),
  })
  return { walletClient, publicClient }
}

async function updateCampaignStateOnChain(campaignId) {
  const contractAddress = process.env.DONATEONCHAIN_PROXY_ADDRESS
  const clients = getCampaignSyncClients()
  if (!clients || !contractAddress) return { skipped: true }
  const { walletClient, publicClient } = clients
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: DONATEONCHAIN_ABI,
    functionName: 'updateCampaignState',
    args: [BigInt(campaignId)],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash, receipt }
}

async function runCampaignStateSync(reqLogger) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const campaigns = await prisma.campaign.findMany({
    where: { deadline: { lt: String(nowSeconds) } },
    select: { id: true },
  })

  const results = []
  for (const campaign of campaigns) {
    try {
      const result = await updateCampaignStateOnChain(campaign.id)
      results.push({ id: campaign.id, ...result })
    } catch (e) {
      reqLogger?.error?.(e, 'campaign_state_sync_failed')
      results.push({ id: campaign.id, error: 'campaign_state_sync_failed' })
    }
  }

  return { total: campaigns.length, results }
}

app.post('/api/kyc/webhook/:provider', async (req, res) => {
  const provider = req.params.provider
  const secret = process.env.KYC_WEBHOOK_SECRET
  const diditSecret = process.env.DIDIT_WEBHOOK_SECRET
  const headerSecret = req.get('x-webhook-secret') || req.get('x-didit-webhook-secret')
  if (secret && !timingSafeEqualString(headerSecret, secret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (provider === 'didit' && diditSecret && !timingSafeEqualString(headerSecret, diditSecret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const signature = req.get('x-webhook-signature')
  const timestamp = req.get('x-webhook-timestamp')
  const tolerance = Number(process.env.KYC_WEBHOOK_TOLERANCE_SEC || 300)
  const webhookSecret = (provider === 'didit' ? diditSecret : secret) || ''
  if (signature && timestamp && webhookSecret) {
    const now = Math.floor(Date.now() / 1000)
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {})
    const expected = createHmac('sha256', webhookSecret).update(`${ts}.${rawBody}`).digest('hex')
    if (!timingSafeEqualString(signature, expected)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const parsed = KycWebhookSchema.safeParse(req.body)
  const payload = parsed.success ? parsed.data : { payload: req.body }

  try {
    const eventId = parsed.success ? payload.eventId : null
    const verificationId = parsed.success ? payload.verificationId : null
    const providerRef = parsed.success ? payload.providerRef : null
    const rawPayload = payload.payload ?? req.body
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

    const parsedStatus = parsed.success && payload.status ? DIDIT_STATUS_MAP[String(payload.status).toLowerCase()] : null
    if (targetVerification && (parsedStatus || normalizedStatus)) {
      const nextStatus = parsedStatus ?? normalizedStatus
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

app.put('/api/design-index/:designId', requireAdminApiKey, async (req, res) => {
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

app.put('/api/kv/:collection/:key', requireAdminApiKey, async (req, res) => {
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

app.get('/api/kv/:collection/:key', requireAdminApiKey, async (req, res) => {
  const collection = req.params.collection
  const key = req.params.key

  const record = await prisma.kvDocument.findUnique({
    where: { collection_key: { collection, key } },
  })

  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json({ key: record.key, data: record.data })
})

app.get('/api/kv/:collection', requireAdminApiKey, async (req, res) => {
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

app.delete('/api/kv/:collection/:key', requireAdminApiKey, async (req, res) => {
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

function getIpfsGateway() {
  return (process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs').replace(/\/+$/, '')
}

async function fetchIpfsBytes(cid) {
  const gateway = getIpfsGateway()
  const url = `${gateway}/${cid}`
  const ctl = withTimeout(25000)
  const response = await fetch(url, { signal: ctl.signal })
  ctl.clear()
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`ipfs_fetch_failed ${response.status} ${body}`)
  }
  const buf = Buffer.from(await response.arrayBuffer())
  return { buf, url }
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

app.use((err, req, res, _next) => {
  req.log?.error(err, 'unhandled_error')
  res.status(500).json({ error: 'internal_error' })
})

const PORT = Number(process.env.PORT || 3002)
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${PORT}`)

  const { contracts, pollIntervalMs } = getMirrorConfig()
  if (contracts.length) {
    const loop = async () => {
      try {
        await runMirrorSyncCycle()
      } catch (e) {
        console.error('[mirror] sync cycle failed', e)
      } finally {
        setTimeout(loop, pollIntervalMs)
      }
    }

    setTimeout(loop, 1000)
  }

  const campaignSyncInterval = Number(process.env.CAMPAIGN_SYNC_INTERVAL_MS || 3600000)
  if (campaignSyncInterval > 0) {
    setTimeout(() => {
      runCampaignStateSync().catch((e) => console.error('[campaign-sync] failed', e))
      setInterval(() => {
        runCampaignStateSync().catch((e) => console.error('[campaign-sync] failed', e))
      }, campaignSyncInterval)
    }, 2000)
  }
})
