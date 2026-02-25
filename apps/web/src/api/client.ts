import type { ApiError } from '../types/api'

const DEFAULT_TIMEOUT_MS = 15000

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3002'
}

export function getRelayerUrl(): string {
  return import.meta.env.VITE_RELAYER_API_URL || 'http://localhost:3001'
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '')
  let message = text || `Request failed: ${res.status}`
  let code: string | undefined
  try {
    const json = JSON.parse(text)
    if (json?.error) {
      if (typeof json.error === 'string') message = json.error
      else if (json.error?.message) message = json.error.message
      if (json.error?.code) code = json.error.code
    }
  } catch {
    // keep message as text
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
      const err: ApiError = { message: 'Request timed out', status: 408 }
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
