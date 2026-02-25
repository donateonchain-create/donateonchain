import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { fetchAdminWaitlist } from '../services/api'
import { useAdminMockData } from '../context/AdminMockDataContext'

interface WaitlistEntry {
  id: string
  email?: string
  role?: string
  joinedAt?: string
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(entries: WaitlistEntry[]) {
  const headers = ['Email', 'Role', 'Joined (UTC)']
  const rows = entries.map((e) => [
    escapeCsvCell(e.email || e.id || ''),
    escapeCsvCell(e.role || ''),
    escapeCsvCell(e.joinedAt ? new Date(e.joinedAt).toISOString() : '')
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const WaitlistManagement = () => {
  const { useMockData } = useAdminMockData()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setIsLoading(true)
        if (useMockData) {
          if (active) setEntries([
            { id: 'mock-1', email: 'designer@example.com', role: 'designer', joinedAt: new Date().toISOString() },
            { id: 'mock-2', email: 'ngo@example.com', role: 'ngo', joinedAt: new Date().toISOString() }
          ])
        } else {
          const res = await fetchAdminWaitlist(1, 1000)
          if (!active) return
          const mapped = res.items.map((item: any) => ({
            id: item.id,
            email: item.email,
            role: item.role,
            joinedAt: item.createdAt
          }))
          setEntries(mapped)
        }
      } catch (err) {
        console.error(err)
        if (active) setError('Unable to load waitlist entries.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [useMockData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Waitlist</h1>
          <p className="mt-1 text-sm text-gray-500">Emails and roles of people who joined the waitlist.</p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCsv(entries)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading waitlist...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No one has joined the waitlist yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.email || entry.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{entry.role || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {entry.joinedAt ? new Date(entry.joinedAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default WaitlistManagement

