export const ADMIN_API_BASE_URL = import.meta.env.VITE_RELAYER_API_URL || 'http://localhost:3002'

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ADMIN_API_KEY,
    }
}

export const fetchAdminMetrics = async () => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/dashboard/metrics`, {
        headers: getHeaders(),
    })
    if (!response.ok) {
        throw new Error('Failed to fetch admin metrics')
    }
    return response.json()
}

export const fetchAdminNgos = async (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })
    if (status) params.append('status', status)

    const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/ngos?${params.toString()}`, {
        headers: getHeaders(),
    })
    if (!response.ok) {
        throw new Error('Failed to fetch admin NGOs')
    }
    return response.json()
}

export const fetchAdminCampaigns = async (page = 1, limit = 20, status?: string, ngoAddress?: string) => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })
    if (status) params.append('status', status)
    if (ngoAddress) params.append('ngoAddress', ngoAddress)

    const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/campaigns?${params.toString()}`, {
        headers: getHeaders(),
    })
    if (!response.ok) {
        throw new Error('Failed to fetch admin campaigns')
    }
    return response.json()
}

export const fetchAdminWaitlist = async (page = 1, limit = 50, email?: string, role?: string) => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })
    if (email) params.append('email', email)
    if (role) params.append('role', role)

    const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/waitlist?${params.toString()}`, {
        headers: getHeaders(),
    })
    if (!response.ok) {
        throw new Error('Failed to fetch admin waitlist')
    }
    return response.json()
}
