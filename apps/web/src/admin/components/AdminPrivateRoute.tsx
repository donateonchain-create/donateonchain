import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { getUserRoles } from '../../onchain/adapter'

interface AdminPrivateRouteProps {
  children: React.ReactNode
}

const AdminPrivateRoute = ({ children }: AdminPrivateRouteProps) => {
  const { address, isConnected, status } = useAccount()
  const chainId = useChainId()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const [networkOk, setNetworkOk] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (status === 'connecting' || status === 'reconnecting') {
        setChecking(true)
        return
      }
      if (!isConnected || !address) {
        setIsAdmin(false)
        setNetworkOk(true)
        setChecking(false)
        return
      }
      const expectedChainId = 296
      const ok = chainId === expectedChainId
      setNetworkOk(ok)
      if (!ok) {
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
  }, [address, isConnected, status, chainId])

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

  if (isConnected && !networkOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-black">Wrong network</h1>
          <p className="mt-2 text-sm text-gray-600">Switch your wallet to Hedera Testnet (chainId 296) to access admin.</p>
          <p className="mt-4 text-xs text-gray-400">Connected chainId: {chainId}</p>
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
