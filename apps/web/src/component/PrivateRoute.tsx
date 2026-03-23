import { useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { useAuth } from '../context/AuthContext'
import { getKycVerifications } from '../api'
import KycModal from './KycModal'
import { isKycVerifiedOnChain } from '../onchain/adapter'
import { isDesignerApplicationApproved, isNgoApplicationApproved } from '../utils/storageApi'
import { useNgoApplicationQuery } from '../hooks/useNgoApplicationQuery'
import { useDesignerApplicationQuery } from '../hooks/useDesignerApplicationQuery'

function SiweSignInLauncher({ signIn }: { signIn: () => void }) {
    const ran = useRef(false)
    if (!ran.current) {
        ran.current = true
        queueMicrotask(() => {
            void signIn()
        })
    }
    return null
}

interface PrivateRouteProps {
    children: React.ReactNode
    mode?: 'auth' | 'kyc'
    requireNgoApproved?: boolean
    requireDesignerApproved?: boolean
    requireSiwe?: boolean
}

const PrivateRoute = ({
    children,
    mode = 'auth',
    requireNgoApproved = false,
    requireDesignerApproved = false,
    requireSiwe = true,
}: PrivateRouteProps) => {
    const { isConnected, status } = useAccount()
    const { isAuthenticated, isSigningIn, signIn, error: authError } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const { address } = useAccount()
    const { data: ngoApplicationState, isLoading: isNgoApplicationLoading } = useNgoApplicationQuery({
        enabled: requireNgoApproved,
        useWalletSignature: requireNgoApproved,
    })
    const { data: designerApplicationState, isLoading: isDesignerApplicationLoading } = useDesignerApplicationQuery({
        enabled: requireDesignerApproved,
    })
    const { data: kycData, isLoading: isKycLoading, isError: isKycError, refetch: refetchKyc } = useQuery({
        queryKey: ['routeKyc', address],
        queryFn: () => getKycVerifications({ walletAddress: address, page: 1, limit: 1 }),
        enabled: mode === 'kyc' && isConnected && !!address,
        staleTime: 30000,
    })
    const { data: isOnChainKyc, isLoading: isOnChainKycLoading, refetch: refetchOnChainKyc } = useQuery({
        queryKey: ['routeKycOnChain', address],
        queryFn: () => isKycVerifiedOnChain(address as `0x${string}`),
        enabled: mode === 'kyc' && isConnected && !!address,
        staleTime: 30000,
    })

    // Defer redirect while wallet is connecting/reconnecting on page refresh
    if (status === 'connecting' || status === 'reconnecting') {
        return null
    }

    if (!isConnected) {
        return <Navigate to="/" replace state={{ from: location }} />
    }

    if (requireNgoApproved) {
        if (isNgoApplicationLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Checking NGO application…
                    </p>
                </div>
            )
        }
        const ngoData = ngoApplicationState?.data ?? null
        if (!ngoApplicationState?.hasApplied || !isNgoApplicationApproved(ngoData)) {
            return <Navigate to="/become-an-ngo" replace state={{ from: location }} />
        }
    }

    if (requireDesignerApproved) {
        if (isDesignerApplicationLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Checking designer application…
                    </p>
                </div>
            )
        }
        const designerData = designerApplicationState?.data ?? null
        if (!designerApplicationState?.hasApplied || !isDesignerApplicationApproved(designerData)) {
            return <Navigate to="/become-a-designer" replace state={{ from: location }} />
        }
    }

    if (mode === 'kyc') {
        if (isKycLoading || isOnChainKycLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Checking KYC status…
                    </p>
                </div>
            )
        }

        if (isKycError) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Unable to verify KYC status right now.
                    </p>
                </div>
            )
        }

        const latest = kycData?.items?.[0]
        if (latest?.status !== 'approved' || !isOnChainKyc) {
            return (
                <>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                        <p style={{ color: '#666', fontSize: '1rem' }}>
                            KYC approval is required to access your profile.
                        </p>
                    </div>
                    <KycModal
                        isOpen
                        walletAddress={address}
                        isOnChainVerified={isOnChainKyc === true}
                        continueLabel="Continue"
                        onClose={() => navigate('/')}
                        onApproved={async () => {
                            await refetchKyc()
                            await refetchOnChainKyc()
                        }}
                        onRefresh={async () => {
                            await refetchKyc()
                            await refetchOnChainKyc()
                        }}
                    />
                </>
            )
        }

        return <>{children}</>
    }

    if (requireSiwe) {
        if (!isAuthenticated && !isSigningIn) {
            return (
                <>
                    <SiweSignInLauncher
                        key={`${address ?? ''}:${authError ?? ''}`}
                        signIn={signIn}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                        <p style={{ color: '#666', fontSize: '1rem' }}>
                            Please sign the message in your wallet to continue…
                        </p>
                    </div>
                </>
            )
        }

        if (isSigningIn) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Verifying your wallet…
                    </p>
                </div>
            )
        }
    }

    return <>{children}</>
}

export default PrivateRoute
