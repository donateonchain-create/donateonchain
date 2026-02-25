import { request, apiPath } from './client'

const IPFS_TIMEOUT_MS = 25000

export async function pinFile(file: File): Promise<{ cid: string }> {
  const formData = new FormData()
  formData.append('file', file)
  return request(apiPath('/api/ipfs/pin-file'), {
    method: 'POST',
    body: formData,
    timeout: IPFS_TIMEOUT_MS,
  })
}

export async function pinJson(
  content: unknown,
  name?: string
): Promise<{ cid: string }> {
  return request(apiPath('/api/ipfs/pin-json'), {
    method: 'POST',
    body: { content, name },
    timeout: IPFS_TIMEOUT_MS,
  })
}

export async function unpin(cid: string): Promise<{ ok: boolean }> {
  return request(apiPath(`/api/ipfs/unpin/${encodeURIComponent(cid)}`), {
    method: 'DELETE',
    timeout: 15000,
  })
}
