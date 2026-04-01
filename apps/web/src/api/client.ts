import type { ApiError } from '../types/api'

const DEFAULT_TIMEOUT_MS = 15000

export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error(
      'Missing required environment variable: VITE_API_URL. ' +
      'Set it in your .env file for local development or in the Cloudflare Pages ' +
      'dashboard (Settings → Environment variables) for production.'
    )
  }
  return url
}

export function getRelayerUrl(): string {
  const url = import.meta.env.VITE_RELAYER_API_URL
  if (!url) {
    throw new Error(
      'Missing required environment variable: VITE_RELAYER_API_URL. ' +
      'Set it in your .env file for local development or in the Cloudflare Pages ' +
      'dashboard (Settings → Environment variables) for production.'
    )
  }
  return url
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '')
  let message = text || `HTTP ${res.status}: ${res.statusText || 'An unexpected error occurred'}`
  let code: string | undefined
  try {
    const json = JSON.parse(text)
    if (json?.error) {
      if (typeof json.error === 'string') message = json.error
      else if (json.error?.message) message = json.error.message
      if (json.error?.code) code = json.error.code
    } else if (json?.message) {
      message = json.message
    }
  } catch {
    // Response body is not JSON; use raw text as the message
  }
  return { message, status: res.status, code }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  timeout?: number
  body?: unknown
}

export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT_MS, body, ...init } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  }
  if (body !== undefined && typeof body === 'object' && !(body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const err = await parseErrorResponse(res)
      throw Object.assign(new Error(err.message), err) as Error & ApiError
    }

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return (await res.json()) as T
    }
    return undefined as T
  } catch (e) {
    clearTimeout(timeoutId)
    if ((e as Error).name === 'AbortError') {
      const err: ApiError = {
        message: `Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. The server did not respond in time.`,
        status: 408,
        code: 'REQUEST_TIMEOUT',
      }
      throw Object.assign(new Error(err.message), err) as Error & ApiError
    }
    throw e
  }
}

export function apiPath(path: string): string {
  const base = getApiUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
