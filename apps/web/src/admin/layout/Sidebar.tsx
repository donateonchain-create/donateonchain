import { NavLink } from 'react-router-dom'
import { useAdminMockData } from '../context/AdminMockDataContext'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Palette,
  ShieldCheck,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Heart,
  Receipt,
} from 'lucide-react'
import DonateLogo from '../../assets/DonateLogo.png'
import DonateLogoCollapsed from '../../assets/donate-collapsed.png'
import { platformActivity, emptyPlatformActivity } from '../data/databank'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/ngos', label: 'NGO Management', icon: Users },
  { path: '/admin/campaigns', label: 'Campaign Management', icon: Megaphone },
  { path: '/admin/designers', label: 'Designer Management', icon: Palette },
  { path: '/admin/kyc-review', label: 'KYC Review', icon: ShieldCheck },
  { path: '/admin/complaints', label: 'Complaints', icon: MessageSquare },
  { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { path: '/admin/waitlist', label: 'Waitlist', icon: Heart },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) => {
  const { useMockData, setUseMockData } = useAdminMockData()
  const width = mobileOpen ? 'w-64' : (collapsed ? 'w-20' : 'w-64')
  const activity = useMockData ? platformActivity : emptyPlatformActivity
  const showActivity = mobileOpen || !collapsed

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen flex flex-col border-r border-gray-200 bg-white transition-transform duration-200 md:translate-x-0 ${width} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden pl-3 pr-2">
          <img
            src={collapsed ? DonateLogoCollapsed : DonateLogo}
            alt="Donate"
            className="h-7 w-auto shrink-0 object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => (mobileOpen ? onMobileClose?.() : onToggle())}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border-l border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label={mobileOpen ? 'Close menu' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        >
          {mobileOpen ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                title={collapsed && !mobileOpen ? label : undefined}
                onClick={() => onMobileClose?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    collapsed && !mobileOpen ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(mobileOpen || !collapsed) && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {showActivity && (
        <div className="border-t border-gray-200 px-3 py-4">
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">Activity</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-600">Donations today</span><span className="font-medium">{activity.donations.today}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">This week</span><span className="font-medium">{activity.donations.thisWeek}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">New campaigns</span><span className="font-medium">{activity.donations.newCampaigns}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Completed</span><span className="font-medium">{activity.donations.completedCampaigns}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Flagged</span><span className="font-medium">{activity.donations.flaggedCampaigns}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">Health</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-600">Tx success</span><span className="font-medium">{activity.health.transactionSuccessRate}%</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Wallet issues</span><span className="font-medium">{activity.health.walletConnectionIssues}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Avg. approval</span><span className="font-medium">{activity.health.avgApprovalTime}</span></div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 truncate max-w-[80px]">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-green-500" />
                    {activity.health.systemStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 p-3">
        <div
          className={`mb-3 flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between gap-2'}`}
        >
          {(mobileOpen || !collapsed) && (
            <span className="text-xs font-medium text-gray-600">Mock Data</span>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={useMockData}
            aria-label={useMockData ? 'Switch to empty state' : 'Switch to mock data'}
            onClick={() => setUseMockData(!useMockData)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${useMockData ? 'bg-black' : 'bg-gray-300'}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${useMockData ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
        <div
          className={`flex items-center rounded-lg px-3 py-2 ${
            collapsed && !mobileOpen ? 'justify-center' : 'gap-3'
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          {(mobileOpen || !collapsed) && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900">Admin</p>
              <p className="truncate text-xs text-gray-500">admin@donate.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}

export default Sidebar
