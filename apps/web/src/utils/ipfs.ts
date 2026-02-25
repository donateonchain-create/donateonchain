const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const isDev = import.meta.env.DEV

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

export const uploadFileToIPFS = async (file: File): Promise<string | null> => {
  try {
    const ctl = withTimeout(25000)
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/api/ipfs/pin-file`, {
      method: 'POST',
      body: formData,
      signal: ctl.signal,
    })
    ctl.clear()

    if (!response.ok) {
      const error = await response.text()
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error('IPFS upload error:', error)
      }
      return null
    }

    const data = await response.json()
    return data.cid
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error uploading file to IPFS:', error)
    }
    return null
  }
}

export const uploadMetadataToIPFS = async (metadata: any): Promise<string | null> => {
  try {
    const ctl = withTimeout(25000)
    const response = await fetch(`${API_URL}/api/ipfs/pin-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: metadata, name: 'NGO-Metadata' }),
      signal: ctl.signal,
    })
    ctl.clear()

    if (!response.ok) {
      const error = await response.text()
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error('IPFS metadata upload error:', error)
      }
      return null
    }

    const data = await response.json()
    return data.cid
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error uploading metadata to IPFS:', error)
    }
    return null
  }
}

export const getIPFSHash = async (content: string | File): Promise<string | null> => {
  try {
    if (content instanceof File) {
      return await uploadFileToIPFS(content)
    } else {
      const metadata = typeof content === 'string' ? JSON.parse(content) : content
      return await uploadMetadataToIPFS(metadata)
    }
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting IPFS hash:', error)
    }
    return null
  }
}

export const getIPFSURL = (hash: string): string => {
  return `https://gateway.pinata.cloud/ipfs/${hash}`
}

export const unpinCID = async (cid: string): Promise<boolean> => {
  try {
    const ctl = withTimeout(15000)
    const res = await fetch(`${API_URL}/api/ipfs/unpin/${cid}`, {
      method: 'DELETE',
      signal: ctl.signal,
    })
    ctl.clear()
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.ok)
  } catch (e) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Failed to unpin CID:', cid, e)
    }
    return false
  }
}
