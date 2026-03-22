import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAccount, useWatchContractEvent, useSignMessage, useSwitchChain } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { getStorageJson } from '../utils/safeStorage'
import { hederaTestnet } from '../config/reownConfig'
import Header from '../component/Header'
import Footer from '../component/Footer'
import { SkeletonFormApplication } from '../component/Skeleton'
import { ChevronDown, Upload, CheckCircle, Clock, X } from 'lucide-react'
import { saveNgoApplication, deleteNgoApplication, persistNgoApplicationLocal, clearNgoApplicationLocal } from '../utils/storageApi'
import { useNgoApplicationQuery } from '../hooks/useNgoApplicationQuery'
import { ngoRegisterPending } from '../onchain/adapter'
import { uploadMetadataToIPFS, getIPFSHash } from '../utils/ipfs'
import { publicClient, read } from '../onchain/client'
import { addresses, abis } from '../onchain/contracts'
import { createKycVerification } from '../api'

const BecomeanNgo = () => {
    const navigate = useNavigate()
    const { address, isConnected, chainId } = useAccount()
    const { switchChainAsync } = useSwitchChain()
    const { signMessageAsync } = useSignMessage()
    const { open } = useAppKit()
    const queryClient = useQueryClient()
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const { data: ngoApplicationData, isLoading: isLoadingApplication } = useNgoApplicationQuery()

    const hasAlreadyApplied = ngoApplicationData?.hasApplied ?? false
    const existingNgoData: any = ngoApplicationData?.data ?? null

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
    const [ngoName, setNgoName] = useState('')
    const [email, setEmail] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [registrationNumber, setRegistrationNumber] = useState('')
    const [yearFounded, setYearFounded] = useState('')
    const [website, setWebsite] = useState('')
    const [organizationType, setOrganizationType] = useState('')
    const [focusAreas, setFocusAreas] = useState<string[]>([])
    const [addressInput, setAddressInput] = useState('')
    const [country, setCountry] = useState('')
    const [stateRegion, setStateRegion] = useState('')
    const [logo, setLogo] = useState<File | null>(null)
    const [annualReport, setAnnualReport] = useState<File | null>(null)
    const [registrationCert, setRegistrationCert] = useState<File | null>(null)
    const [accuracyConfirmed, setAccuracyConfirmed] = useState(false)
    const [policyAccepted, setPolicyAccepted] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [fileErrors, setFileErrors] = useState<{ logo?: string; annualReport?: string; registrationCert?: string }>({})
    const [showSection1Errors, setShowSection1Errors] = useState(false)
    const [showSection2Errors, setShowSection2Errors] = useState(false)

    const organizationTypeOptions = [
        'Charity',
        'Nonprofit',
        'Foundation',
        'Social Enterprise',
        'Community Organization',
        'Religious Organization',
        'Other'
    ]

    const focusAreaOptions = [
        'Education',
        'Health',
        'Environment',
        'Poverty Alleviation',
        'Human Rights',
        'Animal Welfare',
        'Disaster Relief',
        'Youth Development',
        'Women Empowerment',
        'Mental Health',
        'Clean Water',
        'Food Security',
        'Other'
    ]


    const handleFocusAreaToggle = (area: string) => {
        setFocusAreas(prev => 
            prev.includes(area) 
                ? prev.filter(c => c !== area)
                : [...prev, area]
        )
    }

    const handleFileUpload = (file: File, type: 'logo' | 'annualReport' | 'registration') => {
        if (type === 'logo') {
            setLogo(file); validateFile(file, 'logo')
        } else if (type === 'annualReport') {
            setAnnualReport(file); validateFile(file, 'annualReport')
        } else if (type === 'registration') {
            setRegistrationCert(file); validateFile(file, 'registrationCert')
        }
    }

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'annualReport' | 'registration') => {
        const file = event.target.files?.[0]
        if (file) {
            handleFileUpload(file, type)
        }
    }

    const handleOpenWallet = async () => {
        open({ view: 'Connect' })
    }

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    const isValidPhone = (v: string) => {
        const digits = v.replace(/\D/g, '')
        return digits.length >= 10 && digits.length <= 15
    }
    const currentYear = new Date().getFullYear()
    const isValidYearFounded = (v: string) => {
        const y = parseInt(v.trim(), 10)
        if (Number.isNaN(y)) return false
        return y >= 1900 && y <= currentYear
    }
    const isValidWebsite = (v: string) => {
        if (!v.trim()) return true
        return /^https?:\/\/.+/.test(v.trim())
    }
    const MAX_FILE_MB = 20
    const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const DOC_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
    const validateFile = (file: File | null, field: 'logo' | 'annualReport' | 'registrationCert') => {
        if (!file) { setFileErrors(prev => ({ ...prev, [field]: undefined })); return }
        const allowed = field === 'logo' ? LOGO_TYPES : DOC_TYPES
        if (!allowed.includes(file.type)) {
            setFileErrors(prev => ({ ...prev, [field]: field === 'logo' ? 'Logo must be a JPG, PNG or WebP.' : 'File must be a JPG, PNG or PDF.' }))
            return
        }
        const sizeMB = file.size / 1024 / 1024
        if (sizeMB > MAX_FILE_MB) {
            setFileErrors(prev => ({ ...prev, [field]: `File must be under ${MAX_FILE_MB}MB (yours is ${sizeMB.toFixed(1)}MB).` }))
            return
        }
        setFileErrors(prev => ({ ...prev, [field]: undefined }))
    }

    const isSection1Valid = () => {
        return ngoName.trim().length >= 2 &&
               isValidEmail(email) &&
               isValidPhone(phoneNumber) &&
               registrationNumber.trim().length >= 3 &&
               isValidYearFounded(yearFounded) &&
               isValidWebsite(website) &&
               organizationType !== '' &&
               focusAreas.length > 0 &&
               addressInput.trim() !== '' &&
               country !== '' &&
               stateRegion.trim() !== ''
    }

    const isSection2Valid = () => {
        return logo !== null && registrationCert !== null &&
               !fileErrors.logo && !fileErrors.annualReport && !fileErrors.registrationCert
    }

    const isSection3Valid = () => {
        return !!address
    }

    const isSection4Valid = () => {
        return accuracyConfirmed && policyAccepted
    }

    const handleSubmit = async () => {
        if (!address) return

        let savedOk = false
        setIsSubmitting(true)
        try {
            if (chainId && chainId !== hederaTestnet.id) {
                try {
                    await switchChainAsync({ chainId: hederaTestnet.id })
                } catch (err) {
                    showToast('Please switch your wallet network to Hedera Testnet.', 'error')
                    setIsSubmitting(false)
                    return
                }
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

            let logoIpfsHash = null
            let annualReportIpfsHash = null
            let registrationCertIpfsHash = null

            if (logo) {
                logoIpfsHash = await getIPFSHash(logo)
            }
            if (annualReport) {
                annualReportIpfsHash = await getIPFSHash(annualReport)
            }
            if (registrationCert) {
                registrationCertIpfsHash = await getIPFSHash(registrationCert)
            }

            const metadata = {
                name: ngoName,
                email,
                phoneNumber,
                registrationNumber,
                yearFounded,
                website,
                organizationType,
                focusAreas,
                address: addressInput,
                country,
                stateRegion,
                walletAddress: address,
                logoHash: logoIpfsHash,
                annualReportHash: annualReportIpfsHash,
                registrationCertHash: registrationCertIpfsHash
            }

            const metadataHash = await uploadMetadataToIPFS(metadata)

            if (!metadataHash) {
                showToast('Failed to upload metadata to IPFS.', 'error')
                return
            }

            const ngoData: any = {
                id: Date.now(),
                ngoName,
                email,
                phoneNumber,
                registrationNumber,
                yearFounded,
                website,
                organizationType,
                focusAreas,
                address: addressInput,
                country,
                stateRegion,
                walletAddress: address,
                connectedWalletAddress: address,
                logoHash: logoIpfsHash,
                annualReportHash: annualReportIpfsHash,
                registrationCertHash: registrationCertIpfsHash,
                metadataHash,
                verified: false,
                createdAt: new Date().toISOString()
            }

            const timestamp = Date.now().toString()
            const purpose = 'ngo_application_submit'
            const message = `DonateOnChain:${purpose}:${timestamp}`
            let signature
            try {
                signature = await signMessageAsync({ message })
            } catch (err: any) {
                console.error("Signature error 1:", err);
                showToast(`Signature error: ${err?.message || 'required to submit'}`, 'error')
                setIsSubmitting(false)
                return
            }
            const savedFirst = await saveNgoApplication(ngoData, signature, timestamp)
            if (!savedFirst) {
                setSubmitError('Failed to save NGO application. Please try again.')
                setIsSubmitting(false)
                return
            }
            persistNgoApplicationLocal(address, { ...ngoData, status: 'pending' })
            queryClient.invalidateQueries({ queryKey: ['ngoApplication', address, isConnected] })
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
                    const profileImageHash = logoIpfsHash || ''
                    const description = `${organizationType} focused on ${focusAreas.join(', ')}`
                    const receipt = await ngoRegisterPending({ name: ngoName, description, profileImageHash, metadataHash })
                    if (receipt?.transactionHash) {
                        const updatedNgoData = { ...ngoData, transactionHash: receipt.transactionHash }
                        const timestamp2 = Date.now().toString()
            const purpose2 = 'ngo_application_submit'
            const message2 = `DonateOnChain:${purpose2}:${timestamp2}`
            let signature2
            try {
                signature2 = await signMessageAsync({ message: message2 })
            } catch (err: any) {
                console.error("Signature error 2:", err);
                showToast(`Signature error: ${err?.message || 'required to update'}`, 'error')
                setIsSubmitting(false)
                return
            }
            const savedSecond = await saveNgoApplication(updatedNgoData, signature2, timestamp2)
                        if (savedSecond) {
                            persistNgoApplicationLocal(address, { ...updatedNgoData, status: 'pending' })
                            queryClient.invalidateQueries({ queryKey: ['ngoApplication', address, isConnected] })
                        }
                    }
                    showToast('NGO application submitted on-chain with IPFS metadata.', 'success')
                } else {
                    showToast('NGO application saved to database. Your previous application is being reviewed.', 'success')
                }
            } catch (e: any) {
                const msg = String(e?.message || e)
                if (msg.includes('NGOAlreadyRegistered')) {
                    showToast('This wallet address is already registered as an NGO on-chain. Application saved to database.', 'success')
                } else if (msg.includes('Sender account not found')) {
                    showToast('Sender account not found. Fund Hedera Testnet account and retry.', 'error')
                } else if (msg.includes('EmptyMetadata')) {
                    showToast('Metadata is required for registration.', 'error')
                } else {
                    showToast('On-chain NGO registration failed. Application saved to database.', 'error')
                }
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('On-chain NGO registration failed', e)
                }
            }
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.log('NGO application saved to API')
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Error saving NGO application to API:', error)
            }
            setSubmitError('Failed to save NGO application. Please try again.')
        } finally {
            setIsSubmitting(false)
            if (savedOk) setShowSuccessModal(true)
        }
    }

    const nextSection = () => {
        if (currentSection < 4) {
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
                            <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                Connect Your Wallet
                            </h1>
                            <p className="text-gray-600 mb-8 text-lg">
                                Please connect your wallet to apply to become an NGO.
                            </p>
                            <button
                                onClick={handleOpenWallet}
                                className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                </section>
            )}

          
            {isConnected && !isLoadingApplication && hasAlreadyApplied && (
                <section className="px-4 md:px-7 py-20 bg-gray-50 min-h-[60vh] flex items-center">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm">
                            {existingNgoData?.status === 'approved' ? (
                                <>
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                        Your NGO Profile Has Been Created!
                                    </h1>
                                    <p className="text-gray-600 mb-4 text-lg">
                                        Congratulations! Your NGO profile has been approved. You can now start creating fundraising campaigns and accepting crypto donations.
                                    </p>
                                    
                                    <div className="flex items-center justify-center mb-6">
                                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                                            🏢 NGO
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Status: <span className="font-semibold text-green-600">Approved</span>
                                        </p>
                                        {existingNgoData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Organization:</span> {existingNgoData.ngoName}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Approved:</span> {existingNgoData.statusUpdatedAt ? new Date(existingNgoData.statusUpdatedAt).toLocaleDateString() : '—'}
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
                                            onClick={() => navigate('/user-profile')}
                                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                                        >
                                            Create Campaign
                                        </button>
                                    </div>
                                </>
                            ) : existingNgoData?.status === 'rejected' ? (
                                <>
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                                        Your NGO Profile Has Been Rejected
                                    </h1>
                                    <p className="text-gray-600 mb-6 text-lg">
                                        We regret to inform you that your NGO application has been rejected. Please review the reason below.
                                    </p>
                                    {existingNgoData?.rejectionReason && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-left">
                                            <p className="text-sm font-medium text-red-800 mb-2">Reason for Rejection:</p>
                                            <p className="text-sm text-red-700">{existingNgoData.rejectionReason}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        {existingNgoData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Organization:</span> {existingNgoData.ngoName}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Rejected:</span> {existingNgoData.statusUpdatedAt ? new Date(existingNgoData.statusUpdatedAt).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => {
                                                if (address) clearNgoApplicationLocal(address)
                                                queryClient.invalidateQueries({ queryKey: ['ngoApplication', address, isConnected] })
                                                if (address) {
                                                    deleteNgoApplication(address).catch(() => {})
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
                                        Application Submitted Successfully!
                                    </h1>
                                    <p className="text-gray-600 mb-6 text-lg">
                                        You have already submitted your application to become an NGO.
                                    </p>
                                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Status: <span className="font-semibold text-yellow-600">Awaiting Verification</span>
                                        </p>
                                        {existingNgoData && (
                                            <div className="text-left space-y-2">
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Organization:</span> {existingNgoData.ngoName}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Submitted:</span> {new Date(existingNgoData.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-medium text-black">Email:</span> {existingNgoData.email || existingNgoData.contactEmail}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mb-8">
                                        Our team is reviewing your application. You'll receive a notification once your NGO profile is approved — after which you can start creating fundraising campaigns and accepting crypto donations.
                                    </p>
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
                                                const confirmed = window.confirm('Withdraw your NGO application? This will delete your submission.')
                                                if (!confirmed) return
                                                try {
                                                    clearNgoApplicationLocal(address)
                                                    await deleteNgoApplication(address)
                                                } catch {}
                                                try {
                                                    const ngos = getStorageJson<any[]>('ngos', [])
                                                    const filtered = ngos.filter((n: any) => (n.connectedWalletAddress || n.walletAddress || '').toLowerCase() !== address.toLowerCase())
                                                    localStorage.setItem('ngos', JSON.stringify(filtered))
                                                } catch {}
                                                queryClient.invalidateQueries({ queryKey: ['ngoApplication', address, isConnected] })
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
                            Become a Verified NGO on DonateOnchain
                        </h1>
                        <p className="text-gray-600 mb-2">
                            To help us verify your organization and enable crypto donations, please complete the form below carefully.
                        </p>
                    </div>

                
                    <div className="flex justify-center mb-8 gap-2">
                        {[
                            { step: 1, label: 'Details' },
                            { step: 2, label: 'Documents' },
                            { step: 3, label: 'Wallet' },
                            { step: 4, label: 'Review' }
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
                                {step < 4 && (
                                    <div className={`w-12 h-1 mx-1 ${
                                        currentSection > step ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>

                  
                    {currentSection === 1 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 1: Organization details</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Organization Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={ngoName}
                                    onChange={(e) => setNgoName(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${showSection1Errors && ngoName.trim().length < 2 ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter your organization's registered name"
                                />
                                {showSection1Errors && ngoName.trim() === '' && (
                                    <p className="text-red-500 text-xs mt-1">Organization name is required.</p>
                                )}
                                {ngoName.trim().length > 0 && ngoName.trim().length < 2 && (
                                    <p className="text-red-500 text-xs mt-1">Name must be at least 2 characters.</p>
                                )}
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
                                    placeholder="contact@yourngo.org"
                                />
                                {email.trim() && !isValidEmail(email) && (
                                    <p className="text-red-500 text-xs mt-1">Enter a valid email address.</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    3. Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${phoneNumber.trim() && !isValidPhone(phoneNumber) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="+1234567890 or 1234567890"
                                />
                                {phoneNumber.trim() && !isValidPhone(phoneNumber) && (
                                    <p className="text-red-500 text-xs mt-1">Enter a valid phone number (10–15 digits).</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    4. Registration Number / CAC Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${registrationNumber.trim().length > 0 && registrationNumber.trim().length < 3 ? 'border-red-500' : showSection1Errors && registrationNumber.trim() === '' ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter your registration number"
                                />
                                {registrationNumber.trim().length > 0 && registrationNumber.trim().length < 3 && (
                                    <p className="text-red-500 text-xs mt-1">Registration number must be at least 3 characters.</p>
                                )}
                                {showSection1Errors && registrationNumber.trim() === '' && (
                                    <p className="text-red-500 text-xs mt-1">Registration number is required.</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    5. Year Founded <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={yearFounded}
                                    onChange={(e) => setYearFounded(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${yearFounded.trim() && !isValidYearFounded(yearFounded) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder={`e.g. 2020 (1900–${currentYear})`}
                                    min={1900}
                                    max={currentYear}
                                />
                                {yearFounded.trim() && !isValidYearFounded(yearFounded) && (
                                    <p className="text-red-500 text-xs mt-1">Enter a year between 1900 and {currentYear}.</p>
                                )}
                            </div>
                          
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    6. Website (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${website.trim() && !isValidWebsite(website) ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="https://yourngo.org"
                                />
                                {website.trim() && !isValidWebsite(website) && (
                                    <p className="text-red-500 text-xs mt-1">Website must start with http:// or https://</p>
                                )}
                                <p className="text-gray-400 text-xs mt-1">Leave blank if you don't have a website.</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    7. Organization Type <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={organizationType}
                                        onChange={(e) => setOrganizationType(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    >
                                        <option value="">Select organization type</option>
                                        {organizationTypeOptions.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>
                          
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    8. Focus Areas / Causes <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {focusAreaOptions.map((area) => (
                                        <label key={area} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={focusAreas.includes(area)}
                                                onChange={() => handleFocusAreaToggle(area)}
                                                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                                            />
                                            <span className="text-sm text-black">{area}</span>
                                        </label>
                                    ))}
                                </div>
                                {showSection1Errors && focusAreas.length === 0 && (
                                    <p className="text-red-500 text-xs mt-2">Please select at least one focus area.</p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    9. Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addressInput}
                                    onChange={(e) => setAddressInput(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="Enter your organization's official address"
                                />
                            </div>
                        
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    10. Country <span className="text-red-500">*</span>
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
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>
                          
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    11. State/Region <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={stateRegion}
                                    onChange={(e) => setStateRegion(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="Enter state or region"
                                />
                            </div>
                        </div>
                    )}

                
                    {currentSection === 2 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 2: Verification documents</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Upload your Logo <span className="text-red-500">*</span>
                                </label>
                                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${fileErrors.logo ? 'border-red-400 bg-red-50' : logo ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                                    {logo ? (
                                        <div className="flex items-center justify-center gap-3 text-green-700">
                                            <CheckCircle size={20} />
                                            <span className="text-sm font-medium">{logo.name}</span>
                                            <span className="text-xs text-gray-400">({(logo.size/1024/1024).toFixed(2)}MB)</span>
                                            <button onClick={() => { setLogo(null); setFileErrors(p => ({ ...p, logo: undefined })) }} className="ml-2 text-red-500 hover:text-red-700" title="Remove"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                            <p className="text-sm text-gray-600">JPG, PNG or WebP — max 20MB</p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                onChange={(e) => handleFileInputChange(e, 'logo')}
                                                className="hidden"
                                                id="logo-upload"
                                            />
                                            <label htmlFor="logo-upload" className="mt-2 inline-block cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                                Click to upload
                                            </label>
                                        </>
                                    )}
                                </div>
                                {fileErrors.logo && <p className="text-red-500 text-xs mt-1">{fileErrors.logo}</p>}
                                {showSection2Errors && !logo && !fileErrors.logo && <p className="text-red-500 text-xs mt-1">Logo is required.</p>}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    2. Upload Annual Report / Portfolio (Optional)
                                </label>
                                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${fileErrors.annualReport ? 'border-red-400 bg-red-50' : annualReport ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                                    {annualReport ? (
                                        <div className="flex items-center justify-center gap-3 text-green-700">
                                            <CheckCircle size={20} />
                                            <span className="text-sm font-medium">{annualReport.name}</span>
                                            <span className="text-xs text-gray-400">({(annualReport.size/1024/1024).toFixed(2)}MB)</span>
                                            <button onClick={() => { setAnnualReport(null); setFileErrors(p => ({ ...p, annualReport: undefined })) }} className="ml-2 text-red-500 hover:text-red-700" title="Remove"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                            <p className="text-sm text-gray-600">PDF, JPG or PNG — max 20MB</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileInputChange(e, 'annualReport')}
                                                className="hidden"
                                                id="annualReport-upload"
                                            />
                                            <label htmlFor="annualReport-upload" className="mt-2 inline-block cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                                Click to upload
                                            </label>
                                        </>
                                    )}
                                </div>
                                {fileErrors.annualReport && <p className="text-red-500 text-xs mt-1">{fileErrors.annualReport}</p>}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    3. Upload Certificate of Registration <span className="text-red-500">*</span>
                                </label>
                                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${fileErrors.registrationCert ? 'border-red-400 bg-red-50' : registrationCert ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                                    {registrationCert ? (
                                        <div className="flex items-center justify-center gap-3 text-green-700">
                                            <CheckCircle size={20} />
                                            <span className="text-sm font-medium">{registrationCert.name}</span>
                                            <span className="text-xs text-gray-400">({(registrationCert.size/1024/1024).toFixed(2)}MB)</span>
                                            <button onClick={() => { setRegistrationCert(null); setFileErrors(p => ({ ...p, registrationCert: undefined })) }} className="ml-2 text-red-500 hover:text-red-700" title="Remove"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                            <p className="text-sm text-gray-600">PDF, JPG or PNG — max 20MB</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileInputChange(e, 'registration')}
                                                className="hidden"
                                                id="registration-upload"
                                            />
                                            <label htmlFor="registration-upload" className="mt-2 inline-block cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                                Click to upload
                                            </label>
                                        </>
                                    )}
                                </div>
                                {fileErrors.registrationCert && <p className="text-red-500 text-xs mt-1">{fileErrors.registrationCert}</p>}
                                {showSection2Errors && !registrationCert && !fileErrors.registrationCert && <p className="text-red-500 text-xs mt-1">Registration certificate is required.</p>}
                            </div>
                        </div>
                    )}

                  
                    {currentSection === 3 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 3: Connect wallet</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    1. Connect Your Wallet <span className="text-red-500">*</span>
                                </label>
                                {address ? (
                                    <div className="px-4 py-3 border border-green-300 rounded-lg bg-green-50">
                                        <p className="text-sm text-green-800">Connected: {address.substring(0, 10)}...{address.substring(address.length - 8)}</p>
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

                   
                    {currentSection === 4 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-black mb-8">Step 4: Review & submit</h2>
                            <div className="mt-6 mb-6">
                                <label className="block text-sm font-medium text-black mb-2">
                                    Review Your Information
                                </label>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <p><strong>Organization Name:</strong> {ngoName}</p>
                                    <p><strong>Email:</strong> {email}</p>
                                    <p><strong>Phone:</strong> {phoneNumber}</p>
                                    <p><strong>Registration Number:</strong> {registrationNumber}</p>
                                    <p><strong>Year Founded:</strong> {yearFounded}</p>
                                    <p><strong>Organization Type:</strong> {organizationType}</p>
                                    <p><strong>Focus Areas:</strong> {focusAreas.join(', ')}</p>
                                    <p><strong>Country:</strong> {country}</p>
                                    <p><strong>Address:</strong> {addressInput}</p>
                                    <p><strong>State/Region:</strong> {stateRegion}</p>
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
                                            checked={accuracyConfirmed}
                                            onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                                        />
                                        <span className="text-sm text-black">I confirm that all information provided is accurate.</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={policyAccepted}
                                            onChange={(e) => setPolicyAccepted(e.target.checked)}
                                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                                        />
                                        <span className="text-sm text-black">I agree to DonateOnchain's verification and transparency policy.</span>
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
                        
                        {currentSection < 4 ? (
                            <button
                                onClick={() => {
                                    if (!canProceed()) {
                                        if (currentSection === 1) setShowSection1Errors(true)
                                        if (currentSection === 2) setShowSection2Errors(true)
                                        showToast('Please fix the errors above before continuing.', 'error')
                                        return
                                    }
                                    nextSection()
                                }}
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
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-lg">
                        <div className="mx-auto mb-4 w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                        <h2 className="text-lg font-semibold text-black mb-2">Submitting application…</h2>
                        <p className="text-sm text-gray-600">
                            Please wait while we upload your documents, save your application, and start verification.
                        </p>
                    </div>
                </div>
            )}

            {submitError && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-2">Application failed</h2>
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-black mb-2">🎉 Thank you for applying!</h2>
                        <p className="text-gray-600 mb-6">
                            Your NGO profile has been submitted for verification.
                            You'll receive a notification once approved — after which you can start creating fundraising campaigns and accepting crypto donations.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-black text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default BecomeanNgo
