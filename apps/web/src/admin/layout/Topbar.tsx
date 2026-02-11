import { useLocation } from 'react-router-dom'
import { Search, Bell, User, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'

const routeTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/ngos': 'NGO Management',
  '/admin/campaigns': 'Campaign Management',
  '/admin/designers': 'Designer Management',
  '/admin/kyc-review': 'KYC Review',
  '/admin/complaints': 'Complaints',
}

interface TopbarProps {
  onMenuClick?: () => void
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const location = useLocation()
  const [searchValue, setSearchValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const pageTitle = routeTitles[location.pathname] ?? 'Admin'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="hidden max-w-xs flex-1 sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
