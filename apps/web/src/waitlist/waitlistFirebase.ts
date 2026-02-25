import { ADMIN_API_BASE_URL } from '../admin/services/api'

export const saveWaitlistEntry = async (email: string, role: string) => {
  try {
    const response = await fetch(`${ADMIN_API_BASE_URL}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
    })

    if (!response.ok) {
      throw new Error('Failed to join waitlist')
    }
    return true
  } catch (err) {
    console.error('Waitlist join error:', err)
    throw err
  }
}

export const getWaitlistEntryByEmail = async (_email: string) => {
  // The backend's upsert handles uniqueness automatically based on the unique email constraint.
  // However, if we need to strictly check *before* saving (to show a validation message),
  // the backend doesn't currently expose a GET /api/waitlist/:email.
  // For now, we will just return null to always trigger save, which will upsert (update) if they exist.
  return null
}

export const getAllWaitlistEntries = async () => {
  // Moved to admin waitlist management dashboard using fetchAdminWaitlist.
  // This is kept here for legacy compatibility if anything else calls it.
  return []
}
