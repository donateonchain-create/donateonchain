export function getStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getStorageString(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}
