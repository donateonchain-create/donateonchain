import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AdminMockDataContextType {
  useMockData: boolean
  setUseMockData: (value: boolean) => void
}

const AdminMockDataContext = createContext<AdminMockDataContextType | undefined>(undefined)

export const AdminMockDataProvider = ({ children }: { children: ReactNode }) => {
  const [useMockData, setUseMockData] = useState(true)
  return (
    <AdminMockDataContext.Provider value={{ useMockData, setUseMockData }}>
      {children}
    </AdminMockDataContext.Provider>
  )
}

export const useAdminMockData = () => {
  const ctx = useContext(AdminMockDataContext)
  if (!ctx) throw new Error('useAdminMockData must be used within AdminMockDataProvider')
  return ctx
}
