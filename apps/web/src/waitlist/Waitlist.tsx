import React, { useState, useEffect, useRef } from 'react'
import WaitlistImg from './WaitlistImg.webp'
import WaitlistImg4 from './WaitlistImg4.webp'
import WaitlistImg5 from './WaitlistImg5.webp'
import WaitlistImg6 from './WaitlistImg6.webp'

import DonateLogoWhite from './DonateLogoWhite.png'
import BannerNft from './BannerNft.webp'
import Banner2Img from './banner2img.webp'
import Banner1Img from './banner1img.webp'

import FooterLogoWhite from './FooterLogoWhite.png'
import Button from '../component/Button'

const COOLDOWN_MS = 30000

// In-memory rate limiting to prevent basic rapid-fire UI submissions
const submissionLog = new Map<string, number>()

const Waitlist = () => {
    const sectionRef = useRef<HTMLElement>(null)
    const howItWorksRef = useRef<HTMLElement>(null)
    const step1Ref = useRef<HTMLDivElement>(null)
    const step2Ref = useRef<HTMLDivElement>(null)
    const step3Ref = useRef<HTMLDivElement>(null)
    const [headerVisible, setHeaderVisible] = useState(false)
    const [step1Visible, setStep1Visible] = useState(false)
    const [step2Visible, setStep2Visible] = useState(false)
    const [step3Visible, setStep3Visible] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('')
    const [emailError, setEmailError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [joinError, setJoinError] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [nextAllowedTime, setNextAllowedTime] = useState<number | null>(null)

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setEmail(value)
        if (value.trim() && !validateEmail(value)) {
            setEmailError('Please enter a valid email address')
        } else {
            setEmailError('')
        }
    }
    const heroRef = useRef<HTMLDivElement>(null)
    const secondHeaderRef = useRef<HTMLElement>(null)
    const whoIsForRef = useRef<HTMLElement>(null)
    const waitlistFormRef = useRef<HTMLElement>(null)
    const [heroVisible, setHeroVisible] = useState(false)
    const [heroImageLoaded, setHeroImageLoaded] = useState(false)
    const [secondHeaderVisible, setSecondHeaderVisible] = useState(false)
    const [whoIsForVisible, setWhoIsForVisible] = useState(false)
    const [waitlistFormVisible, setWaitlistFormVisible] = useState(false)
    const [isSecondHeaderSticky, setIsSecondHeaderSticky] = useState(false)
    const secondHeaderOriginalTopRef = useRef<number | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const syncOfflineQueue = () => {
            import('./waitlistApi')
                .then(({ flushOfflineWaitlistQueue }) => flushOfflineWaitlistQueue().catch(() => undefined))
                .catch(() => undefined)
        }

        syncOfflineQueue()

        const handleOnline = () => {
            syncOfflineQueue()
        }

        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            if (!secondHeaderRef.current) return

            if (secondHeaderOriginalTopRef.current === null) {
                secondHeaderOriginalTopRef.current = secondHeaderRef.current.offsetTop
            }

            const originalTop = secondHeaderOriginalTopRef.current
            if (originalTop !== null) {
                const currentScrollY = window.scrollY
                setIsSecondHeaderSticky(currentScrollY >= originalTop)
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        }

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setHeroVisible(true)
                }
            })
        }, observerOptions)

        const secondHeaderObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setSecondHeaderVisible(true)
                }
            })
        }, observerOptions)

        let headerAnimated = false
        const headerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !headerAnimated) {
                    headerAnimated = true
                    setHeaderVisible(true)

                    setTimeout(() => {
                        if (step1Ref.current) {
                            setStep1Visible(true)
                            setTimeout(() => {
                                if (step2Ref.current) {
                                    setStep2Visible(true)
                                    setTimeout(() => {
                                        if (step3Ref.current) {
                                            setStep3Visible(true)
                                        }
                                    }, 400)
                                }
                            }, 400)
                        }
                    }, 800)
                }
            })
        }, { threshold: 0.1, rootMargin: '0px 0px -150px 0px' })

        const whoIsForObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setWhoIsForVisible(true)
                }
            })
        }, observerOptions)

        const waitlistFormObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setWaitlistFormVisible(true)
                }
            })
        }, observerOptions)

        const stepObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && headerAnimated) {
                    const index = parseInt(entry.target.getAttribute('data-step') || '0')
                    if (index === 1 && !step1Visible) {
                        setStep1Visible(true)
                    } else if (index === 2 && step1Visible && !step2Visible) {
                        setTimeout(() => setStep2Visible(true), 200)
                    } else if (index === 3 && step2Visible && !step3Visible) {
                        setTimeout(() => setStep3Visible(true), 200)
                    }
                }
            })
        }, { threshold: 0.3, rootMargin: '0px 0px -150px 0px' })

        if (heroRef.current) heroObserver.observe(heroRef.current)
        if (secondHeaderRef.current) secondHeaderObserver.observe(secondHeaderRef.current)
        if (howItWorksRef.current) headerObserver.observe(howItWorksRef.current)
        if (whoIsForRef.current) whoIsForObserver.observe(whoIsForRef.current)
        if (waitlistFormRef.current) waitlistFormObserver.observe(waitlistFormRef.current)
        if (step1Ref.current) stepObserver.observe(step1Ref.current)
        if (step2Ref.current) stepObserver.observe(step2Ref.current)
        if (step3Ref.current) stepObserver.observe(step3Ref.current)

        return () => {
            heroObserver.disconnect()
            secondHeaderObserver.disconnect()
            headerObserver.disconnect()
            whoIsForObserver.disconnect()
            waitlistFormObserver.disconnect()
            stepObserver.disconnect()
        }
    }, [])

    useEffect(() => {
        const webpLink = document.createElement('link')
        webpLink.rel = 'preload'
        webpLink.as = 'image'
        webpLink.href = WaitlistImg
        webpLink.type = 'image/webp'
        document.head.appendChild(webpLink)

        return () => {
            document.head.removeChild(webpLink)
        }
    }, [])

    const handleJoinWaitlist = () => {
        waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const normalizedEmail = email.trim().toLowerCase()
        const now = Date.now()

        // Client-side rate limiting check
        const lastSubmission = submissionLog.get(normalizedEmail)
        if (lastSubmission && (now - lastSubmission) < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastSubmission)) / 1000)
            setJoinError('')
            setStatusMessage(`Please wait ${remaining}s before trying again.`)
            return
        }

        if (nextAllowedTime && now < nextAllowedTime) {
            const remaining = Math.ceil((nextAllowedTime - now) / 1000)
            setJoinError('')
            setStatusMessage(`Please wait ${remaining}s before trying again.`)
            return
        }

        if (email.trim() && role && validateEmail(email)) {
            setIsSubmitting(true)
            submissionLog.set(normalizedEmail, now)

            try {
                setJoinError('')
                setStatusMessage('')

                const { saveWaitlistEntry } = await import('./waitlistApi')
                const result = await saveWaitlistEntry(email, role)

                if (result?.status === 'saved') {
                    setEmail('')
                    setRole('')
                    setEmailError('')
                    setShowSuccessModal(true)
                    setStatusMessage('')
                } else if (result?.status === 'queued') {
                    setShowSuccessModal(false)
                    setStatusMessage("You're offline. We'll submit once you're back online.")
                } else {
                    setJoinError('Something went wrong. Please try again.')
                }
            } catch (error: any) {
                // To prevent email enumeration, we treat "already exists" errors as success on the frontend
                const errMessage = error?.message?.toLowerCase() || ''
                if (errMessage.includes('already joined') || errMessage.includes('exists')) {
                    setEmail('')
                    setRole('')
                    setEmailError('')
                    setShowSuccessModal(true)
                    setStatusMessage('')
                } else {
                    setJoinError('Something went wrong. Please try again.')
                }
            } finally {
                setIsSubmitting(false)
                setNextAllowedTime(Date.now() + 5000) // 5s global cooldown
            }
        } else if (!validateEmail(email) && email.trim()) {
            setEmailError('Please enter a valid email address')
        }
    }

    return (
        <div className="flex flex-col">
            <header className="absolute top-0 left-0 right-0 z-20 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center">
                        <img
                            src={DonateLogoWhite}
                            alt="Donate"
                            width={140}
                            height={40}
                            className="h-7 w-auto cursor-pointer"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                        />
                    </div>
                    <nav className="hidden md:flex items-center gap-8 lg:gap-12">
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            Home
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            How it works
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                whoIsForRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            For Who
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            Contact
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </nav>
                </div>
            </header>

            <div ref={heroRef} className="relative h-screen w-full">
                <div className="absolute inset-0 w-full h-full">
                    <div
                        className="absolute inset-0 w-full h-full bg-[#1a1a1a] transition-opacity duration-500"
                        style={{ opacity: heroImageLoaded ? 0 : 1 }}
                        aria-hidden
                    />
                    <img
                        src={WaitlistImg}
                        alt=""
                        width={1920}
                        height={1080}
                        fetchPriority="high"
                        decoding="async"
                        sizes="100vw"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500"
                        style={{ opacity: heroImageLoaded ? 1 : 0 }}
                        onLoad={() => setHeroImageLoaded(true)}
                    />
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                </div>

                <div className="relative z-10 h-full flex items-end justify-start px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
                    <div className="max-w-4xl w-full">
                        <div className="space-y-6 mb-8 transition-all duration-1000 ease-out" style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
                            transitionDelay: heroVisible ? '300ms' : '0ms'
                        }}>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                                <span className="text-[#FFC33F]">Transparent </span><span className="text-white">donations</span>
                                <br />
                                <span className="text-[#FFC33F]">Verifiable </span><span className="text-white">impact.</span>
                                <br />
                                <span className="text-white">Built </span><span className="text-[#FFC33F]">on-chain.</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
                                Buy creative products, support verified causes, and track every donation on-chain.
                            </p>
                        </div>

                        <div className="mb-6 transition-all duration-1000 ease-out" style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
                            transitionDelay: heroVisible ? '500ms' : '0ms'
                        }}>
                            <Button
                                onClick={handleJoinWaitlist}
                                variant="primary-bw"
                                size="lg"
                                className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3"
                            >
                                Join the Waitlist
                            </Button>
                        </div>

                        <p className="text-sm text-white/80 transition-all duration-1000 ease-out" style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
                            transitionDelay: heroVisible ? '700ms' : '0ms'
                        }}>
                            Built on Hedera • Secure • Verifiable • Transparent
                        </p>
                    </div>
                </div>
            </div>

            <header
                ref={secondHeaderRef}
                className={`w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-800 ease-out z-30 ${isSecondHeaderSticky ? 'fixed top-0 left-0 right-0' : 'relative'}`}
                style={{
                    backgroundColor: '#1E1E1E',
                    opacity: secondHeaderVisible ? 1 : 0,
                    transform: secondHeaderVisible ? 'translateY(0)' : 'translateY(30px)'
                }}
            >
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center">
                        <img
                            src={DonateLogoWhite}
                            alt="Donate"
                            width={140}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            className="h-7 w-auto cursor-pointer"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                        />
                    </div>

                    <nav className="hidden md:flex items-center gap-8 lg:gap-12 flex-1 justify-center">
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            Home
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            How it works
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                whoIsForRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            For Who
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-[#FFC33F] transition-colors text-base font-medium relative group"
                        >
                            Contact
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFC33F] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </nav>

                    <div className="flex items-center">
                        <Button
                            onClick={handleJoinWaitlist}
                            variant="secondary"
                            size="md"
                            className="bg-white text-black hover:bg-gray-100 rounded-full px-6 py-2"
                        >
                            Join the Waitlist
                        </Button>
                    </div>
                </div>
            </header>

            <section ref={sectionRef} className="w-full bg-white pt-40 pb-24 sm:pt-52 sm:pb-32 lg:pt-64 lg:pb-40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center leading-tight font-medium text-4xl sm:text-5xl lg:text-[60px] text-black/80">
                        Donate On-Chain is a Web3-powered fundraising marketplace that turns everyday purchases into transparent, verifiable donations recorded on-chain.
                    </p>
                </div>
            </section>

            <section ref={howItWorksRef} className="w-full bg-white py-16 sm:py-20 lg:py-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div
                            className="mb-8 inline-block transition-all duration-700 ease-out"
                            style={{
                                opacity: headerVisible ? 1 : 0,
                                transform: headerVisible ? 'translateY(0)' : 'translateY(30px)'
                            }}
                        >
                            <div className="rounded-full px-6 py-2 bg-[#FFC33F] text-black font-medium">
                                How It Works
                            </div>
                        </div>
                        <h2
                            className="font-semibold text-black transition-all duration-700 ease-out delay-100 text-2xl sm:text-[32px]"
                            style={{
                                opacity: headerVisible ? 1 : 0,
                                transform: headerVisible ? 'translateY(0)' : 'translateY(30px)'
                            }}
                        >
                            From Purchase To Impact
                        </h2>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                        <div
                            ref={step1Ref}
                            data-step="1"
                            className="relative rounded-[15px] overflow-hidden transition-all duration-1000 ease-out p-6 sm:p-8 lg:p-10 flex items-start sm:items-end justify-start"
                            style={{
                                opacity: step1Visible ? 1 : 0,
                                transform: step1Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                visibility: step1Visible ? 'visible' : 'hidden',
                                height: '425px',
                                background: 'radial-gradient(95.06% 87.14% at 100% 74.94%, #3E3E3E 2.79%, #000000 100%)'
                            }}
                        >
                            <div className="absolute inset-0 pointer-events-none" style={{ padding: 0 }}>
                                <img
                                    src={Banner1Img}
                                    alt="Banner 1"
                                    width={1200}
                                    height={800}
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute"
                                    style={{
                                        ...(isMobile ? {
                                            bottom: '-20px',
                                            left: '50%',
                                            right: 'auto',
                                            transform: 'translateX(-40%) scale(1) rotate(-13deg)',
                                            transformOrigin: 'center bottom'
                                        } : {
                                            bottom: '-60px',
                                            right: '-220px',
                                            transform: 'scale(0.65)',
                                            transformOrigin: 'bottom right'
                                        }),
                                        zIndex: 1
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <h3 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white mb-3">
                                    Choose A Product Or Design
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-[550px]">
                                    Buy or customize merchandise linked to verified NGOs and causes
                                </p>
                            </div>
                        </div>

                        <div
                            ref={step2Ref}
                            data-step="2"
                            className="relative rounded-[15px] overflow-hidden transition-all duration-1000 ease-out p-6 sm:p-8 lg:p-10 flex items-start sm:items-end justify-start"
                            style={{
                                opacity: step2Visible ? 1 : 0,
                                transform: step2Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                transitionDelay: step2Visible ? '200ms' : '0ms',
                                visibility: step2Visible ? 'visible' : 'hidden',
                                height: '425px',
                                background: 'radial-gradient(116.42% 104.87% at 113.17% 70%, #FFFFFF 0%, #FFC33F 66.46%)'
                            }}
                        >
                            <div className="absolute inset-0 pointer-events-none" style={{ padding: 0 }}>
                                <img
                                    src={Banner2Img}
                                    alt="Banner 2"
                                    width={600}
                                    height={800}
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute"
                                    style={{
                                        bottom: 0,
                                        ...(isMobile ? {
                                            left: '50%',
                                            right: 'auto',
                                            transform: 'translateX(-50%) scale(0.7)',
                                            transformOrigin: 'center bottom'
                                        } : {
                                            right: 0,
                                            transform: 'scale(0.65)',
                                            transformOrigin: 'bottom right'
                                        }),
                                        zIndex: 1
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <h3 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-black mb-3">
                                    Purchase & Donate Transparently
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-black/80 max-w-[550px]">
                                    Payments are automatically split between creators and causes using smart contracts.
                                </p>
                            </div>
                        </div>

                        <div
                            ref={step3Ref}
                            data-step="3"
                            className="relative rounded-[15px] overflow-hidden transition-all duration-1000 ease-out p-6 sm:p-8 lg:p-10 flex items-start sm:items-end justify-start"
                            style={{
                                opacity: step3Visible ? 1 : 0,
                                transform: step3Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                transitionDelay: step3Visible ? '400ms' : '0ms',
                                visibility: step3Visible ? 'visible' : 'hidden',
                                height: '425px',
                                background: 'radial-gradient(95.06% 87.14% at 100% 74.94%, #3E3E3E 2.79%, #000000 100%)'
                            }}
                        >
                            <img
                                src={BannerNft}
                                alt="Banner NFT"
                                width={350}
                                height={500}
                                loading="lazy"
                                decoding="async"
                                className="absolute bottom-[-150px] right-[-50px]"
                                style={{
                                    transform: `${isMobile ? 'scale(0.8)' : 'scale(1)'} rotate(-16.27deg)`,
                                    zIndex: 1
                                }}
                            />
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <h3 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white mb-3">
                                    Receive Proof Of Impact
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-[550px]">
                                    Get an NFT-based proof of donation showing exactly where your money went.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section ref={whoIsForRef} className="w-full bg-white py-16 sm:py-20 lg:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 transition-all duration-1000 ease-out" style={{
                        opacity: whoIsForVisible ? 1 : 0,
                        transform: whoIsForVisible ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div className="mb-8 inline-block transition-all duration-1000 ease-out" style={{
                            opacity: whoIsForVisible ? 1 : 0,
                            transform: whoIsForVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
                            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: whoIsForVisible ? '100ms' : '0ms'
                        }}>
                            <div className="rounded-full px-6 py-2 bg-[#FFC33F] text-black font-medium">
                                Who Is Donate On Chain For
                            </div>
                        </div>
                        <h2 className="font-semibold text-black transition-all duration-1000 ease-out text-2xl sm:text-[32px]" style={{
                            opacity: whoIsForVisible ? 1 : 0,
                            transform: whoIsForVisible ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: whoIsForVisible ? '300ms' : '0ms'
                        }}>
                            For Donors, Creators, And Causes
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        <div className="relative rounded-lg overflow-hidden h-[400px] transition-all duration-1000 ease-out" style={{
                            opacity: whoIsForVisible ? 1 : 0,
                            transform: whoIsForVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
                            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: whoIsForVisible ? '500ms' : '0ms'
                        }}>
                            <img
                                src={WaitlistImg4}
                                alt="Donors"
                                width={1200}
                                height={1600}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                <h3 className="font-semibold text-white mb-2" style={{ fontSize: '32px' }}>
                                    Donors
                                </h3>
                                <p className="text-base sm:text-lg text-white/90">
                                    Give with confidence. See exactly how your money is used on-chain.
                                </p>
                            </div>
                        </div>

                        <div className="relative rounded-lg overflow-hidden h-[400px] transition-all duration-1000 ease-out" style={{
                            opacity: whoIsForVisible ? 1 : 0,
                            transform: whoIsForVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
                            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: whoIsForVisible ? '700ms' : '0ms'
                        }}>
                            <img
                                src={WaitlistImg5}
                                alt="Designers / Creators"
                                width={1200}
                                height={1600}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                <h3 className="font-semibold text-white mb-2" style={{ fontSize: '32px' }}>
                                    Designers / Creators
                                </h3>
                                <p className="text-base sm:text-lg text-white/90">
                                    Turn your creativity into income while supporting causes that matter.
                                </p>
                            </div>
                        </div>

                        <div className="relative rounded-lg overflow-hidden h-[400px] transition-all duration-1000 ease-out" style={{
                            opacity: whoIsForVisible ? 1 : 0,
                            transform: whoIsForVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
                            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: whoIsForVisible ? '900ms' : '0ms'
                        }}>
                            <img
                                src={WaitlistImg6}
                                alt="NGOs & Foundations"
                                width={1200}
                                height={1600}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                <h3 className="font-semibold text-white mb-2" style={{ fontSize: '32px' }}>
                                    NGOs & Foundations
                                </h3>
                                <p className="text-base sm:text-lg text-white/90">
                                    Raise funds transparently and build trust with a global donor base.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section ref={waitlistFormRef} className="w-full bg-white py-16 sm:py-20 lg:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 transition-all duration-1000 ease-out" style={{
                        opacity: waitlistFormVisible ? 1 : 0,
                        transform: waitlistFormVisible ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <h2 className="font-semibold text-black mb-8 leading-tight text-2xl sm:text-[32px]">
                            Join 1,000+ Early Supporters Building<br />
                            The Future Of Transparent Giving.
                        </h2>
                    </div>

                    <div className="transition-all duration-1000 ease-out" style={{
                        opacity: waitlistFormVisible ? 1 : 0,
                        transform: waitlistFormVisible ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        transitionDelay: waitlistFormVisible ? '300ms' : '0ms'
                    }}>

                        <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-[2]">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="Enter your email"
                                        className={`w-full px-6 py-4 rounded-lg border bg-gray-50 focus:outline-none focus:ring-2 focus:border-transparent text-black text-base ${emailError ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-[#FFC33F]'
                                            }`}
                                        required
                                    />
                                    {emailError && (
                                        <p className="text-red-500 text-sm mt-1">{emailError}</p>
                                    )}
                                </div>
                                <div className="relative min-w-[180px]">
                                    <label htmlFor="role" className="sr-only">
                                        Select your role
                                    </label>
                                    <select
                                        id="role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-6 py-4 pr-10 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC33F] focus:border-transparent text-black text-base appearance-none"
                                        required
                                    >
                                        <option value="" disabled hidden>Select role</option>
                                        <option value="donor">Donor</option>
                                        <option value="creator">Designer/Creator</option>
                                        <option value="ngo">NGO</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    disabled={!email.trim() || !role || !validateEmail(email) || isSubmitting}
                                    className={`rounded-lg px-8 py-4 font-medium whitespace-nowrap min-w-[180px] ${isSubmitting
                                            ? 'bg-[#FFC33F]/70 hover:bg-[#FFC33F] cursor-wait'
                                            : !email.trim() || !role || !validateEmail(email)
                                                ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed'
                                                : 'bg-[#FFC33F]/70 hover:bg-[#FFC33F]'
                                        }`}
                                    style={{ color: 'white' }}
                                >
                                    {isSubmitting ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        'Submit'
                                    )}
                                </Button>
                            </div>
                            {joinError && (
                                <p className="text-red-500 text-sm">{joinError}</p>
                            )}
                            {!joinError && statusMessage && (
                                <p className="text-yellow-600 text-sm">{statusMessage}</p>
                            )}
                        </form>
                    </div>

                    <p className="text-left text-sm text-black mt-3 transition-all duration-1000 ease-out" style={{
                        opacity: waitlistFormVisible ? 1 : 0,
                        transform: waitlistFormVisible ? 'translateY(0)' : 'translateY(15px)',
                        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        transitionDelay: waitlistFormVisible ? '500ms' : '0ms'
                    }}>
                        Built on Hedera • Secure • Verifiable • Transparent
                    </p>
                </div>
            </section>

            <footer className="w-full bg-[#1E1E1E] py-12 lg:py-16 relative">
                <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-12 lg:mb-16">
                        <div className="text-white text-base sm:text-lg mb-6 lg:mb-0">
                            Follow Us @donateonchain
                        </div>
                        <div className="flex items-center gap-6">
                            <a
                                href="https://x.com/donateonchain"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="DonateOnchain on X"
                                className="text-white hover:text-[#FFC33F] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.instagram.com/donateonchain"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="DonateOnchain on Instagram"
                                className="text-white hover:text-[#FFC33F] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.instagram.com/donateonchain"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="DonateOnchain on Facebook"
                                className="text-white hover:text-[#FFC33F] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 mb-12 lg:mb-16">
                    <img
                        src={FooterLogoWhite}
                        alt="Donate"
                        width={1920}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="block w-screen max-w-none select-none"
                    />
                </div>

                <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                    <div className="text-white text-sm">
                        Copyright 2025 DONATE. All rights reserved
                    </div>
                </div>
            </footer>

            {showSuccessModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowSuccessModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-10 sm:p-16 max-w-lg w-full mx-4 shadow-xl relative min-h-[500px] flex flex-col justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <svg width="222" height="222" viewBox="0 0 222 222" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-48 sm:w-56 sm:h-56">
                                    <circle cx="111" cy="111" r="111" fill="#FFF3D8" />
                                    <circle cx="111" cy="111" r="92" fill="#FFC33F" />
                                    <path fillRule="evenodd" clipRule="evenodd" d="M156.937 79.0399C158.279 80.3824 159.033 82.2031 159.033 84.1014C159.033 85.9998 158.279 87.8204 156.937 89.163L103.277 142.823C102.568 143.533 101.726 144.095 100.799 144.479C99.8727 144.863 98.8796 145.061 97.8766 145.061C96.8736 145.061 95.8805 144.863 94.9539 144.479C94.0273 144.095 93.1853 143.533 92.4762 142.823L65.8155 116.167C65.1317 115.507 64.5863 114.717 64.2111 113.843C63.8359 112.97 63.6384 112.031 63.6302 111.08C63.6219 110.129 63.803 109.187 64.163 108.307C64.523 107.427 65.0546 106.628 65.7268 105.956C66.3989 105.283 67.1983 104.752 68.0781 104.392C68.958 104.032 69.9007 103.851 70.8513 103.859C71.8018 103.867 72.7413 104.065 73.6147 104.44C74.4882 104.815 75.2781 105.36 75.9385 106.044L97.8742 127.98L146.81 79.0399C147.474 78.3746 148.264 77.8469 149.133 77.4868C150.002 77.1267 150.933 76.9414 151.873 76.9414C152.814 76.9414 153.745 77.1267 154.614 77.4868C155.483 77.8469 156.272 78.3746 156.937 79.0399Z" fill="black" />
                                </svg>
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-bold text-black mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                You're in!
                            </h3>
                            <p className="text-base sm:text-lg text-black/80" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                Thanks for joining our waitlist.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

type WaitlistErrorBoundaryState = {
    hasError: boolean
}

class WaitlistErrorBoundary extends React.Component<React.PropsWithChildren, WaitlistErrorBoundaryState> {
    state: WaitlistErrorBoundaryState = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch() {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error('Error in Waitlist route')
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-white px-4">
                    <div className="max-w-md text-center">
                        <h1 className="text-2xl font-semibold mb-4 text-black">Something went wrong.</h1>
                        <p className="text-gray-600 mb-6">Please refresh the page and try again.</p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

const WaitlistWithBoundary = () => (
    <WaitlistErrorBoundary>
        <Waitlist />
    </WaitlistErrorBoundary>
)

export default WaitlistWithBoundary