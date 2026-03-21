import { Navigate, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useAuth } from '../context/AuthContext'

interface PrivateRouteProps {
    children: React.ReactNode
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
    const { isConnected, status } = useAccount()
    const { isAuthenticated, isSigningIn, signIn } = useAuth()
    const location = useLocation()

    // Defer redirect while wallet is connecting/reconnecting on page refresh
    if (status === 'connecting' || status === 'reconnecting') {
        return null
    }

    if (!isConnected) {
        return <Navigate to="/" replace state={{ from: location }} />
    }

    // Wallet is connected but user hasn't signed-in via SIWE yet
    if (!isAuthenticated && !isSigningIn) {
        // Trigger sign-in automatically
        signIn()
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <p style={{ color: '#666', fontSize: '1rem' }}>
                    Please sign the message in your wallet to continue…
                </p>
            </div>
        )
    }

    // Show loading while sign-in is in progress
    if (isSigningIn) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <p style={{ color: '#666', fontSize: '1rem' }}>
                    Verifying your wallet…
                </p>
            </div>
        )
    }

    return <>{children}</>
}

export default PrivateRoute
