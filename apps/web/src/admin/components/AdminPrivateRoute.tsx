import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getUserRoles } from '../../onchain/adapter'

interface AdminPrivateRouteProps {
  children: React.ReactNode
}

const AdminPrivateRoute = ({ children }: AdminPrivateRouteProps) => {
  const { address, isConnected, status } = useAccount()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (status === 'connecting' || status === 'reconnecting') {
        setChecking(true)
        return
      }
      if (!isConnected || !address) {
        setIsAdmin(false)
        setChecking(false)
        return
      }
      try {
        const roles = await getUserRoles(address as `0x${string}`)
        setIsAdmin(roles.isAdmin)
      } catch {
        setIsAdmin(false)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [address, isConnected, status])

  if (status === 'connecting' || status === 'reconnecting' || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="text-sm text-gray-500">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isConnected || !isAdmin) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <>{children}</>
}

export default AdminPrivateRoute
