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

export function setStorageJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

export function userProfileLocalKey(address: string) {
  return `doc_userProfile_${address.toLowerCase()}`
}

export function profileSetupDoneKey(address: string) {
  return `doc_profileSetupDone_${address.toLowerCase()}`
}

export function getStorageString(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}
