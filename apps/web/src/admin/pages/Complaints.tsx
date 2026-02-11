import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import { PageHeader, StatusBadge, WalletCopy } from '../components/management'
import type { ColumnDef } from '../components/management'
import ManagementTable from '../components/management/ManagementTable'
import TableRowSkeleton from '../components/management/TableRowSkeleton'
import EmptyState from '../components/management/EmptyState'

interface Complaint {
  id: string
  reporter: string
  reporterType: 'donor' | 'ngo' | 'designer'
  against: string
  againstType: 'ngo' | 'designer' | 'campaign'
  category: 'fraud' | 'content' | 'donation' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'new' | 'in_review' | 'resolved' | 'escalated'
  date: string
  message: string
  attachments?: string[]
}

const mockComplaints: Complaint[] = [
  {
    id: 'COMP-001',
    reporter: '0x1111111111111111111111111111111111111111',
    reporterType: 'donor',
    against: 'Green Earth Foundation',
    againstType: 'ngo',
    category: 'fraud',
    priority: 'high',
    status: 'new',
    date: '2026-02-05',
    message: 'Suspicious activity detected in campaign funds',
  },
  {
    id: 'COMP-002',
    reporter: '0x2222222222222222222222222222222222222222',
    reporterType: 'ngo',
    against: 'Campaign #123',
    againstType: 'campaign',
    category: 'content',
    priority: 'medium',
    status: 'in_review',
    date: '2026-02-03',
    message: 'Inappropriate content in campaign description',
  },
  {
    id: 'COMP-003',
    reporter: '0x3333333333333333333333333333333333333333',
    reporterType: 'designer',
    against: 'Hope for Children',
    againstType: 'ngo',
    category: 'donation',
    priority: 'urgent',
    status: 'resolved',
    date: '2026-01-30',
    message: 'Donation not reflected in campaign',
  },
]

const priorityStyles: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-800' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-800' },
  high: { bg: 'bg-amber-100', text: 'text-amber-800' },
  urgent: { bg: 'bg-red-100', text: 'text-red-800' },
}

const Complaints = () => {
  const { useMockData } = useAdminMockData()
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [reporterTypeFilter, setReporterTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [resolutionType, setResolutionType] = useState('')
  const [adminComment, setAdminComment] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const data = useMockData ? mockComplaints : []

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const filteredData = data.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false
    if (typeFilter && item.category !== typeFilter) return false
    if (reporterTypeFilter && item.reporterType !== reporterTypeFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.id.toLowerCase().includes(query) ||
        item.reporter.toLowerCase().includes(query) ||
        item.against.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query)
      )
    }
    return true
  })

  const columns: ColumnDef<Complaint>[] = [
    {
      key: 'id',
      header: 'Complaint ID',
      render: (row) => <span className="font-mono text-sm text-gray-900">{row.id}</span>,
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900 capitalize">{row.reporterType}</div>
          <WalletCopy address={row.reporter} />
        </div>
      ),
    },
    {
      key: 'against',
      header: 'Against',
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.against}</div>
          <div className="text-xs text-gray-500 capitalize">{row.againstType}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="capitalize text-sm text-gray-700">{row.category}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => {
        const style = priorityStyles[row.priority] || priorityStyles.low
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style.bg} ${style.text}`}>
            {row.priority}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status.replace('_', ' ')} />,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedComplaint(row)
            setShowDrawer(true)
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          View
        </button>
      ),
    },
  ]

  const handleMarkInReview = async () => {
    if (!selectedComplaint) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleEscalate = async () => {
    if (!selectedComplaint) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const handleResolve = async () => {
    if (!selectedComplaint) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setShowResolutionModal(false)
    setResolutionType('')
    setAdminComment('')
    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints & Reports"
        subtitle="Manage and resolve user complaints and reports"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by ID, reporter, or complaint"
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
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="fraud">Fraud</option>
            <option value="content">Content</option>
            <option value="donation">Donation</option>
            <option value="other">Other</option>
          </select>
          <select
            value={reporterTypeFilter}
            onChange={(e) => setReporterTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Reporters</option>
            <option value="donor">Donor</option>
            <option value="ngo">NGO</option>
            <option value="designer">Designer</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="From"
            />
            <input
              type="date"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} columns={8} />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <EmptyState
          message="No complaints found"
          variant="ngo"
        />
      ) : (
        <ManagementTable
          columns={columns}
          rows={filteredData}
          getRowId={(row) => row.id}
        />
      )}

      {showDrawer && selectedComplaint && (
        <ComplaintDrawer
          complaint={selectedComplaint}
          onClose={() => {
            setShowDrawer(false)
            setSelectedComplaint(null)
          }}
          onMarkInReview={handleMarkInReview}
          onEscalate={handleEscalate}
          onResolve={() => setShowResolutionModal(true)}
          isProcessing={isProcessing}
        />
      )}

      {showResolutionModal && (
        <ResolutionModal
          isOpen={showResolutionModal}
          onClose={() => {
            setShowResolutionModal(false)
            setResolutionType('')
            setAdminComment('')
          }}
          onConfirm={handleResolve}
          resolutionType={resolutionType}
          onResolutionTypeChange={setResolutionType}
          adminComment={adminComment}
          onAdminCommentChange={setAdminComment}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}

interface ComplaintDrawerProps {
  complaint: Complaint
  onClose: () => void
  onMarkInReview: () => void
  onEscalate: () => void
  onResolve: () => void
  isProcessing: boolean
}

const ComplaintDrawer = ({
  complaint,
  onClose,
  onMarkInReview,
  onEscalate,
  onResolve,
  isProcessing,
}: ComplaintDrawerProps) => {
  const [adminNotes, setAdminNotes] = useState('')

  const timeline = [
    { date: complaint.date, action: 'Complaint submitted', user: 'System' },
    { date: '2026-02-06', action: 'Assigned to admin', user: 'Admin' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Complaint Details</h2>
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Complaint Summary</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ID</span>
                <span className="font-mono text-sm font-medium text-gray-900">{complaint.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{complaint.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Priority</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${priorityStyles[complaint.priority].bg} ${priorityStyles[complaint.priority].text}`}>
                  {complaint.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <StatusBadge status={complaint.status.replace('_', ' ')} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reporter Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
              <div>
                <span className="text-xs text-gray-500">Type</span>
                <p className="text-sm font-medium text-gray-900 capitalize">{complaint.reporterType}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Wallet Address</span>
                <WalletCopy address={complaint.reporter} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Target Entity</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
              <div>
                <span className="text-xs text-gray-500">Name</span>
                <p className="text-sm font-medium text-gray-900">{complaint.against}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Type</span>
                <p className="text-sm font-medium text-gray-900 capitalize">{complaint.againstType}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Complaint Message</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-900">{complaint.message}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
            <div className="grid grid-cols-2 gap-4">
              {complaint.attachments && complaint.attachments.length > 0 ? (
                complaint.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                  >
                    <div className="text-center">
                      <FileText className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-xs text-gray-600">{att}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No attachments</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Activity Timeline</h3>
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    {idx < timeline.length - 1 && <div className="h-8 w-0.5 bg-gray-200" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.user} • {item.date}</p>
                  </div>
                </div>
              ))}
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
            {complaint.status === 'new' && (
              <button
                onClick={onMarkInReview}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Mark In Review
              </button>
            )}
            <button
              onClick={onEscalate}
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Escalate
            </button>
            <button
              onClick={onResolve}
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface ResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  resolutionType: string
  onResolutionTypeChange: (t: string) => void
  adminComment: string
  onAdminCommentChange: (c: string) => void
  isProcessing: boolean
}

const ResolutionModal = ({
  isOpen,
  onClose,
  onConfirm,
  resolutionType,
  onResolutionTypeChange,
  adminComment,
  onAdminCommentChange,
  isProcessing,
}: ResolutionModalProps) => {
  if (!isOpen) return null

  const resolutionTypes = [
    'Resolved - No Action Required',
    'Resolved - Action Taken',
    'Resolved - False Report',
    'Resolved - Other',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Resolve Complaint</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Type</label>
            <select
              value={resolutionType}
              onChange={(e) => onResolutionTypeChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select resolution type</option>
              {resolutionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Comment</label>
            <textarea
              value={adminComment}
              onChange={(e) => onAdminCommentChange(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="Add resolution details..."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || !resolutionType}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  )
}

export default Complaints
