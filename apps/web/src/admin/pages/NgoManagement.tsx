import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, XCircle, X } from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import {
  PageHeader,
  MetricCards,
  ManagementTable,
  StatusBadge,
  EmptyState,
  Pagination,
  WalletCopy,
} from '../components/management'
import type { ColumnDef } from '../components/management'
import { managementNgos } from '../data/databank'
import ConfirmationModal from '../components/ConfirmationModal'

interface NgoRow {
  id: string
  name: string
  logoUrl?: string
  country: string
  wallet: string
  status: string
  campaignsCount: number
  totalDonations: string
  dateRegistered: string
}

const PAGE_SIZE = 10
const NGO_FILTERS = {
  status: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
  ],
  sort: [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'donations', label: 'Most Donations' },
  ],
}

const NgoManagement = () => {
  const { useMockData } = useAdminMockData()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedNgo, setSelectedNgo] = useState<NgoRow | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const data = useMockData ? managementNgos : []

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const metrics = [
    { label: 'Total NGOs', value: data.length, icon: Users },
    { label: 'Pending Approval', value: data.filter((r) => r.status === 'pending').length, icon: Clock },
    { label: 'Approved', value: data.filter((r) => r.status === 'approved').length, icon: CheckCircle },
    { label: 'Rejected', value: data.filter((r) => r.status === 'rejected').length, icon: XCircle },
  ]

  const filtered = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.wallet.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      )
    }
    return true
  })

  const sortedData = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime()
    } else if (sortBy === 'oldest') {
      return new Date(a.dateRegistered).getTime() - new Date(b.dateRegistered).getTime()
    } else if (sortBy === 'donations') {
      const aDonations = parseFloat(a.totalDonations.replace(/[^0-9.]/g, '')) || 0
      const bDonations = parseFloat(b.totalDonations.replace(/[^0-9.]/g, '')) || 0
      return bDonations - aDonations
    }
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paginated = sortedData.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const columns: ColumnDef<NgoRow>[] = [
    {
      key: 'name',
      header: 'NGO',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {row.logoUrl ? (
              <img src={row.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Users className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    { key: 'country', header: 'Country' },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (row) => (
        <div className="relative">
          <WalletCopy address={row.wallet} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'campaignsCount', header: 'Campaigns' },
    { key: 'totalDonations', header: 'Total Donations' },
    { key: 'dateRegistered', header: 'Registered' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedNgo(row)
              setShowDrawer(true)
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            View
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setSelectedNgo(row)
                  setShowRejectModal(true)
                }}
                disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => handleSuspend(row.id)}
              disabled={isProcessing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          {row.status === 'suspended' && (
            <button
              onClick={() => handleReactivate(row.id)}
              disabled={isProcessing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
        </div>
      ),
    },
  ]

  const handleApprove = async (_id: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleReject = async () => {
    if (!selectedNgo) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setShowRejectModal(false)
    setSelectedNgo(null)
    setIsProcessing(false)
  }

  const handleSuspend = async (_id: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleReactivate = async (_id: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NGO Management"
        subtitle="Review, approve, and manage registered NGOs"
      />
      <MetricCards metrics={metrics} isLoading={isLoading} />
      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by NGO name, wallet, country, or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            {NGO_FILTERS.status.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="To"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {NGO_FILTERS.sort.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          message="No NGOs found"
          cta={{ label: 'Clear filters', onClick: () => {
            setSearchQuery('')
            setStatusFilter('')
            setDateFrom('')
            setDateTo('')
            setSortBy('newest')
          }}}
          variant="ngo"
        />
      ) : (
        <>
          <ManagementTable<NgoRow>
            columns={columns}
            rows={paginated}
            getRowId={(r) => r.id}
            isLoading={isLoading}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </>
      )}

      {showDrawer && selectedNgo && (
        <NgoDrawer
          ngo={selectedNgo}
          onClose={() => {
            setShowDrawer(false)
            setSelectedNgo(null)
          }}
          onApprove={() => handleApprove(selectedNgo.id)}
          onReject={() => setShowRejectModal(true)}
          onSuspend={() => handleSuspend(selectedNgo.id)}
          onReactivate={() => handleReactivate(selectedNgo.id)}
          isProcessing={isProcessing}
        />
      )}

      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setSelectedNgo(null)
        }}
        title="Reject NGO"
        message="Are you sure you want to reject this NGO? This action cannot be undone."
        confirmLabel="Reject"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleReject}
      />
    </div>
  )
}

interface NgoDrawerProps {
  ngo: NgoRow
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onSuspend: () => void
  onReactivate: () => void
  isProcessing: boolean
}

const NgoDrawer = ({ ngo, onClose, onApprove, onReject, onSuspend, onReactivate, isProcessing }: NgoDrawerProps) => {
  const [adminNotes, setAdminNotes] = useState('')

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">NGO Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 pb-16 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">NGO Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {ngo.logoUrl ? (
                    <img src={ngo.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{ngo.name}</p>
                  <StatusBadge status={ngo.status} />
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Country</span>
                <p className="text-sm font-medium text-gray-900">{ngo.country}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">NGO ID</span>
                <p className="text-sm font-medium text-gray-900">{ngo.id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Date Registered</span>
                <p className="text-sm font-medium text-gray-900">{ngo.dateRegistered}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Wallet Address</h3>
            <div className="flex items-center gap-2">
              <WalletCopy address={ngo.wallet} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Campaign Statistics</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Campaigns</span>
                <span className="text-sm font-medium text-gray-900">{ngo.campaignsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Donations</span>
                <span className="text-sm font-medium text-gray-900">{ngo.totalDonations}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Notes</h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="Add internal notes..."
            />
          </div>

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            {ngo.status === 'pending' && (
              <>
                <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  disabled={isProcessing}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {ngo.status === 'approved' && (
              <button
                onClick={onSuspend}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Suspend
              </button>
            )}
            {ngo.status === 'suspended' && (
              <button
                onClick={onReactivate}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default NgoManagement
