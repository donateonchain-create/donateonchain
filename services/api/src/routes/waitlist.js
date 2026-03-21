import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAdminApiKey } from '../middleware/admin.js'

const router = express.Router()

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

router.post('/waitlist', async (req, res) => {
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

router.get('/admin/waitlist', requireAdminApiKey, async (req, res) => {
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

router.get('/admin/waitlist/export', requireAdminApiKey, async (req, res) => {
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

export default router
