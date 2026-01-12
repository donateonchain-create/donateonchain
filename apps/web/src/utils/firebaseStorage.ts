import { getCampaignMetadataCid } from '../onchain/adapter'
import { unpinCID, uploadFileToIPFS } from './ipfs'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

async function apiJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function kvSet(collectionName: string, key: string, data: any) {
  return apiJson(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
}

async function kvGet(collectionName: string, key: string) {
  return apiJson(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, {
    method: 'GET',
  })
}

async function kvList(collectionName: string) {
  return apiJson(`/api/kv/${encodeURIComponent(collectionName)}`, { method: 'GET' })
}

async function kvDelete(collectionName: string, key: string) {
  return apiJson(`/api/kv/${encodeURIComponent(collectionName)}/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

//function to save data to Firestore
export const saveToFirebase = async (collectionName: string, documentId: string, data: any) => {
  try {
    const dataToSave = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await kvSet(collectionName, documentId, dataToSave)
    return true
  } catch (error) {
    console.error(`Error saving to ${collectionName}:`, error)
    return false
  }
}

//  function to get data from Firestore
export const getFromFirebase = async (collectionName: string, documentId: string) => {
  try {
    const result = await kvGet(collectionName, documentId)
    return result?.data ?? null
  } catch (error) {
    console.error(`Error getting from ${collectionName}:`, error)
    return null
  }
}

//  function to get all documents from a collection
export const getAllFromFirebase = async (collectionName: string) => {
  try {
    const rows = await kvList(collectionName)
    return (rows || []).map((r: any) => ({
      id: r.key,
      ...(r.data || {}),
    }))
  } catch (error) {
    console.error(`Error getting all from ${collectionName}:`, error)
    return []
  }
}

//   function to update data in Firestore
export const updateFirebase = async (collectionName: string, documentId: string, data: any) => {
  try {
    const existing = await getFromFirebase(collectionName, documentId)
    await kvSet(collectionName, documentId, {
      ...(existing || {}),
      ...data,
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error)
    return false
  }
}

//   function to delete data from Firestore
export const deleteFromFirebase = async (collectionName: string, documentId: string) => {
  try {
    await kvDelete(collectionName, documentId)
    return true
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error)
    return false
  }
}

// Design index (on-chain id -> IPFS cids)
export const saveDesignIndex = async (designId: string, index: { metadataCid: string; previewCid?: string; designCid?: string }) => {
  return await saveToFirebase('designIndex', designId, index)
}

export const getDesignIndex = async (designId: string) => {
  return await getFromFirebase('designIndex', designId)
}

// Orders
export const saveOrder = async (order: { buyer: string; items: any[]; totalHBAR: string; txHashes: string[]; createdAt?: string }) => {
  const id = `${order.buyer.toLowerCase()}_${Date.now()}`
  return await saveToFirebase('orders', id, { ...order, createdAt: new Date().toISOString() })
}

export const getOrdersByWallet = async (walletAddress: string) => {
  const all = await getAllFromFirebase('orders')
  return all.filter((o: any) => o.buyer?.toLowerCase() === walletAddress.toLowerCase())
}

// User-specific functions
export const saveUserData = async (walletAddress: string, data: any) => {
  return await saveToFirebase('users', walletAddress.toLowerCase(), data)
}

export const getUserData = async (walletAddress: string) => {
  return await getFromFirebase('users', walletAddress.toLowerCase())
}

// Design-specific functions
export const saveUserDesign = async (walletAddress: string, designId: string, data: any) => {
  const result = await saveToFirebase('userDesigns', `${walletAddress.toLowerCase()}_${designId}`, data)
  return result;
}

export const getUserDesigns = async (walletAddress: string) => {
  try {
    const allDesigns = await getAllFromFirebase('userDesigns');
    const userDesigns = allDesigns.filter((design: any) => 
      design.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
    );
    return userDesigns;
  } catch (error) {
    console.error('Error getting user designs:', error);
    return [];
  }
}

export const saveNGODesign = async (ngoWallet: string, designId: string, data: any) => {
  const result = await saveToFirebase('ngoDesigns', `${ngoWallet.toLowerCase()}_${designId}`, data)
  return result;
}

export const getNGODesigns = async (ngoWallet: string) => {
  try {
    const allDesigns = await getAllFromFirebase('ngoDesigns');
    const ngoDesigns = allDesigns.filter((design: any) => 
      design.walletAddress?.toLowerCase() === ngoWallet.toLowerCase()
    );
    return ngoDesigns;
  } catch (error) {
    console.error('Error getting NGO designs:', error);
    return [];
  }
}

// Global designs collection functions (for Home and Shop)
export const saveToGlobalDesigns = async (designId: string, designData: any) => {
  return await saveToFirebase('alldesigns', designId, designData)
}

export const getAllGlobalDesigns = async () => {
  return await getAllFromFirebase('alldesigns')
}

export const removeFromGlobalDesigns = async (designId: string) => {
  return await deleteFromFirebase('alldesigns', designId)
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
          console.warn(`Failed to unpin CID ${cid}:`, e)
        }
      }
    }
    await deleteFromFirebase('designIndex', designId.toString())
    await removeFromGlobalDesigns(designId.toString())
    
    const existingDesigns = JSON.parse(localStorage.getItem('designs') || '[]')
    const filtered = existingDesigns.filter((d: any) => (d.onchainId?.toString() || d.id?.toString()) !== designId.toString())
    localStorage.setItem('designs', JSON.stringify(filtered))
    
    return true
  } catch (e) {
    console.error('Failed full deletion for design', designId, e)
    return false
  }
}

// Cart functions
export const saveCart = async (walletAddress: string, cartItems: any) => {
  try {
    const docId = walletAddress.toLowerCase();
    const result = await saveToFirebase('carts', docId, { items: cartItems });
    return result;
  } catch (error) {
    console.error('Error saving cart:', error);
    return false;
  }
}

export const getCart = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    const result = await getFromFirebase('carts', docId);
    return result?.items || [];
  } catch (error) {
    console.error('Error getting cart:', error);
    return [];
  }
}

// Purchase/Donation tracking
export const savePurchase = async (walletAddress: string, purchaseData: any) => {
  return await saveToFirebase('purchases', `${walletAddress.toLowerCase()}_${Date.now()}`, purchaseData)
}

export const getUserPurchases = async (walletAddress: string) => {
  const allPurchases = await getAllFromFirebase('purchases')
  return allPurchases.filter((purchase: any) => 
    purchase.purchasedBy?.toLowerCase() === walletAddress.toLowerCase()
  )
}

export const saveDonation = async (walletAddress: string, donationData: any) => {
  return await saveToFirebase('donations', `${walletAddress.toLowerCase()}_${Date.now()}`, donationData)
}

export const getUserDonations = async (walletAddress: string) => {
  const allDonations = await getAllFromFirebase('donations')
  return allDonations.filter((donation: any) => 
    donation.donorAddress?.toLowerCase() === walletAddress.toLowerCase()
  )
}

// User profile functions
export const saveUserProfile = async (walletAddress: string, profileData: any) => {
  const result = await saveToFirebase('userProfiles', walletAddress.toLowerCase(), profileData);
  return result;
}

export const getUserProfile = async (walletAddress: string) => {
  const result = await getFromFirebase('userProfiles', walletAddress.toLowerCase());
  return result;
}

// NGO profile functions
export const saveNgoProfile = async (walletAddress: string, profileData: any) => {
  const result = await saveToFirebase('ngoProfiles', walletAddress.toLowerCase(), profileData);
  return result;
}

export const getNgoProfile = async (walletAddress: string) => {
  const result = await getFromFirebase('ngoProfiles', walletAddress.toLowerCase());
  return result;
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
    return `https://gateway.pinata.cloud/ipfs/${cid}`
  } catch (e) {
    console.error('Error uploading blob to IPFS:', e)
    return null
  }
}

// Upload image to IPFS (via backend)
export const uploadImageToFirebase = async (walletAddress: string, imageType: 'banner' | 'profile', base64Image: string): Promise<string | null> => {
  try {
    const blob = base64ToBlob(base64Image)
    const fileName = `${walletAddress.toLowerCase()}_${imageType}_${Date.now()}.jpg`
    return await uploadBlobToIPFS(blob, fileName)
  } catch (error) {
    console.error(`Error uploading ${imageType} image:`, error)
    return null
  }
}

// Upload design image to IPFS (via backend)
export const uploadDesignImageToFirebase = async (designId: string, imageType: 'front' | 'back', imageDataUrl: string): Promise<string | null> => {
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
    console.error(`Error uploading design ${imageType} image:`, error)
    return null
  }
}


export const saveUserProfileWithImages = async (walletAddress: string, profileData: any) => {
  try {
  
    
    let bannerImageUrl = profileData.bannerImage
    let profileImageUrl = profileData.profileImage
    

    if (profileData.bannerImage && profileData.bannerImage.startsWith('data:')) {
      console.log('Uploading banner image...')
      bannerImageUrl = await uploadImageToFirebase(walletAddress, 'banner', profileData.bannerImage)
    }
    

    if (profileData.profileImage && profileData.profileImage.startsWith('data:')) {
      console.log('Uploading profile image...')
      profileImageUrl = await uploadImageToFirebase(walletAddress, 'profile', profileData.profileImage)
    }
    

    const profileToSave = {
      name: profileData.name,
      bio: profileData.bio,
      bannerImage: bannerImageUrl,
      profileImage: profileImageUrl
    }
    
  
    const result = await saveToFirebase('userProfiles', walletAddress.toLowerCase(), profileToSave);
  
    return result
  } catch (error) {
    console.error('Error saving user profile with images:', error)
    return false
  }
}


export const saveNgoProfileWithImages = async (walletAddress: string, profileData: any) => {
  try {
  
    
    let bannerImageUrl = profileData.bannerImage
    let profileImageUrl = profileData.profileImage
    

    if (profileData.bannerImage && profileData.bannerImage.startsWith('data:')) {
      console.log('Uploading banner image...')
      bannerImageUrl = await uploadImageToFirebase(walletAddress, 'banner', profileData.bannerImage)
    }
    

    if (profileData.profileImage && profileData.profileImage.startsWith('data:')) {
      console.log('Uploading profile image...')
      profileImageUrl = await uploadImageToFirebase(walletAddress, 'profile', profileData.profileImage)
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
      websiteLink: profileData.websiteLink
    }
    
  
    const result = await saveToFirebase('ngoProfiles', walletAddress.toLowerCase(), profileToSave);
  
    return result
  } catch (error) {
    console.error('Error saving NGO profile with images:', error)
    return false
  }
}

export const saveNgoApplication = async (ngoData: any) => {
  try {
  
    const docId = ngoData.connectedWalletAddress?.toLowerCase() || ngoData.walletAddress?.toLowerCase() || Date.now().toString();
    const result = await saveToFirebase('ngoApplications', docId, ngoData);
  
    return result;
  } catch (error) {
    console.error('Error saving NGO application:', error);
    return false;
  }
}

export const getNgoApplications = async () => {
  try {
  
    const result = await getAllFromFirebase('ngoApplications');
  
    return result;
  } catch (error) {
    console.error('Error getting NGO applications:', error);
    return [];
  }
}

export const getNgoApplicationByWallet = async (walletAddress: string) => {
  try {
  
    const docId = walletAddress.toLowerCase();
    const result = await getFromFirebase('ngoApplications', docId);
  
    return result;
  } catch (error) {
    console.error('Error getting NGO application:', error);
    return null;
  }
}

export const deleteNgoApplication = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    const result = await deleteFromFirebase('ngoApplications', docId)
    return result
  } catch (error) {
    console.error('Error deleting NGO application:', error)
    return false
  }
}

export const updateNgoApplicationStatus = async (walletAddress: string, status: 'approved' | 'rejected', reason: string, approvalTransactionHash?: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    const updateData: any = {
      status: status,
      rejectionReason: reason,
      statusUpdatedAt: new Date().toISOString()
    };
    if (approvalTransactionHash) {
      updateData.approvalTransactionHash = approvalTransactionHash;
    }
    await updateFirebase('ngoApplications', docId, updateData)
    return true
  } catch (error) {
    console.error('Error updating NGO application status:', error)
    return false
  }
}

export const saveDesignerApplication = async (designerData: any) => {
  try {
    const docId = designerData.walletAddress.toLowerCase();
    await saveToFirebase('designerApplications', docId, designerData)
    return true
  } catch (error) {
    console.error('Error saving designer application:', error)
    return false
  }
}

export const getDesignerApplicationByWallet = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    const result = await getFromFirebase('designerApplications', docId)
    if (!result) return null
    return { id: docId, ...result }
  } catch (error) {
    console.error('Error getting designer application:', error)
    return null
  }
}

export const deleteDesignerApplication = async (walletAddress: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    await deleteFromFirebase('designerApplications', docId)
    return true
  } catch (error) {
    console.error('Error deleting designer application:', error)
    return false
  }
}

export const updateDesignerApplicationStatus = async (walletAddress: string, status: 'approved' | 'rejected', reason: string, approvalTransactionHash?: string) => {
  try {
    const docId = walletAddress.toLowerCase();
    const updateData: any = {
      status: status,
      rejectionReason: reason,
      statusUpdatedAt: new Date().toISOString()
    };
    if (approvalTransactionHash) {
      updateData.approvalTransactionHash = approvalTransactionHash;
    }
    await updateFirebase('designerApplications', docId, updateData)
    return true
  } catch (error) {
    console.error('Error updating designer application status:', error)
    return false
  }
}

export const getDesignerApplications = async () => {
  try {
    return await getAllFromFirebase('designerApplications')
  } catch (error) {
    console.error('Error getting all designer applications:', error)
    return null
  }
}

export const saveAdminList = async (adminAddresses: string[]) => {
  try {
    await saveToFirebase('systemData', 'adminList', {
      admins: adminAddresses,
      updatedAt: new Date().toISOString()
    });
    return true
  } catch (error) {
    console.error('Error saving admin list:', error)
    return false
  }
}

export const getAdminList = async () => {
  try {
    const data: any = await getFromFirebase('systemData', 'adminList')
    return data?.admins || []
  } catch (error) {
    console.error('Error getting admin list:', error)
    return []
  }
}

export const uploadFileToFirebase = async (walletAddress: string, file: File, folder: string): Promise<string | null> => {
  try {
    console.log(`Uploading file ${file.name} to ${folder} for ${walletAddress}`)
    const cid = await uploadFileToIPFS(file)
    if (!cid) return null
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`
    console.log(`File uploaded successfully: ${url}`)
    return url
  } catch (error) {
    console.error(`Error uploading file:`, error)
    return null
  }
}

export const migrateDesignImagesToFirebase = async (design: any, walletAddress: string, designType: 'user' | 'ngo') => {
  try {
  
    let frontUrl = design.frontDesign?.url || null
    let backUrl = design.backDesign?.url || null
    

    if (design.frontDesign?.dataUrl && !design.frontDesign?.url) {
      console.log('Migrating front image to Firebase Storage...')
      frontUrl = await uploadDesignImageToFirebase(design.id.toString(), 'front', design.frontDesign.dataUrl)
      console.log('Front image migrated:', frontUrl)
    }
    
    if (design.backDesign?.dataUrl && !design.backDesign?.url) {
      console.log('Migrating back image to Firebase Storage...')
      backUrl = await uploadDesignImageToFirebase(design.id.toString(), 'back', design.backDesign.dataUrl)
      console.log('Back image migrated:', backUrl)
    }
    

    const updatedDesign = {
      ...design,
      frontDesign: frontUrl ? {
        name: design.frontDesign?.name || 'front',
        url: frontUrl
      } : null,
      backDesign: backUrl ? {
        name: design.backDesign?.name || 'back',
        url: backUrl
      } : null
    }
    

    if (designType === 'ngo') {
      await saveNGODesign(walletAddress, design.id.toString(), updatedDesign)
    } else {
      await saveUserDesign(walletAddress, design.id.toString(), updatedDesign)
    }
    

    await saveToGlobalDesigns(design.id.toString(), updatedDesign)
    
    console.log('Design images migrated and saved to Firebase')
    return updatedDesign
  } catch (error) {
    console.error('Error migrating design images:', error)
    return design
  }
}


export const uploadCampaignImageToFirebase = async () => {
  return null;
}

export const deleteCampaignStorageAssets = async (campaignId: number | string) => {
  try {
    return true
  } catch (e) {
    console.warn('No campaign storage assets or failed to delete for', campaignId)
    return false
  }
}

export const deleteCampaignEverywhere = async (campaignId: number) => {
  try {
    try {
      const cid = await getCampaignMetadataCid(BigInt(campaignId))
      if (cid) { await unpinCID(cid) }
    } catch (e) {
      console.warn('Could not resolve/unpin campaign metadata CID for', campaignId)
    }
    await deleteCampaignStorageAssets(campaignId)
    await deleteFromFirebase('campaigns', campaignId.toString())
    return true
  } catch (e) {
    console.error('Failed full deletion for campaign', campaignId, e)
    return false
  }
}
