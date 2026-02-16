import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

const WAITLIST_COLLECTION = 'waitlist'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const getWaitlistEntryByEmail = async (email: string) => {
  if (!db) return null
  const id = normalizeEmail(email)
  const ref = doc(db, WAITLIST_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data()
}

export const saveWaitlistEntry = async (email: string, role: string) => {
  if (!db) return false
  const id = normalizeEmail(email)
  const now = new Date().toISOString()
  const ref = doc(db, WAITLIST_COLLECTION, id)
  await setDoc(ref, { email: id, role, joinedAt: now })
  return true
}

export const getAllWaitlistEntries = async () => {
  if (!db) return []
  const ref = collection(db, WAITLIST_COLLECTION)
  const snap = await getDocs(ref)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
