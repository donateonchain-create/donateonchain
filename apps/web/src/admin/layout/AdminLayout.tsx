import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminMockDataProvider } from '../context/AdminMockDataContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const contentPadding = sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'

  return (
    <AdminMockDataProvider>
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className={`transition-all duration-200 pl-0 ${contentPadding}`}>
        <Topbar
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
    </AdminMockDataProvider>
  )
}

export default AdminLayout
