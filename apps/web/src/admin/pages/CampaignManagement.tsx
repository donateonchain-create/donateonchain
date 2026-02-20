import { useState, useEffect } from 'react'
import { Megaphone, Play, Flag, CheckCircle, X } from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import {
  PageHeader,
  MetricCards,
  ManagementTable,
  StatusBadge,
  EmptyState,
  Pagination,
  ProgressBar,
} from '../components/management'
import type { ColumnDef } from '../components/management'
import { managementCampaigns } from '../data/databank'
import ConfirmationModal from '../components/ConfirmationModal'

interface CampaignRow {
  id: string
  title: string
  ngoName: string
  status: string
  amountRaised: number
  target: number
  donorsCount: number
  endDate: string
  flagged?: boolean
}

const PAGE_SIZE = 10
const CAMPAIGN_FILTERS = {
  status: [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' },
    { value: 'flagged', label: 'Flagged' },
  ],
  sort: [
    { value: 'newest', label: 'Newest' },
    { value: 'funded', label: 'Most Funded' },
    { value: 'ending', label: 'Ending Soon' },
  ],
}

const CampaignManagement = () => {
  const { useMockData } = useAdminMockData()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const data = useMockData ? managementCampaigns : []

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const metrics = [
    { label: 'Total Campaigns', value: data.length, icon: Megaphone },
    { label: 'Active', value: data.filter((r) => r.status === 'active').length, icon: Play },
    { label: 'Flagged', value: data.filter((r) => r.flagged).length, icon: Flag },
    { label: 'Completed', value: data.filter((r) => r.status === 'completed').length, icon: CheckCircle },
  ]

  const filtered = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(query) ||
        item.ngoName.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      )
    }
    return true
  })

  const sortedData = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    } else if (sortBy === 'funded') {
      return b.amountRaised - a.amountRaised
    } else if (sortBy === 'ending') {
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    }
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const paginated = sortedData.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const columns: ColumnDef<CampaignRow>[] = [
    {
      key: 'title',
      header: 'Campaign',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.flagged && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Flagged
            </span>
          )}
          <span className="font-medium text-gray-900">{row.title}</span>
        </div>
      ),
    },
    { key: 'ngoName', header: 'NGO' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => (
        <ProgressBar value={row.amountRaised} max={row.target} />
      ),
    },
    {
      key: 'amounts',
      header: 'Raised / Target',
      render: (row) => (
        <span className="tabular-nums">
          {row.amountRaised} / {row.target} HBAR
        </span>
      ),
    },
    { key: 'donorsCount', header: 'Donors' },
    { key: 'endDate', header: 'End Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedCampaign(row)
              setShowDrawer(true)
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            View
          </button>
          {row.status === 'active' && (
            <button
              onClick={() => handlePause(row.id)}
              disabled={isProcessing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {row.status === 'paused' && (
            <button
              onClick={() => handleResume(row.id)}
              disabled={isProcessing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {!row.flagged && (
            <button
              onClick={() => {
                setSelectedCampaign(row)
                setShowFlagModal(true)
              }}
              disabled={isProcessing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Flag
            </button>
          )}
        </div>
      ),
    },
  ]

  const handlePause = async (_id: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleResume = async (_id: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleFlag = async () => {
    if (!selectedCampaign) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setShowFlagModal(false)
    setSelectedCampaign(null)
    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Management"
        subtitle="Monitor and moderate all fundraising campaigns"
      />
      <MetricCards metrics={metrics} isLoading={isLoading} />
      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by campaign title, NGO name, or ID"
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
            {CAMPAIGN_FILTERS.status.map((option) => (
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
            {CAMPAIGN_FILTERS.sort.map((option) => (
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
          message="No campaigns match your filters"
          cta={{ label: 'Clear filters', onClick: () => {
            setSearchQuery('')
            setStatusFilter('')
            setDateFrom('')
            setDateTo('')
            setSortBy('newest')
          }}}
          variant="campaign"
        />
      ) : (
        <>
          <ManagementTable<CampaignRow>
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

      {showDrawer && selectedCampaign && (
        <CampaignDrawer
          campaign={selectedCampaign}
          onClose={() => {
            setShowDrawer(false)
            setSelectedCampaign(null)
          }}
          onPause={() => handlePause(selectedCampaign.id)}
          onResume={() => handleResume(selectedCampaign.id)}
          onFlag={() => setShowFlagModal(true)}
          isProcessing={isProcessing}
        />
      )}

      <ConfirmationModal
        isOpen={showFlagModal}
        onClose={() => {
          setShowFlagModal(false)
          setSelectedCampaign(null)
        }}
        title="Flag Campaign"
        message="Are you sure you want to flag this campaign? This will mark it for review."
        confirmLabel="Flag"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleFlag}
      />
    </div>
  )
}

interface CampaignDrawerProps {
  campaign: CampaignRow
  onClose: () => void
  onPause: () => void
  onResume: () => void
  onFlag: () => void
  isProcessing: boolean
}

const CampaignDrawer = ({ campaign, onClose, onPause, onResume, onFlag, isProcessing }: CampaignDrawerProps) => {
  const [adminNotes, setAdminNotes] = useState('')
  const progressPercentage = Math.min((campaign.amountRaised / campaign.target) * 100, 100)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Campaign Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <span className="text-xs text-gray-500">Title</span>
                <p className="text-sm font-medium text-gray-900">{campaign.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status</span>
                <StatusBadge status={campaign.status} />
                {campaign.flagged && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Flagged
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500">NGO</span>
                <p className="text-sm font-medium text-gray-900">{campaign.ngoName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Campaign ID</span>
                <p className="text-sm font-medium text-gray-900">{campaign.id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">End Date</span>
                <p className="text-sm font-medium text-gray-900">{campaign.endDate}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Funding Progress</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Amount Raised</span>
                <span className="text-lg font-semibold text-gray-900">{campaign.amountRaised} HBAR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Target</span>
                <span className="text-sm font-medium text-gray-900">{campaign.target} HBAR</span>
              </div>
              <ProgressBar value={campaign.amountRaised} max={campaign.target} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-sm font-medium text-gray-900">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Donors</span>
                <span className="text-sm font-medium text-gray-900">{campaign.donorsCount}</span>
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
            {campaign.status === 'active' && (
              <button
                onClick={onPause}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Pause Campaign
              </button>
            )}
            {campaign.status === 'paused' && (
              <button
                onClick={onResume}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Resume Campaign
              </button>
            )}
            {!campaign.flagged && (
              <button
                onClick={onFlag}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Flag Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CampaignManagement
