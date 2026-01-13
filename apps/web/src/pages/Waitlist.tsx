import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import WaitlistImg from '../assets/WaitlistImg.png'
import WaitlistImg4 from './WaitlistImg4.png'
import WaitlistImg5 from './WaitlistImg5.png'
import WaitlistImg6 from './WaitlistImg6.png'

import DonateLogoWhite from '../assets/DonateLogoWhite.png'

import FooterLogoWhite from '../assets/FooterLogoWhite.png'
import Button from '../component/Button'

const Waitlist = () => {
    const navigate = useNavigate()
    const sectionRef = useRef<HTMLElement>(null)
    const howItWorksRef = useRef<HTMLElement>(null)
    const step1Ref = useRef<HTMLDivElement>(null)
    const step2Ref = useRef<HTMLDivElement>(null)
    const step3Ref = useRef<HTMLDivElement>(null)
    const [scrollY, setScrollY] = useState(0)
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
    const [lastScrollY, setLastScrollY] = useState(0)
    const [headerVisible, setHeaderVisible] = useState(false)
    const [step1Visible, setStep1Visible] = useState(false)
    const [step2Visible, setStep2Visible] = useState(false)
    const [step3Visible, setStep3Visible] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('')
    const heroRef = useRef<HTMLDivElement>(null)
    const secondHeaderRef = useRef<HTMLElement>(null)
    const whoIsForRef = useRef<HTMLElement>(null)
    const waitlistFormRef = useRef<HTMLElement>(null)
    const [heroVisible, setHeroVisible] = useState(false)
    const [secondHeaderVisible, setSecondHeaderVisible] = useState(false)
    const [whoIsForVisible, setWhoIsForVisible] = useState(false)
    const [waitlistFormVisible, setWaitlistFormVisible] = useState(false)
    const [isSecondHeaderSticky, setIsSecondHeaderSticky] = useState(false)
    const [secondHeaderOriginalTop, setSecondHeaderOriginalTop] = useState<number | null>(null)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            setScrollY(currentScrollY)
            
            if (currentScrollY > lastScrollY) {
                setScrollDirection('down')
            } else if (currentScrollY < lastScrollY) {
                setScrollDirection('up')
            }
            
            if (secondHeaderRef.current) {
                if (secondHeaderOriginalTop === null) {
                    setSecondHeaderOriginalTop(secondHeaderRef.current.offsetTop)
                } else {
                    if (currentScrollY >= secondHeaderOriginalTop) {
                        setIsSecondHeaderSticky(true)
                    } else {
                        setIsSecondHeaderSticky(false)
                    }
                }
            }
            
            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

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

    const handleJoinWaitlist = () => {
        waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleWaitlistSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (email.trim() && role) {
            console.log('Joined waitlist:', { email, role })
            setEmail('')
            setRole('')
        }
    }

    const text = "Donate on Chain is a Web3-powered fundraising marketplace that turns everyday purchases into transparent, verifiable donations recorded on-chain."
    const words = text.split(' ')

    const getWordStyle = (index: number) => {
        if (!sectionRef.current) {
            return { color: '#000000', opacity: 0.6, transition: 'all 0.4s ease' }
        }

        const sectionTop = sectionRef.current.offsetTop
        const windowHeight = window.innerHeight
        const sectionStart = sectionTop - windowHeight * 0.7
        
        const wordDelay = 20
        const animationDuration = 100
        const scrollProgress = scrollY - sectionStart
        const wordTrigger = index * wordDelay
        
        if (scrollDirection === 'down') {
            if (scrollProgress >= wordTrigger) {
                const progress = Math.min(Math.max((scrollProgress - wordTrigger) / animationDuration, 0), 1)
                const easedProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2
                
                return {
                    color: easedProgress > 0.4 ? '#FCD34D' : '#000000',
                    opacity: 0.6 + (easedProgress * 0.4),
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }
            }
            return {
                color: '#000000',
                opacity: 0.6,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }
        } else if (scrollDirection === 'up') {
            if (scrollProgress >= wordTrigger) {
                const progress = Math.min(Math.max((scrollProgress - wordTrigger) / animationDuration, 0), 1)
                const easedProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2
                
                return {
                    color: easedProgress > 0.4 ? '#FCD34D' : '#000000',
                    opacity: 0.6 + (easedProgress * 0.4),
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }
            }
            return {
                color: '#000000',
                opacity: 0.6,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }
        }
        
        return {
            color: '#000000',
            opacity: 0.6,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
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
                            className="h-7 w-auto cursor-pointer"
                            onClick={() => navigate('/')}
                        />
                    </div>
                    <nav className="hidden md:flex items-center gap-8 lg:gap-12">
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            Home
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            How it works
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                whoIsForRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            For Who
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            Contact
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </nav>
                </div>
            </header>

            <div ref={heroRef} className="relative h-screen w-full transition-all duration-1000 ease-out" style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(30px)'
            }}>
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${WaitlistImg})` }}
                >
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>
                
                <div className="relative z-10 h-full flex items-end justify-start px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
                    <div className="max-w-4xl w-full">
                        <div className="space-y-6 mb-8 transition-all duration-1000 ease-out" style={{
                            opacity: heroVisible ? 1 : 0,
                            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
                            transitionDelay: heroVisible ? '300ms' : '0ms'
                        }}>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                                <span className="text-yellow-400">Transparent </span><span className="text-white">donations</span>
                                <br />
                                <span className="text-yellow-400">Verifiable </span><span className="text-white">impact.</span>
                                <br />
                                <span className="text-white">Built </span><span className="text-yellow-400">on-chain.</span>
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
                            className="h-7 w-auto cursor-pointer"
                            onClick={() => navigate('/')}
                        />
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-8 lg:gap-12 flex-1 justify-center">
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            Home
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            About
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            How it works
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                whoIsForRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            For Who
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => {
                                waitlistFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-white hover:text-yellow-400 transition-colors text-base font-medium relative group"
                        >
                            Contact
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
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

            <section ref={sectionRef} className="w-full bg-white pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-52 lg:pb-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center leading-tight font-medium" style={{ fontSize: '60px' }}>
                        {words.map((word, index) => (
                            <span key={index} style={getWordStyle(index)}>
                                {word}{index < words.length - 1 ? ' ' : ''}
                            </span>
                        ))}
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
                            <div className="rounded-full px-6 py-2 bg-yellow-400 text-black font-medium">
                                How It Works
                            </div>
                        </div>
                        <h2 
                            className="font-semibold text-black transition-all duration-700 ease-out delay-100"
                            style={{
                                fontSize: '32px',
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
                            className="relative rounded-lg overflow-hidden h-[500px] transition-all duration-1000 ease-out"
                            style={{
                                opacity: step1Visible ? 1 : 0,
                                transform: step1Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                visibility: step1Visible ? 'visible' : 'hidden'
                            }}
                        >
                            <img 
                                src={WaitlistImg4} 
                                alt="Step 1" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
                                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
                                    Choose A Product Or Design
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-white/90">
                                    Buy or customize merchandise linked to verified NGOs and causes
                                </p>
                            </div>
                        </div>

                        <div 
                            ref={step2Ref}
                            data-step="2"
                            className="relative rounded-lg overflow-hidden h-[500px] transition-all duration-1000 ease-out"
                            style={{
                                opacity: step2Visible ? 1 : 0,
                                transform: step2Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                transitionDelay: step2Visible ? '200ms' : '0ms',
                                visibility: step2Visible ? 'visible' : 'hidden'
                            }}
                        >
                            <img 
                                src={WaitlistImg5} 
                                alt="Step 2" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
                                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
                                    Purchase & Donate Transparently
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-white/90">
                                    Payments are automatically split between creators and causes using smart contracts.
                                </p>
                            </div>
                        </div>

                        <div 
                            ref={step3Ref}
                            data-step="3"
                            className="relative rounded-lg overflow-hidden h-[500px] transition-all duration-1000 ease-out"
                            style={{
                                opacity: step3Visible ? 1 : 0,
                                transform: step3Visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.96)',
                                transitionDelay: step3Visible ? '400ms' : '0ms',
                                visibility: step3Visible ? 'visible' : 'hidden'
                            }}
                        >
                            <img 
                                src={WaitlistImg6} 
                                alt="Step 3" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10">
                                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
                                    Receive Proof Of Impact
                                </h3>
                                <p className="text-base sm:text-lg lg:text-xl text-white/90">
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
                            <div className="rounded-full px-6 py-2 bg-yellow-400 text-black font-medium">
                                Who Is Donate On Chain For
                            </div>
                        </div>
                        <h2 className="font-semibold text-black transition-all duration-1000 ease-out" style={{ 
                            fontSize: '32px',
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
                        <h2 className="font-semibold text-black mb-8 leading-tight" style={{ fontSize: '32px' }}>
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
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="flex-[2] px-6 py-4 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black text-base"
                                required
                            />
                            <div className="relative min-w-[180px]">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-6 py-4 pr-10 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black text-base appearance-none"
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
                                className="rounded-lg px-8 py-4 bg-yellow-400 hover:bg-yellow-500 font-medium whitespace-nowrap min-w-[180px]"
                                style={{ color: 'white' }}
                            >
                                Submit
                            </Button>
                        </div>
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
                            <a href="https://x.com/donateonchain" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 transition-colors">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </a>
                            <a href="https://instagram.com/donateonchain" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 transition-colors">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                            <a href="https://facebook.com/donateonchain" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 transition-colors">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 mb-12 lg:mb-16">
                    <img 
                        src={FooterLogoWhite} 
                        alt="Donate" 
                        className="block w-screen max-w-none select-none"
                    />
                </div>

                <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                    <div className="text-white text-sm">
                        Copyright 2025 DONATE. All rights reserved
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Waitlist
