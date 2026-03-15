import { apiPath, request } from '../api/client'

const WAITLIST_OFFLINE_KEY = 'waitlist_offline_queue'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

type WaitlistOfflineEntry = {
  email: string
  role?: string
  timestamp: number
}

const readOfflineQueue = (): WaitlistOfflineEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(WAITLIST_OFFLINE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.email === 'string')
      .map((item) => ({
        email: normalizeEmail(item.email),
        role: typeof item.role === 'string' ? item.role : undefined,
        timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
      }))
  } catch {
    return []
  }
}

const writeOfflineQueue = (queue: WaitlistOfflineEntry[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WAITLIST_OFFLINE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

const enqueueOfflineWaitlistEntry = (email: string, role?: string) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return
  const current = readOfflineQueue()
  current.push({
    email: normalizedEmail,
    role,
    timestamp: Date.now(),
  })
  writeOfflineQueue(current)
}

const submitWaitlistToBackend = async (email: string, role: string) => {
  const body = {
    email: normalizeEmail(email),
    role,
    source: 'waitlist-landing',
  }
  await request(apiPath('/api/waitlist'), {
    method: 'POST',
    body,
  })
}

export const saveWaitlistEntry = async (email: string, role: string) => {
  try {
    await submitWaitlistToBackend(email, role)
    return { status: 'saved' as const }
  } catch {
    enqueueOfflineWaitlistEntry(email, role)
    return { status: 'queued' as const }
  }
}

export const flushOfflineWaitlistQueue = async () => {
  if (typeof window === 'undefined') return
  if (!navigator.onLine) return

  const queue = readOfflineQueue()
  if (!queue.length) return

  const remaining: WaitlistOfflineEntry[] = []

  for (const entry of queue) {
    if (!entry.email) continue
    try {
      await submitWaitlistToBackend(entry.email, entry.role || '')
    } catch {
      remaining.push(entry)
    }
  }

  writeOfflineQueue(remaining)
}
