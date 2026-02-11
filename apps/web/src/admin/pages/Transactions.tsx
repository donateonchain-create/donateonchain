import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, CreditCard, XCircle, Copy, ExternalLink, X } from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import { PageHeader, StatusBadge, WalletCopy } from '../components/management'
import type { ColumnDef } from '../components/management'
import ManagementTable from '../components/management/ManagementTable'
import TableRowSkeleton from '../components/management/TableRowSkeleton'
import EmptyState from '../components/management/EmptyState'

interface Transaction {
  id: string
  hash: string
  type: 'donation' | 'purchase' | 'fee' | 'refund'
  amount: string
  sender: string
  recipient: string
  campaign?: string
  status: 'pending' | 'completed' | 'failed'
  date: string
  fees?: string
}

const mockTransactions: Transaction[] = [
  {
    id: 'TX-001',
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    type: 'donation',
    amount: '100.50',
    sender: '0x1111111111111111111111111111111111111111',
    recipient: '0x2222222222222222222222222222222222222222',
    campaign: 'Green Earth Campaign',
    status: 'completed',
    date: '2026-02-06',
    fees: '0.50',
  },
  {
    id: 'TX-002',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'purchase',
    amount: '25.00',
    sender: '0x3333333333333333333333333333333333333333',
    recipient: '0x4444444444444444444444444444444444444444',
    status: 'completed',
    date: '2026-02-05',
    fees: '1.25',
  },
  {
    id: 'TX-003',
    hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    type: 'donation',
    amount: '500.00',
    sender: '0x5555555555555555555555555555555555555555',
    recipient: '0x2222222222222222222222222222222222222222',
    campaign: 'Hope for Children',
    status: 'failed',
    date: '2026-02-04',
  },
]

const Transactions = () => {
  const { useMockData } = useAdminMockData()
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ngoFilter, setNgoFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)

  const data = useMockData ? mockTransactions : []

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const filteredData = data.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false
    if (statusFilter && item.status !== statusFilter) return false
    if (ngoFilter && item.recipient.toLowerCase() !== ngoFilter.toLowerCase()) return false
    if (campaignFilter && item.campaign?.toLowerCase() !== campaignFilter.toLowerCase()) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.hash.toLowerCase().includes(query) ||
        item.sender.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      )
    }
    return true
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  const summaryCards = [
    {
      label: 'Total Volume',
      value: '$12,450.50',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Donations',
      value: '1,234',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Total Purchases',
      value: '567',
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Platform Fees',
      value: '$124.50',
      icon: CreditCard,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Failed Transactions',
      value: '23',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
  }

  const columns: ColumnDef<Transaction>[] = [
    {
      key: 'hash',
      header: 'Transaction Hash',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-900">{formatHash(row.hash)}</span>
          <button
            onClick={() => copyHash(row.hash)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Copy hash"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="capitalize text-sm text-gray-700">{row.type}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">${row.amount}</span>
      ),
    },
    {
      key: 'sender',
      header: 'Sender',
      render: (row) => <WalletCopy address={row.sender} />,
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (row) => <WalletCopy address={row.recipient} />,
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (row) => (
        <span className="text-sm text-gray-700">{row.campaign || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedTransaction(row)
            setShowDrawer(true)
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Monitor and manage all platform transactions"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-gray-200 bg-white p-4 ${isLoading ? 'animate-pulse' : ''}`}
          >
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-6 w-32 rounded bg-gray-200" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg ${card.bgColor} p-2`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by transaction hash or wallet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="donation">Donation</option>
            <option value="purchase">Purchase</option>
            <option value="fee">Fee</option>
            <option value="refund">Refund</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={ngoFilter}
            onChange={(e) => setNgoFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All NGOs</option>
            <option value="0x2222222222222222222222222222222222222222">Green Earth Foundation</option>
            <option value="0x4444444444444444444444444444444444444444">Hope for Children</option>
          </select>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Campaigns</option>
            <option value="Green Earth Campaign">Green Earth Campaign</option>
            <option value="Hope for Children">Hope for Children</option>
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
            <TableRowSkeleton key={i} columns={9} />
          ))}
        </div>
      ) : sortedData.length === 0 ? (
        <EmptyState
          message="No transactions found"
          variant="ngo"
        />
      ) : (
        <ManagementTable
          columns={columns}
          rows={sortedData}
          getRowId={(row) => row.id}
        />
      )}

      {showDrawer && selectedTransaction && (
        <TransactionDrawer
          transaction={selectedTransaction}
          onClose={() => {
            setShowDrawer(false)
            setSelectedTransaction(null)
          }}
        />
      )}
    </div>
  )
}

interface TransactionDrawerProps {
  transaction: Transaction
  onClose: () => void
}

const TransactionDrawer = ({ transaction, onClose }: TransactionDrawerProps) => {
  const statusHistory = [
    { status: 'pending', date: transaction.date, time: '10:00 AM' },
    { status: transaction.status, date: transaction.date, time: '10:05 AM' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Hash</h3>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <span className="flex-1 font-mono text-sm text-gray-900 break-all">{transaction.hash}</span>
              <button
                onClick={() => navigator.clipboard.writeText(transaction.hash)}
                className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                aria-label="Copy hash"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => {}}
                className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                aria-label="View on explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Amount & Fees</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Amount</span>
                <span className="text-lg font-semibold text-gray-900">${transaction.amount}</span>
              </div>
              {transaction.fees && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Platform Fee</span>
                  <span className="text-sm font-medium text-gray-900">${transaction.fees}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${(parseFloat(transaction.amount) + (parseFloat(transaction.fees || '0'))).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Sender</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <WalletCopy address={transaction.sender} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recipient</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <WalletCopy address={transaction.recipient} />
            </div>
          </div>

          {transaction.campaign && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Campaign</h3>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">{transaction.campaign}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <StatusBadge status={transaction.status} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status History</h3>
            <div className="space-y-3">
              {statusHistory.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    {idx < statusHistory.length - 1 && <div className="h-8 w-0.5 bg-gray-200" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.date} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-gray-200 pt-4">
            <button
              onClick={() => {}}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Transactions
