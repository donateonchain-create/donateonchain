import { useState, useEffect } from 'react'
import {
  DollarSign,
  Megaphone,
  Users,
  Palette,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react'
import { useAdminMockData } from '../context/AdminMockDataContext'
import MetricCard from '../components/dashboard/MetricCard'
import ActionCard from '../components/dashboard/ActionCard'
import EmptyState from '../components/dashboard/EmptyState'
import RecentTable from '../components/dashboard/RecentTable'
import DetailModal from '../components/dashboard/DetailModal'
import MetricCardSkeleton from '../components/dashboard/MetricCardSkeleton'
import ActionCardSkeleton from '../components/dashboard/ActionCardSkeleton'
import RecentTableSkeleton from '../components/dashboard/RecentTableSkeleton'
import {
  summaryMetrics,
  emptySummaryMetrics,
  actionRequired,
  recentDonations,
  recentCampaigns,
  recentApprovedNgos,
  recentDesignsBought,
} from '../data/databank'
import { fetchAdminMetrics } from '../services/api'

const metricLinks: Record<string, string> = {
  totalDonations: '/admin/dashboard',
  activeCampaigns: '/admin/campaigns',
  totalNgos: '/admin/ngos',
  totalDesigners: '/admin/designers',
  pendingKycReviews: '/admin/kyc-review',
  openComplaints: '/admin/complaints',
}

const metricsConfig = [
  { key: 'totalDonations', label: 'Total Donations', icon: DollarSign },
  { key: 'activeCampaigns', label: 'Active Campaigns', icon: Megaphone },
  { key: 'totalNgos', label: 'Total NGOs', icon: Users },
  { key: 'totalDesigners', label: 'Total Designers', icon: Palette },
  { key: 'pendingKycReviews', label: 'Pending KYC', icon: ShieldCheck },
  { key: 'openComplaints', label: 'Open Complaints', icon: MessageSquare },
]

const DASHBOARD_LOAD_DELAY_MS = 1200

const Dashboard = () => {
  const { useMockData } = useAdminMockData()
  const [liveMetrics, setLiveMetrics] = useState(emptySummaryMetrics)
  const metrics = useMockData ? summaryMetrics : liveMetrics
  const [detailModal, setDetailModal] = useState<{ title: string; data: Record<string, string | number | string[]>; mode: 'donation' | 'ngo' | 'campaign' | 'transaction' } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (useMockData) {
      const t = setTimeout(() => { if (active) setIsLoading(false) }, DASHBOARD_LOAD_DELAY_MS)
      return () => { active = false; clearTimeout(t) }
    } else {
      setIsLoading(true)
      fetchAdminMetrics()
        .then((data) => {
          if (!active) return
          setLiveMetrics({
            totalDonations: { value: `$${data.totalDonations}`, trend: 'live', subtext: 'Total platform donations' },
            activeCampaigns: { value: data.activeCampaigns, trend: 'live', subtext: 'Currently running campaigns' },
            totalNgos: { value: data.totalNgos, trend: 'live', subtext: 'Registered organizations' },
            totalDesigners: { value: data.totalDesigners || 0, trend: 'live', subtext: 'Verified designers' },
            pendingKycReviews: { value: data.pendingKycReviews, trend: 'live', subtext: 'Applications awaiting review' },
            openComplaints: { value: data.openComplaints || 0, trend: 'live', subtext: 'Unresolved issues' },
          })
        })
        .catch((err) => {
          console.error(err)
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
      return () => { active = false }
    }
  }, [useMockData])

  const openDetail = (title: string, data: Record<string, string | number | string[]>, mode: 'donation' | 'ngo' | 'campaign' | 'transaction') => {
    setDetailModal({ title, data, mode })
  }

  if (isLoading) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading dashboard">
        <section>
          <div className="mb-4 h-6 w-32 rounded bg-gray-100 animate-pulse" aria-hidden />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4 h-6 w-36 rounded bg-gray-100 animate-pulse" aria-hidden />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ActionCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4 h-6 w-32 rounded bg-gray-100 animate-pulse" aria-hidden />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <RecentTableSkeleton key={i} columns={4} rows={5} />
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Global Summary</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metricsConfig.map(({ key, label, icon }) => {
            const m = metrics[key as keyof typeof metrics]
            return (
              <MetricCard
                key={key}
                title={label}
                value={m.value}
                subtext={m.subtext}
                trend={m.trend}
                icon={icon}
                href={metricLinks[key]}
              />
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Action Required</h2>
        {useMockData ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {actionRequired.map((item) => (
              <ActionCard key={item.id} {...item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No actions required"
            description="All clear. Check back later for any pending items."
          />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentTable
            title="Recent Donations"
            viewAllHref="/admin/dashboard"
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'amount', label: 'Amount' },
              { key: 'time', label: 'Time' },
              { key: 'status', label: 'Status', badge: true },
            ]}
            rows={useMockData ? recentDonations : []}
            emptyMessage="No donations yet"
            onViewRow={(row) => openDetail('Donation Details', row as Record<string, string | number | string[]>, 'donation')}
          />
          <RecentTable
            title="Marketplace Transactions"
            viewAllHref="/admin/designers"
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'design', label: 'Design' },
              { key: 'amount', label: 'Amount' },
              { key: 'time', label: 'Time' },
              { key: 'status', label: 'Status', badge: true },
            ]}
            rows={useMockData ? recentDesignsBought : []}
            emptyMessage="No marketplace transactions yet"
            onViewRow={(row) => openDetail('Transaction Details', row as Record<string, string | number | string[]>, 'transaction')}
          />
          <RecentTable
            title="Recently Approved NGOs"
            viewAllHref="/admin/ngos"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'wallet', label: 'Wallet' },
              { key: 'approved', label: 'Approved' },
            ]}
            rows={useMockData ? recentApprovedNgos : []}
            emptyMessage="No approved NGOs yet"
            onViewRow={(row) => openDetail('NGO Application Details', row as Record<string, string | number | string[]>, 'ngo')}
          />
          <RecentTable
            title="Recently Created Campaigns"
            viewAllHref="/admin/campaigns"
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'created', label: 'Created' },
              { key: 'status', label: 'Status', badge: true },
            ]}
            rows={useMockData ? recentCampaigns : []}
            emptyMessage="No campaigns yet"
            onViewRow={(row) => openDetail('Campaign Details', row as Record<string, string | number | string[]>, 'campaign')}
          />
        </div>
      </section>
      {detailModal && (
        <DetailModal
          title={detailModal.title}
          data={detailModal.data}
          mode={detailModal.mode}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  )
}

export default Dashboard
