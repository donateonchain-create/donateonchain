import { request, apiPath } from './client'

// ── Types ──────────────────────────────────────────────────────────────

export interface NonceResponse {
  walletAddress: string
  nonce: string
  expiresAt: string
  message: string
}

export interface VerifyResponse {
  ok: boolean
  token: string
  user: {
    walletAddress: string
    roles: string[]
  }
}

// ── Token Storage ──────────────────────────────────────────────────────

const TOKEN_KEY = 'doc_auth_token'
const WALLET_KEY = 'doc_auth_wallet'

let memoryToken: string | null = null

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getAuthWallet(): string | null {
  try {
    return sessionStorage.getItem(WALLET_KEY)
  } catch {
    return null
  }
}

function storeAuth(token: string, walletAddress: string) {
  memoryToken = token
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(WALLET_KEY, walletAddress.toLowerCase())
  } catch {
    // sessionStorage may be unavailable (e.g. private browsing)
  }
}

export function clearAuth() {
  memoryToken = null
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(WALLET_KEY)
  } catch {
    // ignore
  }
}

// ── Auth API ───────────────────────────────────────────────────────────

/** Step 1: Request a one-time nonce from the backend */
export async function requestNonce(walletAddress: string): Promise<NonceResponse> {
  return request<NonceResponse>(apiPath('/api/auth/nonce'), {
    method: 'POST',
    body: { walletAddress: walletAddress.toLowerCase() },
  })
}

/**
 * Step 2: Send the wallet-signed message + nonce to the backend.
 * On success the JWT is stored and returned.
 */
export async function verifySignature(
  walletAddress: string,
  nonce: string,
  signature: string
): Promise<VerifyResponse> {
  const res = await request<VerifyResponse>(apiPath('/api/auth/verify'), {
    method: 'POST',
    body: {
      walletAddress: walletAddress.toLowerCase(),
      nonce,
      signature,
    },
  })

  if (res.ok && res.token) {
    storeAuth(res.token, walletAddress)
  }

  return res
}

/**
 * Build auth headers to attach to protected requests.
 * Returns `Authorization: Bearer <jwt>` when authenticated,
 * otherwise falls back to the legacy Admin API Key.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY
  if (adminApiKey) {
    headers['x-api-key'] = adminApiKey
  }
  return headers
}
