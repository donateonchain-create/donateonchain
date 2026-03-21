import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductPage from './pages/ProductPage'
import Cart from './pages/Cart'
import ScrollToTop from './component/ScrollToTop'
import { CartProvider } from './context/CartContext'
import Checkout from './pages/Checkout'
import UserProfile from './pages/UserProfile'
import Campaign from './pages/Campaign'
import CampaignDetails from './pages/CampaignDetails'
import HowItWorks from './pages/HowItWorks'
import CreateDesign from './pages/CreateDesign'
import BecomeanNgo from './pages/BecomeanNgo'
import BecomeaDesigner from './pages/BecomeaDesigner'
import Header from './component/Header'
import { Waitlist } from './waitlist'
import ProfileSetupModal from './component/ProfileSetupModal'
import PrivateRoute from './component/PrivateRoute'
import { ErrorBoundary } from './component/ErrorBoundary'
import { getStorageJson } from './utils/safeStorage'
import { getUserProfile, getNgoProfile } from './utils/storageApi'
import { AuthProvider } from './context/AuthContext'

const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === "true"

const MainAppRoutes = () => {
    const location = useLocation()
    const { isConnected, address } = useAccount()
    const [isDismissed, setIsDismissed] = useState(false)
    const isWaitlistPage = location.pathname === '/waitlist'
    const isAdminPage = location.pathname.startsWith('/admin')

    const { data: profileCheck } = useQuery({
        queryKey: ['profileCheck', address],
        queryFn: async () => {
            if (!address) return { completed: true, profile: null }
            
            const sessionKey = `profileSetupShown_${address}`
            if (sessionStorage.getItem(sessionKey) === 'true') {
                return { completed: true, profile: null }
            }
            
            if (localStorage.getItem('profileSetupCompleted') === 'true') {
                return { completed: true, profile: null }
            }
            
            try {
                const userProfile = await getUserProfile(address)
                const ngoProfile = await getNgoProfile(address)
                
                if (userProfile?.name && userProfile?.bio) {
                    localStorage.setItem('profileSetupCompleted', 'true')
                    return { completed: true, profile: null }
                }
                
                if (ngoProfile?.name && ngoProfile?.bio) {
                    localStorage.setItem('profileSetupCompleted', 'true')
                    return { completed: true, profile: null }
                }
                
                const profile = getStorageJson<{ name?: string; bio?: string } | null>('userProfile', null)
                if (profile?.name && profile?.bio) {
                    localStorage.setItem('profileSetupCompleted', 'true')
                    return { completed: true, profile: null }
                }
                
                const ngos = getStorageJson<any[]>('ngos', [])
                if (ngos.length > 0 && ngos[ngos.length - 1].ngoName && ngos[ngos.length - 1].missionStatement) {
                    localStorage.setItem('profileSetupCompleted', 'true')
                    return { completed: true, profile: null }
                }
                
                return { completed: false, profile }
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('Error checking profile:', error)
                }
                const profile = getStorageJson<{ name?: string; bio?: string } | null>('userProfile', null)
                if (profile?.name && profile?.bio) {
                    localStorage.setItem('profileSetupCompleted', 'true')
                    return { completed: true, profile: null }
                }
                return { completed: false, profile }
            }
        },
        enabled: isConnected && !!address && !isWaitlistPage && !isAdminPage,
        staleTime: Infinity
    })

    const showProfileSetup = profileCheck && !profileCheck.completed && !isDismissed && !isWaitlistPage
    const existingProfile = profileCheck?.profile || undefined

    const handleCloseProfileSetup = () => {
        setIsDismissed(true)
        localStorage.setItem('profileSetupCompleted', 'true')
        if (address) {
            sessionStorage.setItem(`profileSetupShown_${address}`, 'true')
        }
    }

    return (
        <>
            {!isWaitlistPage && !isAdminPage && <Header />}
            <ScrollToTop key={location.pathname} />
            <ProfileSetupModal key={existingProfile?.name || address || 'new'} isOpen={!!showProfileSetup && !isWaitlistPage} onClose={handleCloseProfileSetup} existingProfile={existingProfile} />
            <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/user-profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
                    <Route path="/campaign" element={<Campaign />} />
                    <Route path="/campaign/:id" element={<CampaignDetails />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/create-design" element={<PrivateRoute><CreateDesign /></PrivateRoute>} />
                    <Route path="/become-an-ngo" element={<BecomeanNgo />} />
                    <Route path="/become-a-designer" element={<BecomeaDesigner />} />
                    <Route path="/waitlist" element={<Waitlist />} />
            </Routes>
        </>
    )
}

const App = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
            <CartProvider>
                <Router>
                    {WAITLIST_MODE ? (
                        <Routes>
                            <Route path="/waitlist" element={<Waitlist />} />
                            <Route path="*" element={<Navigate to="/waitlist" replace />} />
                        </Routes>
                    ) : (
                        <MainAppRoutes />
                    )}
                </Router>
            </CartProvider>
            </AuthProvider>
        </ErrorBoundary>
    )
}

export default App;