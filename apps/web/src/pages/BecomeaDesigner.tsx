import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAccount, useChainId, useWatchContractEvent } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { getStorageJson } from '../utils/safeStorage'
import { hederaTestnet } from '../config/reownConfig'
import Header from '../component/Header'
import Footer from '../component/Footer'
import { SkeletonFormApplication } from '../component/Skeleton'
import { Upload, CheckCircle, Clock, X, ChevronDown } from 'lucide-react'
import { saveDesignerApplication, getDesignerApplicationByWallet, deleteDesignerApplication } from '../utils/storageApi'
import { designerRegisterPending } from '../onchain/adapter'
import { uploadMetadataToIPFS, getIPFSHash } from '../utils/ipfs'
import { publicClient, read } from '../onchain/client'
import { addresses, abis } from '../onchain/contracts'
import { createKycVerification } from '../api'

const BecomeaDesigner = () => {
    const navigate = useNavigate()
    const { address, isConnected } = useAccount()
    const chainId = useChainId()
    const { open } = useAppKit()
    const queryClient = useQueryClient()
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const { data: designerApplicationData, isLoading: isLoadingApplication } = useQuery({
        queryKey: ['designerApplication', address, isConnected],
        queryFn: async () => {
            if (!isConnected || !address) return { hasApplied: false, data: null }
            try {
                const existingApplication = await getDesignerApplicationByWallet(address)
                if (existingApplication) return { hasApplied: true, data: existingApplication }
                const designers = getStorageJson<any[]>('designers', [])
                const userDesigner = designers.find((designer: any) =>
                    designer.connectedWalletAddress?.toLowerCase() === address.toLowerCase() ||
                    designer.walletAddress?.toLowerCase() === address.toLowerCase()
                )
                if (userDesigner) return { hasApplied: true, data: userDesigner }
                return { hasApplied: false, data: null }
            } catch (_error) {
                const designers = getStorageJson<any[]>('designers', [])
                const userDesigner = designers.find((designer: any) =>
                    designer.connectedWalletAddress?.toLowerCase() === address.toLowerCase() ||
                    designer.walletAddress?.toLowerCase() === address.toLowerCase()
                )
                if (userDesigner) return { hasApplied: true, data: userDesigner }
                return { hasApplied: false, data: null }
            }
        }
    })

    const hasAlreadyApplied = designerApplicationData?.hasApplied ?? false
    const existingDesignerData = designerApplicationData?.data ?? null

    useWatchContractEvent({
        address: addresses.DONATE_ON_CHAIN as any,
        abi: abis.DonateOnChain as any,
        eventName: 'AccountVerified',
        onLogs: (logs) => {
            if (address && logs.some((l: any) => l.args?.account?.toLowerCase() === address.toLowerCase())) {
                showToast('Account verified.', 'success')
            }
        },
    })
    
    const [currentSection, setCurrentSection] = useState(1)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [country, setCountry] = useState('')
    const [primaryDesignField, setPrimaryDesignField] = useState('')
    const [experienceLevel, setExperienceLevel] = useState('')
    const [portfolioLink, setPortfolioLink] = useState('')
    const [sampleWorks, setSampleWorks] = useState<{ file: File; preview: string }[]>([])
    const [linkedinProfile, setLinkedinProfile] = useState('')
    const [socialHandle, setSocialHandle] = useState('')
    const [verificationDocument, setVerificationDocument] = useState<File | null>(null)
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [originalityConfirmed, setOriginalityConfirmed] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const designFieldOptions = [
        'UI/UX Design',
        'Illustration',
        'Branding',
        'Motion Design',
        '3D Design',
        'Web Design',
        'Graphic Design',
        'Product Design',
        'Other'
    ]

    const experienceOptions = [
        'Beginner',
        'Intermediate',
        'Expert'
    ]

    const handleSampleWorkRemove = (index: number) => {
        setSampleWorks((prev) => {
            const next = [...prev]
            const removed = next.splice(index, 1)[0]
            if (removed) URL.revokeObjectURL(removed.preview)
            return next
        })
    }

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'sample' | 'verification') => {
        const files = event.target.files
        if (!files || files.length === 0) return

        if (type === 'sample') {
            const remainingSlots = 5 - sampleWorks.length
            const toAdd = Array.from(files).slice(0, Math.max(remainingSlots, 0))
            if (toAdd.length) {
                const items = toAdd.map((file) => ({ file, preview: URL.createObjectURL(file) }))
                setSampleWorks((prev) => [...prev, ...items])
            }
        } else if (type === 'verification') {
            setVerificationDocument(files[0])
        }
    }

    const handleOpenWallet = async () => {
        open({ view: 'Connect' })
    }

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

    const isSection1Valid = () => {
        return fullName.trim() !== '' &&
               isValidEmail(email) &&
               username.trim() !== '' &&
               country !== ''
    }

    const isSection2Valid = () => {
        return primaryDesignField !== '' && 
               experienceLevel !== '' && 
               portfolioLink.trim() !== '' &&
               sampleWorks.length > 0
    }

    const isSection3Valid = () => {
        return true
    }

    const isSection4Valid = () => {
        return !!address
    }

    const isSection5Valid = () => {
        return termsAccepted && originalityConfirmed
    }

    const handleSubmit = async () => {
        if (!address) return
        
        let savedOk = false
        setIsSubmitting(true)
        try {
            if (chainId && chainId !== hederaTestnet.id) {
                showToast('Switch to Hedera Testnet and retry.', 'error')
                return
            }

            const pc = publicClient()
            if (!pc) {
                showToast('Unable to connect to network', 'error')
                return
            }
            const bal = await pc.getBalance({ address })
            if (bal === 0n) {
                showToast('Fund your Hedera Testnet account, then retry.', 'error')
                return
            }

            const sampleWorkHashes: string[] = []
            for (const item of sampleWorks) {
                const hash = await getIPFSHash(item.file)
                if (hash) sampleWorkHashes.push(hash)
            }

            let verificationDocHash = null
            if (verificationDocument) {
                verificationDocHash = await getIPFSHash(verificationDocument)
            }

            const metadata = {
                fullName,
                email,
                username,
                country,
                primaryDesignField,
                experienceLevel,
                portfolioLink,
                sampleWorkHashes,
                linkedinProfile,
                socialHandle,
                verificationDocHash,
                walletAddress: address
            }

            const metadataHash = await uploadMetadataToIPFS(metadata)

            if (!metadataHash) {
                showToast('Failed to upload metadata to IPFS.', 'error')
                return
            }

            const designerData: any = {
                id: Date.now(),
                fullName,
                email,
                username,
                country,
                primaryDesignField,
                experienceLevel,
                portfolioLink,
                sampleWorkHashes,
                linkedinProfile,
                socialHandle,
                verificationDocHash,
                walletAddress: address,
                connectedWalletAddress: address,
                metadataHash,
                verified: false,
                createdAt: new Date().toISOString()
            }

            await saveDesignerApplication(designerData)
            savedOk = true
            try {
                await createKycVerification({ walletAddress: address, metadata })
            } catch {}
            
            try {
                let needsOnChainRegistration = true
                try {
                    const isKyc = await read<boolean>({ address: addresses.DONATE_ON_CHAIN as any, abi: abis.DonateOnChain as any, functionName: 'isKycVerified', args: [address] })
                    if (isKyc) needsOnChainRegistration = false
                } catch (_checkError) {
                    //
                }

                if (needsOnChainRegistration) {
                    const receipt = await designerRegisterPending({ name: fullName, bio: `${primaryDesignField} designer with ${experienceLevel} experience`, portfolioHash: sampleWorkHashes[0] || '', profileImageHash: '' })
                    if (receipt?.transactionHash) {
                        const updatedDesignerData = { ...designerData, transactionHash: receipt.transactionHash }
                        await saveDesignerApplication(updatedDesignerData)
                    }
                    showToast('Designer application submitted on-chain with IPFS metadata.', 'success')
                } else {
                    showToast('Designer application saved to database. Your previous application is being reviewed.', 'success')
                }
            } catch (e: any) {
                const msg = String(e?.message || e)
                if (msg.includes('DesignerAlreadyRegistered')) {
                    showToast('This wallet address is already registered as a designer on-chain. Application saved to database.', 'success')
                } else if (msg.includes('Sender account not found')) {
                    showToast('Sender account not found. Fund Hedera Testnet account and retry.', 'error')
                } else if (msg.includes('EmptyMetadata')) {
                    showToast('Metadata is required for registration.', 'error')
                } else {
                    showToast('On-chain designer registration failed. Application saved to database.', 'error')
                }
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('On-chain designer registration failed', e)
                }
            }
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.log('Designer application saved to API')
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Error saving designer application to API:', error)
            }
            setSubmitError('Failed to save designer application. Please try again.')
        } finally {
            setIsSubmitting(false)
            if (savedOk) setShowSuccessModal(true)
        }
    }

    const nextSection = () => {
        if (currentSection < 5) {
            setCurrentSection(currentSection + 1)
        }
    }

    const prevSection = () => {
        if (currentSection > 1) {
            setCurrentSection(currentSection - 1)
        }
    }

    const canProceed = () => {
        switch (currentSection) {
            case 1: return isSection1Valid()
            case 2: return isSection2Valid()
            case 3: return isSection3Valid()
            case 4: return isSection4Valid()
            case 5: return isSection5Valid()
            default: return false
        }
    }

    return (
        <div>
            <Header />
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-sm">{toast.msg}</span>
                        <button className="text-white/80" onClick={() => setToast(null)}>×</button>
                    </div>
                </div>
            )}
            
            {isConnected && isLoadingApplication && (
                <SkeletonFormApplication />
            )}

            {!isConnected && (
                <section className="px-4 md:px-7 py-20 bg-gray-50 min-h-[60vh] flex items-center">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-black mb-4">Connect Wallet to Continue</h2>
                            <p className="text-gray-600 mb-6">Please connect your wallet to apply to become a designer.</p>
                            <button
                                onClick={handleOpenWallet}
                                className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {isConnected && hasAlreadyApplied && (
                <section className="px-4 md:px-7 py-20 bg-gray-50 min-h-[60vh] flex items-center">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm">
                            {existingDesignerData?.status === 'approved' ? (
                                <>
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                        Your Designer Profile Has Been Created!
                                    </h1>
                                    <p className="text-gray-600 mb-4 text-lg">
                                        Congratulations! Your designer profile has been approved. You can now start creating designs.
                                    </p>
                                    
                                    <div className="flex items-center justify-center mb-6">
                                        <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                                            🎨 Designer
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Status: <span className="font-semibold text-green-600">Approved</span>
                                        </p>
                                        {existingDesignerData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Name:</span> {existingDesignerData.fullName || existingDesignerData.name}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Approved:</span> {existingDesignerData.statusUpdatedAt ? new Date(existingDesignerData.statusUpdatedAt).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => navigate('/user-profile')}
                                            className="bg-white text-black border border-gray-300 rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            Go to Profile
                                        </button>
                                        <button
                                            onClick={() => navigate('/create-design')}
                                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                                        >
                                            Create Your First Design
                                        </button>
                                    </div>
                                </>
                            ) : existingDesignerData?.status === 'rejected' ? (
                                <>
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                        Your Designer Application Has Been Rejected
                                    </h1>
                                    <p className="text-gray-600 mb-6 text-lg">
                                        We regret to inform you that your designer application has been rejected. Please review the reason below.
                                    </p>
                                    {existingDesignerData?.rejectionReason && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-left">
                                            <p className="text-sm font-medium text-red-800 mb-2">Reason for Rejection:</p>
                                            <p className="text-sm text-red-700">{existingDesignerData.rejectionReason}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        {existingDesignerData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Name:</span> {existingDesignerData.fullName || existingDesignerData.name}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Rejected:</span> {existingDesignerData.statusUpdatedAt ? new Date(existingDesignerData.statusUpdatedAt).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => {
queryClient.invalidateQueries({ queryKey: ['designerApplication', address, isConnected] })
                                                if (address) {
                                                    deleteDesignerApplication(address).catch(() => {})
                                                }
                                            }}
                                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                                        >
                                            Apply Again
                                        </button>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="bg-white text-black border border-gray-300 rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            Back to Home
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Clock className="w-10 h-10 text-yellow-600" />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                        Application Under Review
                                    </h1>
                                    <p className="text-gray-600 mb-6 text-lg">
                                        Your designer application has been submitted and is awaiting verification by our admin team.
                                    </p>
                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Status: <span className="font-semibold text-yellow-600">Pending Verification</span>
                                        </p>
                                        {existingDesignerData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Name:</span> {existingDesignerData.fullName || existingDesignerData.name}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Submitted:</span> {existingDesignerData.createdAt ? new Date(existingDesignerData.createdAt).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                                    >
                                        Back to Home
                                    </button>
                                        <button
                                            onClick={async () => {
                                                if (!address) return
                                                const confirmed = window.confirm('Withdraw your designer application? This will delete your submission.')
                                                if (!confirmed) return
                                                try {
                                                    await deleteDesignerApplication(address)
                                                } catch {}
                                                try {
                                                    const designers = getStorageJson<any[]>('designers', [])
                                                    const filtered = designers.filter((d: any) => (d.connectedWalletAddress || d.walletAddress || '').toLowerCase() !== address.toLowerCase())
                                                    localStorage.setItem('designers', JSON.stringify(filtered))
                                                } catch {}
queryClient.invalidateQueries({ queryKey: ['designerApplication', address, isConnected] })
                                            }}
                                            className="bg-red-600 text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-red-700 transition-colors"
                                        >
                                            Withdraw Application
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {isConnected && !isLoadingApplication && !hasAlreadyApplied && (
                <section className="px-4 md:px-7 py-12 bg-gray-50">
                    <div className="max-w-4xl mx-auto">
                
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-black mb-2">
                            Become a Verified Designer on DonateOnchain
                        </h1>
                        <p className="text-gray-600 mb-2">
                            Join our community of designers and start creating impactful designs. Complete the form below.
                        </p>
                        
                        </div>

                
                    <div className="flex justify-center mb-8 gap-2">
                        {[
                            { step: 1, label: 'Details' },
                            { step: 2, label: 'Expertise' },
                            { step: 3, label: 'Social' },
                            { step: 4, label: 'Wallet' },
                            { step: 5, label: 'Review' }
                        ].map(({ step, label }) => (
                            <div key={step} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                        currentSection === step ? 'bg-black text-white' :
                                        currentSection > step ? 'bg-green-500 text-white' :
                                        'bg-gray-300 text-gray-600'
                                    }`}>
                                        {currentSection > step ? '✓' : step}
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1">{label}</span>
                                </div>
                                {step < 5 && (
                                    <div className={`w-12 h-1 mx-1 ${
                                        currentSection > step ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>


                                {currentSection === 1 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 1: Personal & contact info</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Full Name <span className="text-red-500">*</span>
                                </label>
                                            <input
                                                type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                                placeholder="Enter your full name"
                                            />
                                        </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    2. Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${email.trim() && !isValidEmail(email) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="your.email@example.com"
                                />
                                {email.trim() && !isValidEmail(email) && (
                                    <p className="text-red-500 text-xs mt-1">Enter a valid email address.</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    3. Username / Display Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="Choose a username"
                                />
                            </div>
                          
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    4. Country / Location <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    >
                                        <option value="">Select a country</option>
                                        <option value="Nigeria">Nigeria</option>
                                        <option value="Ghana">Ghana</option>
                                        <option value="Kenya">Kenya</option>
                                        <option value="South Africa">South Africa</option>
                                        <option value="United States">United States</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        <option value="Canada">Canada</option>
                                        <option value="India">India</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>
                        </div>
                    )}

                
                    {currentSection === 2 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 2: Design expertise</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Primary Design Field <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={primaryDesignField}
                                        onChange={(e) => setPrimaryDesignField(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    >
                                        <option value="">Select your primary design field</option>
                                        {designFieldOptions.map((field) => (
                                            <option key={field} value={field}>{field}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    2. Experience Level <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={experienceLevel}
                                        onChange={(e) => setExperienceLevel(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    >
                                        <option value="">Select experience level</option>
                                        {experienceOptions.map((level) => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    3. Portfolio Link (Dribbble, Behance, or personal site) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={portfolioLink}
                                    onChange={(e) => setPortfolioLink(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="https://your-portfolio.com"
                                            />
                                        </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    4. Upload Sample Works (max 3–5 files) <span className="text-red-500">*</span>
                                </label>
                                {sampleWorks.length > 0 && (
                                    <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {sampleWorks.map((item, index) => (
                                            <div
                                                key={index}
                                                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                                            >
                                                <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                    {!item.file.type || item.file.type.startsWith('image/') ? (
                                                        <img
                                                            src={item.preview}
                                                            alt={item.file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                                                            PDF
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between px-2 py-1 bg-white/90 text-xs">
                                                    <span className="truncate max-w-[80%] text-black">{item.file.name}</span>
                                                    <button
                                                        onClick={() => handleSampleWorkRemove(index)}
                                                        className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                                                        type="button"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sampleWorks.length < 5 && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                        <p className="text-sm text-gray-600 mb-2">Upload sample works (images or PDFs)</p>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            multiple
                                            onChange={(e) => handleFileInputChange(e, 'sample')}
                                            className="hidden"
                                            id="sample-work-upload"
                                        />
                                        <label htmlFor="sample-work-upload" className="inline-block cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                            Click to upload ({sampleWorks.length}/5)
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                  
                    {currentSection === 3 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 3: Social & verification (optional)</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. LinkedIn Profile (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={linkedinProfile}
                                    onChange={(e) => setLinkedinProfile(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="https://linkedin.com/in/yourname"
                                />
                                </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    2. Social Handle (Twitter / Instagram / X) (Optional)
                                </label>
                                                        <input
                                    type="text"
                                    value={socialHandle}
                                    onChange={(e) => setSocialHandle(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="@yourhandle"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    3. Verification Document (Optional; e.g., design certificate or ID)
                                                        </label>
                                {verificationDocument ? (
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                        <span className="text-sm text-black">{verificationDocument.name}</span>
                                        <button
                                            onClick={() => setVerificationDocument(null)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X size={16} />
                                        </button>
                                                    </div>
                                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                        <p className="text-sm text-gray-600 mb-2">Upload PDF or image file</p>
                                                        <input
                                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileInputChange(e, 'verification')}
                                                            className="hidden"
                                            id="verification-upload"
                                                        />
                                        <label htmlFor="verification-upload" className="inline-block cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                            Click to upload
                                                    </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                  
                    {currentSection === 4 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 4: Connect wallet</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Connect Your Wallet <span className="text-red-500">*</span>
                                </label>
                                {address ? (
                                    <div className="px-4 py-3 border border-green-300 rounded-lg bg-green-50">
                                        <div className="flex items-center justify-between">
                                                <div>
                                                <p className="text-sm text-green-800 font-medium">Wallet Connected</p>
                                                <p className="text-xs text-green-700 mt-1">{address.substring(0, 10)}...{address.substring(address.length - 8)}</p>
                                                </div>
                                                <div className="text-green-600">
                                                    <CheckCircle size={24} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleOpenWallet}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-black transition-colors text-black font-medium"
                                    >
                                        Connect Wallet
                                    </button>
                                )}
                            </div>

                        </div>
                    )}

                   
                    {currentSection === 5 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 5: Review & submit</h2>
                            <p className="text-sm text-gray-500 mb-8">Your application will be saved, sent for KYC, and submitted on-chain.</p>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    Review Your Information
                                </label>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <p><strong>Name:</strong> {fullName}</p>
                                    <p><strong>Email:</strong> {email}</p>
                                    <p><strong>Username:</strong> {username}</p>
                                    <p><strong>Country:</strong> {country}</p>
                                    <p><strong>Design Field:</strong> {primaryDesignField}</p>
                                    <p><strong>Experience:</strong> {experienceLevel}</p>
                                    <p><strong>Portfolio:</strong> {portfolioLink}</p>
                                    <p><strong>Sample Works:</strong> {sampleWorks.length} file(s)</p>
                                    {linkedinProfile && <p><strong>LinkedIn:</strong> {linkedinProfile}</p>}
                                    {socialHandle && <p><strong>Social Handle:</strong> {socialHandle}</p>}
                                </div>
                            </div>

                        
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    Terms & Conditions
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                                        />
                                        <span className="text-sm text-black">I agree to the Designer Terms and Conditions</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={originalityConfirmed}
                                            onChange={(e) => setOriginalityConfirmed(e.target.checked)}
                                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                                        />
                                        <span className="text-sm text-black">I confirm all submitted work is original and not AI-generated (unless stated)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

              
                    <div className="flex justify-between mt-8">
                                    <button
                                        onClick={prevSection}
                            disabled={currentSection === 1}
                            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                                currentSection === 1
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-200 text-black hover:bg-gray-300'
                            }`}
                                    >
                                        Previous
                                    </button>

                        {currentSection < 5 ? (
                                    <button
                                        onClick={nextSection}
                                        disabled={!canProceed()}
                                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                                    canProceed()
                                        ? 'bg-black text-white hover:bg-gray-800'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!canProceed()}
                                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                                    canProceed()
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        Submit Application
                                    </button>
                                )}
                        </div>
                    </div>
                </section>
            )}

            {isSubmitting && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-lg">
                        <div className="mx-auto mb-4 w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                        <h2 className="text-lg font-semibold text-black mb-2">Submitting application…</h2>
                        <p className="text-sm text-gray-600">
                            Please wait while we upload your files, save your application, and start verification.
                        </p>
                    </div>
                </div>
            )}

            {submitError && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <X className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-4">Application failed</h2>
                        <p className="text-gray-600 mb-6">{submitError}</p>
                        <button
                            onClick={() => setSubmitError(null)}
                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-4">Application Submitted!</h2>
                        <p className="text-gray-600 mb-6">Your designer application has been submitted successfully. Our team will review it shortly.</p>
                        <button
                            onClick={() => {
                                setShowSuccessModal(false)
                                setHasAlreadyApplied(true)
                            }}
                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                        >
                            View Status
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default BecomeaDesigner

