import * as ipfsApi from '../api/ipfs'

const isDev = import.meta.env.DEV

export const uploadFileToIPFS = async (file: File): Promise<string | null> => {
  try {
    const { cid } = await ipfsApi.pinFile(file)
    return cid ?? null
  } catch (error) {
    if (isDev) {
      console.error('Error uploading file to IPFS:', error)
    }
    return null
  }
}

export const uploadMetadataToIPFS = async (metadata: any): Promise<string | null> => {
  try {
    const { cid } = await ipfsApi.pinJson(metadata, 'NGO-Metadata')
    return cid ?? null
  } catch (error) {
    if (isDev) {
      console.error('Error uploading metadata to IPFS:', error)
    }
    return null
  }
}

export const getIPFSHash = async (content: string | File): Promise<string | null> => {
  try {
    if (content instanceof File) {
      return await uploadFileToIPFS(content)
    }
    const metadata = typeof content === 'string' ? JSON.parse(content) : content
    return await uploadMetadataToIPFS(metadata)
  } catch (error) {
    if (isDev) {
      console.error('Error getting IPFS hash:', error)
    }
    return null
  }
}

const IPFS_GATEWAY = (import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs').replace(/\/$/, '')

export const getIPFSURL = (hash: string): string => {
  return `${IPFS_GATEWAY}/${hash}`
}

export const unpinCID = async (cid: string): Promise<boolean> => {
  try {
    const { ok } = await ipfsApi.unpin(cid)
    return Boolean(ok)
  } catch (e) {
    if (isDev) {
      console.error('Failed to unpin CID:', cid, e)
    }
    return false
  }
}
