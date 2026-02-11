import { useState, useEffect } from 'react'
import { ShieldCheck, X, FileText } from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import { PageHeader, StatusBadge, WalletCopy } from '../components/management'
import type { ColumnDef } from '../components/management'
import ManagementTable from '../components/management/ManagementTable'
import TableRowSkeleton from '../components/management/TableRowSkeleton'
import EmptyState from '../components/management/EmptyState'

interface KycApplication {
  id: string
  applicantName: string
  entityType: 'ngo' | 'designer'
  country: string
  walletAddress: string
  submittedDate: string
  status: 'pending' | 'approved' | 'rejected'
  documents: string[]
}

const mockKycData: KycApplication[] = [
  {
    id: 'KYC-001',
    applicantName: 'Green Earth Foundation',
    entityType: 'ngo',
    country: 'United States',
    walletAddress: '0x1234567890123456789012345678901234567890',
    submittedDate: '2026-02-01',
    status: 'pending',
    documents: ['doc1.pdf', 'doc2.pdf']
  },
  {
    id: 'KYC-002',
    applicantName: 'Sarah Johnson',
    entityType: 'designer',
    country: 'Canada',
    walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    submittedDate: '2026-01-28',
    status: 'approved',
    documents: ['portfolio.pdf']
  },
  {
    id: 'KYC-003',
    applicantName: 'Hope for Children',
    entityType: 'ngo',
    country: 'UK',
    walletAddress: '0x9876543210987654321098765432109876543210',
    submittedDate: '2026-01-25',
    status: 'rejected',
    documents: ['cert.pdf']
  }
]

const KycReview = () => {
  const { useMockData } = useAdminMockData()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedKyc, setSelectedKyc] = useState<KycApplication | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectExplanation, setRejectExplanation] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const data = useMockData ? mockKycData : []

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const filteredData = data.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (entityFilter !== 'all' && item.entityType !== entityFilter) return false
    if (statusFilter && item.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.applicantName.toLowerCase().includes(query) ||
        item.walletAddress.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query)
      )
    }
    return true
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    }
    return new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime()
  })

  const tabs = [
    { id: 'all', label: 'All', count: data.length },
    { id: 'pending', label: 'Pending', count: data.filter((d) => d.status === 'pending').length },
    { id: 'approved', label: 'Approved', count: data.filter((d) => d.status === 'approved').length },
    { id: 'rejected', label: 'Rejected', count: data.filter((d) => d.status === 'rejected').length },
  ]

  const columns: ColumnDef<KycApplication>[] = [
    {
      key: 'applicantName',
      header: 'Applicant Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            {row.entityType === 'ngo' ? (
              <ShieldCheck className="h-5 w-5 text-gray-500" />
            ) : (
              <FileText className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.applicantName}</div>
            <div className="text-xs text-gray-500">{row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      render: (row) => (
        <span className="capitalize text-sm text-gray-700">{row.entityType}</span>
      ),
    },
    { key: 'country', header: 'Country' },
    { key: 'submittedDate', header: 'Submitted Date' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedKyc(row)
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
                  setSelectedKyc(row)
                  setShowRejectModal(true)
                }}
                disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </>
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
    if (!selectedKyc) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setShowRejectModal(false)
    setRejectReason('')
    setRejectExplanation('')
    setIsProcessing(false)
  }

  const handleRequestResubmission = async () => {
    if (!selectedKyc) return
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
  }

  const rejectReasons = [
    'Incomplete Documentation',
    'Invalid Identity Verification',
    'Suspicious Activity Detected',
    'Non-compliance with Requirements',
    'Other',
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC Review"
        subtitle="Review and verify KYC applications from NGOs and Designers"
      />

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-black text-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by name, email, wallet, or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Entity Types</option>
            <option value="ngo">NGO</option>
            <option value="designer">Designer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} columns={6} />
          ))}
        </div>
      ) : sortedData.length === 0 ? (
        <EmptyState
          message="No KYC applications found"
          variant="ngo"
        />
      ) : (
        <ManagementTable
          columns={columns}
          rows={sortedData}
          getRowId={(row) => row.id}
        />
      )}

      {showDrawer && selectedKyc && (
        <KycDrawer
          kyc={selectedKyc}
          onClose={() => {
            setShowDrawer(false)
            setSelectedKyc(null)
          }}
          onApprove={() => handleApprove(selectedKyc.id)}
          onReject={() => setShowRejectModal(true)}
          onRequestResubmission={handleRequestResubmission}
          isProcessing={isProcessing}
        />
      )}

      {showRejectModal && (
        <RejectModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setRejectReason('')
            setRejectExplanation('')
          }}
          onConfirm={handleReject}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          explanation={rejectExplanation}
          onExplanationChange={setRejectExplanation}
          reasons={rejectReasons}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}

interface KycDrawerProps {
  kyc: KycApplication
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onRequestResubmission: () => void
  isProcessing: boolean
}

const KycDrawer = ({ kyc, onClose, onApprove, onReject, onRequestResubmission, isProcessing }: KycDrawerProps) => {
  const [adminNotes, setAdminNotes] = useState('')
  const [verificationChecklist, setVerificationChecklist] = useState({
    identityVerified: false,
    documentsVerified: false,
    backgroundCheck: false,
    complianceCheck: false,
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">KYC Review Details</h2>
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Applicant Information</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <span className="text-xs text-gray-500">Name</span>
                <p className="text-sm font-medium text-gray-900">{kyc.applicantName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Entity Type</span>
                <p className="text-sm font-medium text-gray-900 capitalize">{kyc.entityType}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Country</span>
                <p className="text-sm font-medium text-gray-900">{kyc.country}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Application ID</span>
                <p className="text-sm font-medium text-gray-900">{kyc.id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Submitted Date</span>
                <p className="text-sm font-medium text-gray-900">{kyc.submittedDate}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Wallet Address</h3>
            <div className="flex items-center gap-2">
              <WalletCopy address={kyc.walletAddress} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Submitted Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              {kyc.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                >
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-xs text-gray-600">{doc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Verification Checklist</h3>
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              {Object.entries(verificationChecklist).map(([key, checked]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setVerificationChecklist((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
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
            <button
              onClick={onRequestResubmission}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Request Changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  reason: string
  onReasonChange: (r: string) => void
  explanation: string
  onExplanationChange: (e: string) => void
  reasons: string[]
  isProcessing: boolean
}

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  reason,
  onReasonChange,
  explanation,
  onExplanationChange,
  reasons,
  isProcessing,
}: RejectModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Reject KYC Application</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <select
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select reason</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
            <textarea
              value={explanation}
              onChange={(e) => onExplanationChange(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="Provide additional details..."
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
            disabled={isProcessing || !reason}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export default KycReview
