import { getDesignIndex as getDesignIndexFromApi } from '../api/designIndex'
import { getCampaignMetadataCid } from '../onchain/adapter'
import { getStorageJson } from './safeStorage'
import { getIPFSURL, unpinCID, uploadFileToIPFS } from './ipfs'
import { getAuthHeaders } from '../api/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const isDev = import.meta.env.DEV

// For public reads — no auth headers attached
async function apiJsonRead(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

// For authenticated writes — attaches JWT Bearer or Admin API Key
async function apiJsonWrite(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  const authHeaders = getAuthHeaders()
  for (const [k, v] of Object.entries(authHeaders)) {
    headers.set(k, v)
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function kvSet(collectionName: string, key: string, data: any) {
  return apiJsonWrite(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
}

async function kvGet(collectionName: string, key: string) {
  return apiJsonRead(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, {
    method: 'GET',
  })
}

async function kvList(collectionName: string) {
  return apiJsonRead(`/api/kv/${encodeURIComponent(collectionName)}`, { method: 'GET' })
}

async function kvDelete(collectionName: string, key: string) {
  return apiJsonWrite(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export const saveToStore = async (collectionName: string, documentId: string, data: any) => {
  try {
    const dataToSave = {
      ...data,
      updatedAt: new Date().toISOString(),
    }
    await kvSet(collectionName, documentId, dataToSave)
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error saving to ${collectionName}:`, error)
    }
    return false
  }
}

export const getFromStore = async (collectionName: string, documentId: string) => {
  try {
    const result = await kvGet(collectionName, documentId)
    return result?.data ?? null
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error getting from ${collectionName}:`, error)
    }
    return null
  }
}

export const getAllFromStore = async (collectionName: string) => {
  try {
    const rows = await kvList(collectionName)
    return (rows || []).map((r: any) => ({
      id: r.key,
      ...(r.data || {}),
    }))
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error getting all from ${collectionName}:`, error)
    }
    return []
  }
}

export const updateStore = async (collectionName: string, documentId: string, data: any) => {
  try {
    const existing = await getFromStore(collectionName, documentId)
    await kvSet(collectionName, documentId, {
      ...(existing || {}),
      ...data,
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error updating ${collectionName}:`, error)
    }
    return false
  }
}

export const deleteFromStore = async (collectionName: string, documentId: string) => {
  try {
    await kvDelete(collectionName, documentId)
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error deleting from ${collectionName}:`, error)
    }
    return false
  }
}

export const saveDesignIndex = async (designId: string, index: { metadataCid: string; previewCid?: string; designCid?: string }) => {
  return await saveToStore('designIndex', designId, index)
}

export const getDesignIndex = async (designId: string) => {
  try {
    const fromApi = await getDesignIndexFromApi(designId)
    return fromApi ?? null
  } catch {
    return await getFromStore('designIndex', designId)
  }
}

export const saveOrder = async (order: { buyer: string; items: any[]; totalHBAR: string; txHashes: string[]; createdAt?: string }) => {
  const id = `${order.buyer.toLowerCase()}_${Date.now()}`
  return await saveToStore('orders', id, { ...order, createdAt: new Date().toISOString() })
}

export const getOrdersByWallet = async (walletAddress: string) => {
  const all = await getAllFromStore('orders')
  return all.filter((o: any) => o.buyer?.toLowerCase() === walletAddress.toLowerCase())
}

export const saveUserData = async (walletAddress: string, data: any) => {
  return await saveToStore('users', walletAddress.toLowerCase(), data)
}

export const getUserData = async (walletAddress: string) => {
  return await getFromStore('users', walletAddress.toLowerCase())
}

export const saveUserDesign = async (walletAddress: string, designId: string, data: any) => {
  const result = await saveToStore('userDesigns', `${walletAddress.toLowerCase()}_${designId}`, data)
  return result
}

export const getUserDesigns = async (walletAddress: string) => {
  try {
    const allDesigns = await getAllFromStore('userDesigns')
    const userDesigns = allDesigns.filter(
      (design: any) => design.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
    )
    return userDesigns
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting user designs:', error)
    }
    return []
  }
}

export const saveNGODesign = async (ngoWallet: string, designId: string, data: any) => {
  const result = await saveToStore('ngoDesigns', `${ngoWallet.toLowerCase()}_${designId}`, data)
  return result
}

export const getNGODesigns = async (ngoWallet: string) => {
  try {
    const allDesigns = await getAllFromStore('ngoDesigns')
    const ngoDesigns = allDesigns.filter(
      (design: any) => design.walletAddress?.toLowerCase() === ngoWallet.toLowerCase()
    )
    return ngoDesigns
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting NGO designs:', error)
    }
    return []
  }
}

export const saveToGlobalDesigns = async (designId: string, designData: any) => {
  return await saveToStore('alldesigns', designId, designData)
}

export const getAllGlobalDesigns = async () => {
  return await getAllFromStore('alldesigns')
}

export const removeFromGlobalDesigns = async (designId: string) => {
  return await deleteFromStore('alldesigns', designId)
}

export const deleteDesignEverywhere = async (designId: number) => {
  try {
    const index = await getDesignIndex(designId.toString())
    const cids = [index?.metadataCid, index?.previewCid, index?.designCid].filter(Boolean)
    for (const cid of cids) {
      if (cid) {
        try {
          await unpinCID(cid)
        } catch (e) {
          if (isDev) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to unpin CID ${cid}:`, e)
          }
        }
      }
    }
    await deleteFromStore('designIndex', designId.toString())
    await removeFromGlobalDesigns(designId.toString())

    const existingDesigns = getStorageJson<any[]>('designs', [])
    const filtered = existingDesigns.filter(
      (d: any) => (d.onchainId?.toString() || d.id?.toString()) !== designId.toString()
    )
    localStorage.setItem('designs', JSON.stringify(filtered))

    return true
  } catch (e) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Failed full deletion for design', designId, e)
    }
    return false
  }
}

export const saveCart = async (walletAddress: string, cartItems: any) => {
  try {
    const docId = walletAddress.toLowerCase()
    const result = await saveToStore('carts', docId, { items: cartItems })
    return result
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error saving cart:', error)
    }
    return false
  }
}

export const getCart = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase()
    const result = await getFromStore('carts', docId)
    return result?.items || []
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting cart:', error)
    }
    return []
  }
}

export const savePurchase = async (walletAddress: string, purchaseData: any) => {
  return await saveToStore('purchases', `${walletAddress.toLowerCase()}_${Date.now()}`, purchaseData)
}

export const getUserPurchases = async (walletAddress: string) => {
  const allPurchases = await getAllFromStore('purchases')
  return allPurchases.filter(
    (purchase: any) => purchase.purchasedBy?.toLowerCase() === walletAddress.toLowerCase()
  )
}

export const saveDonation = async (walletAddress: string, donationData: any) => {
  return await saveToStore('donations', `${walletAddress.toLowerCase()}_${Date.now()}`, donationData)
}

export const getUserDonations = async (walletAddress: string) => {
  const allDonations = await getAllFromStore('donations')
  return allDonations.filter(
    (donation: any) => donation.donorAddress?.toLowerCase() === walletAddress.toLowerCase()
  )
}

export const saveUserProfile = async (walletAddress: string, profileData: any) => {
  const result = await saveToStore('userProfiles', walletAddress.toLowerCase(), profileData)
  return result
}

export const getUserProfile = async (walletAddress: string) => {
  const result = await getFromStore('userProfiles', walletAddress.toLowerCase())
  return result
}

export const saveNgoProfile = async (walletAddress: string, profileData: any) => {
  const result = await saveToStore('ngoProfiles', walletAddress.toLowerCase(), profileData)
  return result
}

export const getNgoProfile = async (walletAddress: string) => {
  const result = await getFromStore('ngoProfiles', walletAddress.toLowerCase())
  return result
}

const base64ToBlob = (base64: string): Blob => {
  const byteString = atob(base64.split(',')[1])
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}

async function uploadBlobToIPFS(blob: Blob, fileName: string): Promise<string | null> {
  try {
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' })
    const cid = await uploadFileToIPFS(file)
    if (!cid) return null
    return getIPFSURL(cid)
  } catch (e) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error uploading blob to IPFS:', e)
    }
    return null
  }
}

export const uploadImageToStorage = async (
  walletAddress: string,
  imageType: 'banner' | 'profile',
  base64Image: string
): Promise<string | null> => {
  try {
    const blob = base64ToBlob(base64Image)
    const fileName = `${walletAddress.toLowerCase()}_${imageType}_${Date.now()}.jpg`
    return await uploadBlobToIPFS(blob, fileName)
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error uploading ${imageType} image:`, error)
    }
    return null
  }
}

export const uploadDesignImageToStorage = async (
  designId: string,
  imageType: 'front' | 'back',
  imageDataUrl: string
): Promise<string | null> => {
  try {
    const response = await fetch(imageDataUrl)
    let blob = await response.blob()

    if (blob.type !== 'image/png') {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = imageDataUrl
        })
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b || blob), 'image/png')
        })
      }
    }

    const fileName = `${designId}_${imageType}.png`
    return await uploadBlobToIPFS(blob, fileName)
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error uploading design ${imageType} image:`, error)
    }
    return null
  }
}

export const saveUserProfileWithImages = async (walletAddress: string, profileData: any) => {
  try {
    let bannerImageUrl = profileData.bannerImage
    let profileImageUrl = profileData.profileImage

    if (profileData.bannerImage && profileData.bannerImage.startsWith('data:')) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Uploading banner image...')
      }
      bannerImageUrl = await uploadImageToStorage(walletAddress, 'banner', profileData.bannerImage)
    }

    if (profileData.profileImage && profileData.profileImage.startsWith('data:')) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Uploading profile image...')
      }
      profileImageUrl = await uploadImageToStorage(walletAddress, 'profile', profileData.profileImage)
    }

    const profileToSave = {
      name: profileData.name,
      bio: profileData.bio,
      bannerImage: bannerImageUrl,
      profileImage: profileImageUrl,
    }

    const result = await saveToStore('userProfiles', walletAddress.toLowerCase(), profileToSave)

    return result
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error saving user profile with images:', error)
    }
    return false
  }
}

export const saveNgoProfileWithImages = async (walletAddress: string, profileData: any) => {
  try {
    let bannerImageUrl = profileData.bannerImage
    let profileImageUrl = profileData.profileImage

    if (profileData.bannerImage && profileData.bannerImage.startsWith('data:')) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Uploading banner image...')
      }
      bannerImageUrl = await uploadImageToStorage(walletAddress, 'banner', profileData.bannerImage)
    }

    if (profileData.profileImage && profileData.profileImage.startsWith('data:')) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Uploading profile image...')
      }
      profileImageUrl = await uploadImageToStorage(walletAddress, 'profile', profileData.profileImage)
    }

    const profileToSave = {
      name: profileData.name,
      bio: profileData.bio,
      bannerImage: bannerImageUrl,
      profileImage: profileImageUrl,
      categories: profileData.categories,
      country: profileData.country,
      officeAddress: profileData.officeAddress,
      contactEmail: profileData.contactEmail,
      websiteLink: profileData.websiteLink,
    }

    const result = await saveToStore('ngoProfiles', walletAddress.toLowerCase(), profileToSave)

    return result
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error saving NGO profile with images:', error)
    }
    return false
  }
}

export const saveNgoApplication = async (ngoData: any, signature?: string, timestamp?: string) => {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (signature && timestamp) {
      headers['x-wallet-signature'] = signature;
      headers['x-wallet-timestamp'] = timestamp;
    }
    const fromApi = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/ngo/applications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ngoData)
    }).then(r => r.json());
    return fromApi.ok ? true : false;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error saving NGO application:', error);
    return false;
  }
}

export const getNgoApplications = async () => {
  try {
    const authHeaders = getAuthHeaders();
    const fromApi = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/admin/ngo-applications`, {
      headers: authHeaders
    }).then(r => r.json());
    return fromApi.items || [];
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error getting NGO applications:', error);
    return [];
  }
}

export const getNgoApplicationByWallet = async (walletAddress: string, signature?: string, timestamp?: string) => {
  try {
    const headers: Record<string, string> = {}
    if (signature && timestamp) {
      headers['x-wallet-signature'] = signature
      headers['x-wallet-timestamp'] = timestamp
    } else {
      Object.assign(headers, getAuthHeaders())
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/ngo/applications/${walletAddress}`, {
      headers,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || (json && json.error)) return null
    return json
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error getting NGO application:', error)
    return null
  }
}

const NGO_APP_LOCAL_KEY = 'donateonchain_ngo_application'

export function persistNgoApplicationLocal(walletAddress: string, data: Record<string, unknown>) {
  try {
    localStorage.setItem(
      `${NGO_APP_LOCAL_KEY}_${walletAddress.toLowerCase()}`,
      JSON.stringify({ ...data, walletAddress: walletAddress.toLowerCase() })
    )
  } catch {
    /* ignore */
  }
}

export function readNgoApplicationLocal(walletAddress: string): any | null {
  try {
    const raw = localStorage.getItem(`${NGO_APP_LOCAL_KEY}_${walletAddress.toLowerCase()}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearNgoApplicationLocal(walletAddress: string) {
  try {
    localStorage.removeItem(`${NGO_APP_LOCAL_KEY}_${walletAddress.toLowerCase()}`)
  } catch {
    /* ignore */
  }
}

type SignMessageFn = (args: { message: string }) => Promise<`0x${string}`>

export async function fetchNgoApplicationState(
  walletAddress: string,
  signMessageAsync?: SignMessageFn
): Promise<{ hasApplied: boolean; data: any | null }> {
  if (!walletAddress) return { hasApplied: false, data: null }

  if (signMessageAsync) {
    try {
      const ts = Date.now().toString()
      const message = `DonateOnChain:ngo_application_read:${ts}`
      const signature = await signMessageAsync({ message })
      const existingApplication = await getNgoApplicationByWallet(walletAddress, signature, ts)
      if (existingApplication) {
        persistNgoApplicationLocal(walletAddress, existingApplication as Record<string, unknown>)
        return { hasApplied: true, data: existingApplication }
      }
    } catch {
      /* fall through to local */
    }
  }

  const local = readNgoApplicationLocal(walletAddress)
  if (local) {
    return {
      hasApplied: true,
      data: { ...local, status: local.status ?? 'pending' },
    }
  }

  try {
    const existingApplication = await getNgoApplicationByWallet(walletAddress)
    if (existingApplication) {
      persistNgoApplicationLocal(walletAddress, existingApplication as Record<string, unknown>)
      return { hasApplied: true, data: existingApplication }
    }
  } catch {
    /* fall through */
  }

  const ngos = getStorageJson<any[]>('ngos', [])
  const userNgo = ngos.find(
    (ngo: any) =>
      ngo.connectedWalletAddress?.toLowerCase() === walletAddress.toLowerCase() ||
      ngo.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
  )
  if (userNgo) return { hasApplied: true, data: userNgo }
  return { hasApplied: false, data: null }
}

export function isNgoApplicationApproved(data: any | null | undefined): boolean {
  if (!data) return false
  return data.status === 'approved'
}

export const deleteNgoApplication = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase()
    const result = await deleteFromStore('ngoApplications', docId)
    return result
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error deleting NGO application:', error)
    }
    return false
  }
}

export const updateNgoApplicationStatus = async (
  walletAddress: string,
  status: 'approved' | 'rejected',
  reason: string,
  approvalTransactionHash?: string
) => {
  try {
    const fromApi = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/admin/ngo-applications/${walletAddress}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason: reason })
    }).then(r => r.json());
    return fromApi.ok ? true : false;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error updating NGO application status:', error);
    return false;
  }
}

export const saveDesignerApplication = async (designerData: any) => {
  try {
    const docId = designerData.walletAddress.toLowerCase()
    await saveToStore('designerApplications', docId, designerData)
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error saving designer application:', error)
    }
    return false
  }
}

export const getDesignerApplicationByWallet = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase()
    const result = await getFromStore('designerApplications', docId)
    if (!result) return null
    return { id: docId, ...result }
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting designer application:', error)
    }
    return null
  }
}

export const deleteDesignerApplication = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase()
    await deleteFromStore('designerApplications', docId)
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error deleting designer application:', error)
    }
    return false
  }
}

export const updateDesignerApplicationStatus = async (
  walletAddress: string,
  status: 'approved' | 'rejected',
  reason: string,
  approvalTransactionHash?: string
) => {
  try {
    const docId = walletAddress.toLowerCase()
    const updateData: any = {
      status: status,
      rejectionReason: reason,
      statusUpdatedAt: new Date().toISOString(),
    }
    if (approvalTransactionHash) {
      updateData.approvalTransactionHash = approvalTransactionHash
    }
    await updateStore('designerApplications', docId, updateData)
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error updating designer application status:', error)
    }
    return false
  }
}

export const getDesignerApplications = async () => {
  try {
    return await getAllFromStore('designerApplications')
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting all designer applications:', error)
    }
    return null
  }
}

export const saveAdminList = async (adminAddresses: string[]) => {
  try {
    await saveToStore('systemData', 'adminList', {
      admins: adminAddresses,
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error saving admin list:', error)
    }
    return false
  }
}

export const getAdminList = async () => {
  try {
    const data: any = await getFromStore('systemData', 'adminList')
    return data?.admins || []
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting admin list:', error)
    }
    return []
  }
}

export const uploadFileToStorage = async (walletAddress: string, file: File, folder: string): Promise<string | null> => {
  try {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`Uploading file ${file.name} to ${folder} for ${walletAddress}`)
    }
    const cid = await uploadFileToIPFS(file)
    if (!cid) return null
    const url = getIPFSURL(cid)
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`File uploaded successfully: ${url}`)
    }
    return url
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`Error uploading file:`, error)
    }
    return null
  }
}

export const migrateDesignImagesToStorage = async (
  design: any,
  walletAddress: string,
  designType: 'user' | 'ngo'
) => {
  try {
    let frontUrl = design.frontDesign?.url || null
    let backUrl = design.backDesign?.url || null

    if (design.frontDesign?.dataUrl && !design.frontDesign?.url) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Migrating front image to storage...')
      }
      frontUrl = await uploadDesignImageToStorage(design.id.toString(), 'front', design.frontDesign.dataUrl)
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Front image migrated:', frontUrl)
      }
    }

    if (design.backDesign?.dataUrl && !design.backDesign?.url) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Migrating back image to storage...')
      }
      backUrl = await uploadDesignImageToStorage(design.id.toString(), 'back', design.backDesign.dataUrl)
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('Back image migrated:', backUrl)
      }
    }

    const updatedDesign = {
      ...design,
      frontDesign: frontUrl
        ? {
            name: design.frontDesign?.name || 'front',
            url: frontUrl,
          }
        : null,
      backDesign: backUrl
        ? {
            name: design.backDesign?.name || 'back',
            url: backUrl,
          }
        : null,
    }

    if (designType === 'ngo') {
      await saveNGODesign(walletAddress, design.id.toString(), updatedDesign)
    } else {
      await saveUserDesign(walletAddress, design.id.toString(), updatedDesign)
    }

    await saveToGlobalDesigns(design.id.toString(), updatedDesign)

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('Design images migrated and saved to storage')
    }
    return updatedDesign
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error migrating design images:', error)
    }
    return design
  }
}

export const uploadCampaignImageToStorage = async () => {
  return null
}

export const deleteCampaignStorageAssets = async (campaignId: number | string) => {
  try {
    return true
  } catch (_e) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('No campaign storage assets or failed to delete for', campaignId)
    }
    return false
  }
}

export const deleteCampaignEverywhere = async (campaignId: number) => {
  try {
    try {
      const cid = await getCampaignMetadataCid(BigInt(campaignId))
      if (cid) {
        await unpinCID(cid)
      }
    } catch (_e) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('Could not resolve/unpin campaign metadata CID for', campaignId)
      }
    }
    await deleteCampaignStorageAssets(campaignId)
    await deleteFromStore('campaigns', campaignId.toString())
    return true
  } catch (e) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Failed full deletion for campaign', campaignId, e)
    }
    return false
  }
}

