import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import { adminRoutes } from './admin'
import Header from './component/Header'
import { Waitlist } from './waitlist'
import ProfileSetupModal from './component/ProfileSetupModal'
import PrivateRoute from './component/PrivateRoute'
import { getUserProfile, getNgoProfile } from './utils/firebaseStorage'

const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === "true"

const MainAppRoutes = () => {
    const location = useLocation()
    const { isConnected, address } = useAccount()
    const [showProfileSetup, setShowProfileSetup] = useState(false)
    const [existingProfile, setExistingProfile] = useState<any>(null)
    const isWaitlistPage = location.pathname === '/waitlist'
    const isAdminPage = location.pathname.startsWith('/admin')

    useEffect(() => {
        const checkProfileExists = async () => {
            if (location.pathname === '/waitlist') return
            if (isConnected && address) {
                const sessionKey = `profileSetupShown_${address}`
                const shownThisSession = sessionStorage.getItem(sessionKey)
                
                if (shownThisSession === 'true') {
                    setShowProfileSetup(false)
                    return
                }
                
                const profileSetupCompleted = localStorage.getItem('profileSetupCompleted')
                if (profileSetupCompleted === 'true') {
                    setShowProfileSetup(false)
                    return
                }
                
                try {
                    const userProfile = await getUserProfile(address)
                    const ngoProfile = await getNgoProfile(address)
                    
                    if (userProfile && userProfile.name && userProfile.bio) {
                        setShowProfileSetup(false)
                        localStorage.setItem('profileSetupCompleted', 'true')
                        return
                    }
                    
                    if (ngoProfile && ngoProfile.name && ngoProfile.bio) {
                        setShowProfileSetup(false)
                        localStorage.setItem('profileSetupCompleted', 'true')
                        return
                    }
                    
                    const savedProfile = localStorage.getItem('userProfile')
                    if (savedProfile) {
                        const profile = JSON.parse(savedProfile)
                        if (profile.name && profile.bio) {
                            setShowProfileSetup(false)
                            localStorage.setItem('profileSetupCompleted', 'true')
                            return
                        }
                        setExistingProfile(profile)
                    }
                    
                    const ngos = JSON.parse(localStorage.getItem('ngos') || '[]')
                    if (ngos.length > 0 && ngos[ngos.length - 1].ngoName && ngos[ngos.length - 1].missionStatement) {
                        setShowProfileSetup(false)
                        localStorage.setItem('profileSetupCompleted', 'true')
                        return
                    }
                    
                    setShowProfileSetup(true)
                } catch (error) {
                    console.error('Error checking profile:', error)
                  
                    const savedProfile = localStorage.getItem('userProfile')
                    if (savedProfile) {
                        const profile = JSON.parse(savedProfile)
                        if (profile.name && profile.bio) {
                            setShowProfileSetup(false)
                            localStorage.setItem('profileSetupCompleted', 'true')
                            return
                        }
                        setExistingProfile(profile)
                    }
                    
                    setShowProfileSetup(true)
                }
            }
        }
        
        checkProfileExists()
    }, [isConnected, address, location.pathname])

    const handleCloseProfileSetup = () => {
        setShowProfileSetup(false)
        localStorage.setItem('profileSetupCompleted', 'true')
        if (address) {
            sessionStorage.setItem(`profileSetupShown_${address}`, 'true')
        }
    }

    return (
        <>
            {!isWaitlistPage && !isAdminPage && <Header />}
            <ScrollToTop />
            <ProfileSetupModal isOpen={showProfileSetup && !isWaitlistPage} onClose={handleCloseProfileSetup} existingProfile={existingProfile} />
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
                    {adminRoutes}
                <Route path="/waitlist" element={<Waitlist />} />
            </Routes>
        </>
    )
}

const App = () => {
    return (
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
    )
}

export default App;