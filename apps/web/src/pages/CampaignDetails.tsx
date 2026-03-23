import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Banner from '../component/Banner'
import CampaignCard from '../component/CampaignCard'
import Button from '../component/Button'
import EditCampaignModal from '../component/EditCampaignModal'
import KycModal from '../component/KycModal'
import { Loader2, Check, Gift, Trash, Calendar, Users } from 'lucide-react'
import { SkeletonCampaignDetail } from '../component/Skeleton'
import {
    donate,
    getCampaign as onchainGetCampaign,
    getCampaignRaisedHBAR,
    getDonationsByCampaign as onchainGetDonationsByCampaign,
    updateCampaignOnChain,
    deactivateCampaign,
    getCampaignMetadataCid,
    listAllCampaignsFromChain,
    isKycVerifiedOnChain,
    MIN_DONATION_HBAR,
    CampaignState,
    isCampaignIdInPublicAllowlist,
} from '../onchain/adapter'
import { getIPFSURL, uploadFileToIPFS } from '../utils/ipfs'
import { createDonation, mintDonationNFT, getKycVerifications } from '../api'
import type { DonationEventApi } from '../types/api'
import {
    computeCampaignPercent,
    donationAmountExceedsRemaining,
    formatHbarDisplay,
    getRemainingToTargetHBAR,
    normalizeCampaignAmounts,
    normalizeLikelyWeiNumber,
    weiToHbar,
} from '../utils/hbar'

const CACHE_TTL_MS = 5 * 60 * 1000

const getCache = (key: string) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        if (!parsed || !parsed.data || !parsed.ts) return null
        if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
        return parsed.data
    } catch { return null }
}

const setCache = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
    } catch {}
}

function donationEventsFromChain(campaignId: string, raw: Awaited<ReturnType<typeof onchainGetDonationsByCampaign>>): DonationEventApi[] {
    const out: DonationEventApi[] = []
    const n = raw.donors.length
    for (let i = 0; i < n; i++) {
        const donor = raw.donors[i]
        const amount = raw.amounts[i]
        const ts = raw.timestamps[i]
        const serial = raw.nftSerialNumbers[i]
        const tsNum = Number(ts)
        const createdAt =
            tsNum > 0
                ? new Date(tsNum < 1e12 ? tsNum * 1000 : tsNum).toISOString()
                : ''
        out.push({
            id: `onchain-${campaignId}-${String(serial ?? i)}-${i}`,
            campaignId,
            donor,
            amount: String(amount),
            txHash: null,
            createdAt,
        })
    }
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return out
}

const formatCampaignDeadline = (raw: string | undefined | null): string | null => {
    if (!raw) return null
    const s = String(raw).trim()
    if (!s) return null
    const num = Number(s)
    if (!Number.isNaN(num) && num > 0) {
        const ms = num < 1e12 ? num * 1000 : num
        const d = new Date(ms)
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { dateStyle: 'long' })
        }
    }
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { dateStyle: 'long' })
    return s
}

const CampaignDetails = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { address, isConnected } = useAccount()
    const [donationAmount, setDonationAmount] = useState<string>('')
    const [isDonating, setIsDonating] = useState(false)
    const [donationError, setDonationError] = useState<string | null>(null)
    const [donationSuccess, setDonationSuccess] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isUploadingCampaign, setIsUploadingCampaign] = useState(false)
    const [isCampaignUpdated, setIsCampaignUpdated] = useState(false)
    const [isKycModalOpen, setIsKycModalOpen] = useState(false)
    const queryClient = useQueryClient()
    const { data: campaign, isLoading: isCampaignLoading } = useQuery({
        queryKey: ['campaign', id],
        queryFn: async () => {
            if (!id) return null;
            const cacheKey = `campaign_detail_v3_${id}`
            const numericId = BigInt(id || '0')

            if (!isCampaignIdInPublicAllowlist(numericId)) {
                try {
                    localStorage.removeItem(cacheKey)
                } catch {}
                return null
            }

            const gate = await onchainGetCampaign(numericId).catch(() => null)
            if (gate != null && gate.state === CampaignState.Closed) {
                try {
                    localStorage.removeItem(cacheKey)
                } catch {}
                return null
            }

            let amountRaised = 0
            try {
                amountRaised = await getCampaignRaisedHBAR(numericId)
            } catch {
                try {
                    const donations = await onchainGetDonationsByCampaign(numericId)
                    amountRaised = donations.totalRaisedHBAR
                } catch {}
            }

            const cached = getCache(cacheKey)
            if (cached) {
                const target = Number(cached.target ?? 0) || 0
                const merged = {
                    ...cached,
                    amountRaised,
                    percentage: target > 0 ? (amountRaised / target) * 100 : 0,
                }
                const normalized = normalizeCampaignAmounts(merged)
                setCache(cacheKey, normalized)
                return normalized
            }

            try {
                const chainCampaign = gate ?? (await onchainGetCampaign(numericId))
                let metaImage: string | undefined = undefined
                let metaGoal: number | string | undefined = undefined
                let metaTitle = ''
                let metaDesc = ''
                let metaDeadlineUnix: number | string | undefined
                let metaDeadlineIso: string | undefined
                let metaLoaded = false
                try {
                    const metaCid = await getCampaignMetadataCid(numericId)
                    if (metaCid) {
                        const meta = await fetch(getIPFSURL(metaCid)).then(r => r.json()).catch(() => null)
                        if (meta) {
                            metaImage = meta.image
                            metaGoal = meta.goal
                            metaTitle = meta.title
                            metaDesc = meta.description
                            if (meta.deadlineUnix != null && meta.deadlineUnix !== '') {
                                metaDeadlineUnix = meta.deadlineUnix
                            }
                            if (typeof meta.deadlineISO === 'string' && meta.deadlineISO.trim()) {
                                metaDeadlineIso = meta.deadlineISO.trim()
                            }
                            metaLoaded = true
                        }
                    }
                } catch {}
                
                if (!chainCampaign && !metaLoaded) {
                    return null
                }

                const metaGoalNum =
                    metaGoal !== undefined && metaGoal !== null && metaGoal !== ''
                        ? Number(metaGoal)
                        : undefined
                const targetFromMeta =
                    metaGoalNum !== undefined && !Number.isNaN(metaGoalNum) ? metaGoalNum : undefined
                const targetFromChain =
                    chainCampaign && chainCampaign.goalHBAR !== undefined && chainCampaign.goalHBAR > 0n
                        ? weiToHbar(chainCampaign.goalHBAR)
                        : 0
                const campaignObj: any = {
                    id: Number(numericId),
                    onchainId: Number(numericId),
                    title: metaTitle || chainCampaign?.title,
                    description: metaDesc || chainCampaign?.description,
                    target:
                        targetFromChain > 0
                            ? targetFromChain
                            : targetFromMeta !== undefined
                              ? targetFromMeta
                              : 0,
                    ngoWallet: chainCampaign?.ngo,
                    image: metaImage || chainCampaign?.image,
                    amountRaised,
                    percentage: 0,
                    active: chainCampaign?.active ?? true,
                }

                if (chainCampaign?.deadline != null && chainCampaign.deadline > 0n) {
                    campaignObj.deadline = String(chainCampaign.deadline)
                } else if (metaDeadlineUnix != null && metaDeadlineUnix !== '') {
                    campaignObj.deadline = String(metaDeadlineUnix)
                } else if (metaDeadlineIso) {
                    campaignObj.deadline = metaDeadlineIso
                }

                let target = campaignObj.target || 0
                campaignObj.percentage = target > 0 ? (amountRaised / target) * 100 : 0

                const normalized = normalizeCampaignAmounts(campaignObj)
                setCache(cacheKey, normalized)
                return normalized
            } catch {
                return null
            }
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    })

    const { data: allCampaigns = [], isLoading: isRelatedLoading } = useQuery({
        queryKey: ['related_campaigns', id],
        queryFn: async () => {
            const cacheKey = `campaigns_related_ex_${id}`
            const cached = getCache(cacheKey)
            if (cached) return cached

            try {
                const list = await listAllCampaignsFromChain()
                const currentId = Number(id || '0')
                const filtered = list.filter((c: any) => Number(c.onchainId || c.id) !== currentId)
                const mapped = filtered.map((c: any) => {
                    const goal = normalizeLikelyWeiNumber(Number(c.target ?? c.goal ?? 0))
                    const raised = normalizeLikelyWeiNumber(Number(c.amountRaised ?? 0))
                    const percentage = computeCampaignPercent(raised, goal)
                    return { ...c, goal, amountRaised: raised, percentage }
                })
                setCache(cacheKey, mapped)
                return mapped
            } catch {
                return []
            }
        }
    })

    const chainIdForQueries =
        campaign?.onchainId != null
            ? BigInt(campaign.onchainId)
            : campaign?.id != null
              ? BigInt(campaign.id)
              : id && /^\d+$/.test(String(id).trim())
                ? BigInt(String(id).trim())
                : 0n

    const { data: donationActivity = [] } = useQuery({
        queryKey: ['campaign_donations', id, String(chainIdForQueries)],
        queryFn: async () => {
            if (!id || chainIdForQueries === 0n) return []
            try {
                const raw = await onchainGetDonationsByCampaign(chainIdForQueries)
                return donationEventsFromChain(id, raw).slice(0, 50)
            } catch {
                return []
            }
        },
        enabled: !!id && chainIdForQueries !== 0n,
    })

    const isLoading = isCampaignLoading || isRelatedLoading
    const isCampaignCreator = campaign && address && isConnected ? 
        (campaign.ngoWallet?.toLowerCase() === address.toLowerCase() || campaign.walletAddress?.toLowerCase() === address.toLowerCase()) 
        : false

    if (isLoading) {
        return (
            <div>
                <Header />
                <section className="px-4 md:px-7 py-12">
                    <SkeletonCampaignDetail />
                </section>
                <Footer />
            </div>
        )
    }

    if (!campaign) {
        return (
            <div>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold mb-4">Campaign not found</h1>
                        <button 
                            onClick={() => navigate('/campaign')}
                            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const remainingToTargetHBAR = getRemainingToTargetHBAR(
        Number(campaign.target || 0),
        Number(campaign.amountRaised || 0)
    )
    const parsedDonationAmount = parseFloat(donationAmount)
    const donationExceedsRemaining =
        remainingToTargetHBAR > 0 &&
        donationAmount.trim() !== '' &&
        !Number.isNaN(parsedDonationAmount) &&
        donationAmountExceedsRemaining(parsedDonationAmount, remainingToTargetHBAR)
    const donationBelowMinimum =
        donationAmount.trim() !== '' &&
        !Number.isNaN(parsedDonationAmount) &&
        parsedDonationAmount < MIN_DONATION_HBAR

    const performDonation = async () => {
        if (!donationAmount.trim() || !isConnected) return
        const value = parseFloat(donationAmount)
        if (Number.isNaN(value) || value <= 0) {
            setDonationError('Please enter a valid amount')
            return
        }
        if (remainingToTargetHBAR <= 0) {
            setDonationError('This campaign has already reached its funding target.')
            return
        }
        if (donationAmountExceedsRemaining(value, remainingToTargetHBAR)) {
            setDonationError(
                `You can donate up to ${formatHbarDisplay(remainingToTargetHBAR)} HBAR to reach the campaign target.`
            )
            return
        }
        if (value < MIN_DONATION_HBAR) {
            setDonationError(`Minimum donation is ${MIN_DONATION_HBAR} HBAR.`)
            return
        }

        setIsDonating(true)
        setDonationError(null)
        setDonationSuccess(false)
        setTxHash(null)
        
        try {
            if (!address) {
                setDonationError('Connect your wallet to donate.')
                return
            }
            const campaignIdForChain = campaign?.onchainId ? BigInt(campaign.onchainId) : (campaign?.id ? BigInt(campaign.id) : BigInt(id || '0'))
            const receipt = await donate({
                campaignId: campaignIdForChain,
                valueHbarDecimal: donationAmount.trim(),
                donor: address as `0x${string}`,
            })
            setTxHash(receipt.transactionHash)
            setDonationSuccess(true)
            setDonationAmount('')
            try {
                await createDonation({
                    donorAddress: address!,
                    campaignId: id!,
                    amount: value,
                    txHash: receipt.transactionHash,
                })
            } catch (_e) {}
            // Fire-and-forget NFT mint — does not block success flow
            mintDonationNFT({
                donorAddress: address!,
                campaignId: id!,
                txHash: receipt.transactionHash,
                amount: value,
                campaignTitle: campaign.title,
                campaignImage: campaign.image,
            }).catch((e) => {
                if (import.meta.env.DEV) console.warn('NFT mint failed (non-critical):', e)
            })
            // Bust localStorage cache so query re-fetches fresh on-chain data
            localStorage.removeItem(`campaign_detail_v3_${id}`)
            localStorage.removeItem(`campaign_${id}`)
            let updatedAmountRaised = 0
            try {
                updatedAmountRaised = await getCampaignRaisedHBAR(campaignIdForChain)
            } catch {
                const donations = await onchainGetDonationsByCampaign(campaignIdForChain)
                updatedAmountRaised = donations.totalRaisedHBAR
            }
            const goal = campaign.target || 0
            const updatedPercentage = goal > 0 ? (updatedAmountRaised / goal) * 100 : 0
            const prevCount =
                typeof campaign.donationCount === 'number' ? campaign.donationCount : donationActivity.length
            const updated = normalizeCampaignAmounts({
                ...campaign,
                amountRaised: updatedAmountRaised,
                percentage: updatedPercentage,
                donationCount: prevCount + 1,
            })
            queryClient.setQueryData(['campaign', id], updated)
            if (id) {
                queryClient.invalidateQueries({ queryKey: ['campaign_donations', id] })
                queryClient.invalidateQueries({ queryKey: ['campaign', id] })
            }
            setTimeout(() => {
                setDonationSuccess(false)
                setTxHash(null)
            }, 5000)
        } catch (e: any) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Donation failed', e)
            }
            // Display the specific error message generated by the adapter.ts, or a very generic fallback if none.
            const errorMessage = e?.message || 'Unable to make donation. Please try again.'
            setDonationError(errorMessage)
            setTimeout(() => {
                setDonationError(null)
            }, 5000)
        } finally {
            setIsDonating(false)
        }
    }

    const handleDonate = async () => {
        if (!isConnected || !address) return
        const value = parseFloat(donationAmount)
        if (!donationAmount.trim() || Number.isNaN(value) || value <= 0) {
            setDonationError('Please enter a valid amount')
            return
        }
        if (remainingToTargetHBAR <= 0) {
            setDonationError('This campaign has already reached its funding target.')
            return
        }
        if (donationAmountExceedsRemaining(value, remainingToTargetHBAR)) {
            setDonationError(
                `You can donate up to ${formatHbarDisplay(remainingToTargetHBAR)} HBAR to reach the campaign target.`
            )
            return
        }
        if (value < MIN_DONATION_HBAR) {
            setDonationError(`Minimum donation is ${MIN_DONATION_HBAR} HBAR.`)
            return
        }
        try {
            const kyc = await getKycVerifications({ walletAddress: address, page: 1, limit: 1 })
            const latest = kyc.items?.[0]
            const isOnChainKyc = await isKycVerifiedOnChain(address as `0x${string}`)
            if (latest?.status !== 'approved' || !isOnChainKyc) {
                setIsKycModalOpen(true)
                return
            }
        } catch {
            setDonationError('Unable to verify KYC status. Please try again.')
            return
        }
        await performDonation()
    }

    return (
        <div>
            <Header />

            {/* ── Success Toast ── */}
            {donationSuccess && (
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl max-w-sm w-full animate-fade-in-up"
                    role="alert"
                >
                    <div className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full bg-[#4ADE80] flex items-center justify-center">
                        <Check size={14} className="text-black" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Donation Successful! 🎉</p>
                        <p className="text-xs text-gray-400 mt-0.5">Thank you for your contribution. Your proof-of-donation NFT will be issued shortly.</p>
                        {txHash && (
                            <a
                                href={`https://hashscan.io/testnet/transaction/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#4ADE80] underline mt-1 block truncate"
                            >
                                View on HashScan ↗
                            </a>
                        )}
                    </div>
                </div>
            )}
            
          
            <section className="px-4 md:px-7 py-12">
                <div className="max-w-4xl mx-auto">
                
                    <div className="mb-8">
                        {campaign.image ? (
                            <img
                                src={campaign.image}
                                alt={campaign.title}
                                className="w-full h-[400px] object-cover rounded-3xl"
                            />
                        ) : null}
                    </div>

                 
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                        {campaign.title}
                    </h1>

                  
                    {campaign.ngoName && (
                        <div className="mb-6">
                            <p className="text-base text-gray-600">
                                Created by: <span className="font-semibold text-black">{campaign.ngoName}</span>
                            </p>
                        </div>
                    )}

                    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                                <Calendar className="h-5 w-5 text-gray-800" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Deadline</p>
                                <p className="mt-1 text-lg font-semibold text-black">
                                    {formatCampaignDeadline(campaign.deadline) ?? 'Not set'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                                <Users className="h-5 w-5 text-gray-800" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Donations</p>
                                <p className="mt-1 text-lg font-semibold text-black">
                                    {typeof campaign.donationCount === 'number'
                                        ? campaign.donationCount.toLocaleString()
                                        : donationActivity.length.toLocaleString()}
                                </p>
                                {typeof campaign.donationCount !== 'number' && donationActivity.length > 0 && (
                                    <p className="mt-1 text-xs text-gray-500">From recent activity</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-12">
                        {(() => {
                            const target = normalizeLikelyWeiNumber(Number(campaign.target ?? 0))
                            const amountRaised = normalizeLikelyWeiNumber(Number(campaign.amountRaised ?? 0))
                            const percentage = computeCampaignPercent(amountRaised, target)
                            return (
                                <>
                                    <div className="relative h-16 rounded-full overflow-hidden bg-white border-2 border-gray-300">
                                      
                                        <div 
                                            className="absolute inset-0 bg-[#4ADE80] rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            
                                            <div className="absolute left-0 top-0 h-full flex items-center px-6 min-w-fit">
                                                <span className="text-xl font-semibold text-black whitespace-nowrap">{formatHbarDisplay(amountRaised)} HBAR</span>
                                            </div>
                                        </div>
                                        
                                        
                                        <div className="absolute right-6 top-0 h-full flex items-center z-10">
                                            <span className="text-xl font-semibold text-black">{percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    
                                  
                                    <div className="mt-2 text-right">
                                        <span className="text-base text-gray-600">Target: {formatHbarDisplay(target)} HBAR</span>
                                    </div>
                                </>
                            )
                        })()}
                    </div>

                  
                    <div className="mb-12">
                        {isCampaignCreator && isConnected ? (
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant="primary-bw"
                                    size="lg"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex-1 rounded-lg py-4 text-lg"
                                >
                                    Edit Campaign
                                </Button>
                                <Button
                                    variant="danger"
                                    size="lg"
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to delete this campaign? This action is irreversible.')) return;
                                        try {
                                            await deactivateCampaign(BigInt(campaign.onchainId || campaign.id));
                                            queryClient.setQueryData(['campaign', id], { ...campaign, active: false });
                                            navigate('/user-profile');
                                        } catch (_e) {
                                            alert('Failed to delete campaign.');
                                        }
                                    }}
                                    className="!px-4 !py-4 items-center justify-center flex"
                                    aria-label="Delete Campaign"
                                >
                                    <Trash size={24} />
                                </Button>
                            </div>
                        ) : (
                            <>
                                {campaign.active === false && (
                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ This campaign is currently inactive. Donations are not being accepted at this time.
                                        </p>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Enter Amount (HBAR)
                                    </label>
                                    {remainingToTargetHBAR > 0 ? (
                                        <p className="mb-2 text-sm text-gray-600">
                                            Up to {formatHbarDisplay(remainingToTargetHBAR)} HBAR left to reach the goal.
                                            Minimum {MIN_DONATION_HBAR} HBAR per donation.
                                        </p>
                                    ) : (
                                        <p className="mb-2 text-sm text-amber-800">
                                            This campaign has reached its funding target.
                                        </p>
                                    )}
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-500">HBAR</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={MIN_DONATION_HBAR}
                                            value={donationAmount}
                                            onChange={(e) => {
                                                setDonationAmount(e.target.value)
                                                setDonationError(null)
                                            }}
                                            placeholder="0.00"
                                            aria-invalid={donationExceedsRemaining || donationBelowMinimum}
                                            className={`w-full pl-16 pr-4 py-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                                                donationExceedsRemaining || donationBelowMinimum
                                                    ? 'border-2 border-red-500 focus:ring-red-400'
                                                    : 'border border-gray-300 focus:ring-[#4ADE80]'
                                            }`}
                                            disabled={
                                                !isConnected ||
                                                isDonating ||
                                                campaign.active === false ||
                                                remainingToTargetHBAR <= 0
                                            }
                                        />
                                    </div>
                                    {donationError && (
                                        <p className="mt-2 text-sm text-red-600">{donationError}</p>
                                    )}
                                </div>
                                <Button 
                                    variant="primary-bw"
                                    size="lg"
                                    onClick={handleDonate}
                                    className="w-full rounded-lg py-4 text-lg"
                                        disabled={
                                        !donationAmount.trim() ||
                                        !isConnected ||
                                        isDonating ||
                                        campaign.active === false ||
                                        remainingToTargetHBAR <= 0 ||
                                        donationExceedsRemaining ||
                                        donationBelowMinimum
                                    }
                                >
                                    {isDonating ? 'Processing Donation...' : campaign.active === false ? 'Campaign Inactive' : isConnected ? 'Make Donation' : 'Connect Wallet to Donate'}
                                </Button>
                                {!isConnected && campaign.active !== false && (
                                    <p className="mt-2 text-sm text-gray-600 text-center">
                                        Connect your wallet to make a donation and receive a proof-of-donation NFT
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                  
                    <div className="space-y-6 mb-12">
                     
                        <div>
                            <h2 className="text-xl font-semibold text-black mb-3">About Campaign</h2>
                            <p className="text-base text-gray-700 leading-relaxed">
                                {campaign.about || campaign.description || 'No description available.'}
                            </p>
                        </div>

                        {campaign.howItWorks && (
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-3">How It Works</h2>
                                <p className="text-base text-gray-700 leading-relaxed">
                                    {campaign.howItWorks}
                                </p>
                            </div>
                        )}

                        {campaign.useOfFunds && (
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-3">Use Of Funds</h2>
                                <p className="text-base text-gray-700 leading-relaxed">
                                    {campaign.useOfFunds}
                                </p>
                            </div>
                        )}

                        {donationActivity.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-3">Recent donations</h2>
                                <ul className="space-y-2">
                                    {donationActivity.slice(0, 10).map((d) => (
                                        <li key={d.id} className="flex items-center justify-between text-sm text-gray-700">
                                            <span className="font-mono truncate max-w-[140px]" title={d.donor}>
                                                {d.donor.slice(0, 6)}...{d.donor.slice(-4)}
                                            </span>
                                            <span className="font-medium">
                                                {formatHbarDisplay(weiToHbar(d.amount))} HBAR
                                            </span>
                                            {d.createdAt && (
                                                <span className="text-gray-500">
                                                    {new Date(d.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                </div>
            </section>

            <section className="px-4 md:px-7 py-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-black mb-8">
                        You may also like
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {allCampaigns.slice(0, 5).map((relatedCampaign: any) => {
                        const target = Number(relatedCampaign.target || 0)
                        const amountRaised = Number(relatedCampaign.amountRaised || 0)
                        const percentage = computeCampaignPercent(amountRaised, target)
                        return (
                            <CampaignCard
                                key={relatedCampaign.onchainId || relatedCampaign.id}
                                image={relatedCampaign.image || relatedCampaign.coverImageFile}
                                title={relatedCampaign.title}
                                amountRaised={`${formatHbarDisplay(amountRaised)} HBAR`}
                                target={`${formatHbarDisplay(target)} HBAR`}
                                percentage={percentage}
                                alt={relatedCampaign.title}
                                onClick={() => navigate(`/campaign/${relatedCampaign.onchainId || relatedCampaign.id}`)}
                            />
                        )
                    })}
                    </div>
            </section>

            <Banner />
            <Footer />
            
            
            {campaign && isEditModalOpen && (
                <EditCampaignModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    campaign={campaign}
                    onSubmit={async (campaignData: any) => {
                        setIsUploadingCampaign(true)
                        try {
                            let imageHash = campaign.image;
                            if (campaignData.coverImageFile) {
                                imageHash = await uploadFileToIPFS(campaignData.coverImageFile);
                            }
                            await updateCampaignOnChain(
                                BigInt(campaign.id),
                                campaignData.campaignTitle || campaign.title,
                                campaignData.description || campaign.description,
                                imageHash || '',
                                Number(campaignData.target || campaign.target)
                            );
                            
                            // Invalidate queries to refresh the UI
                            queryClient.invalidateQueries({ queryKey: ['campaign', id] });
                            queryClient.invalidateQueries({ queryKey: ['userCampaigns', address] });
                            
                            setIsCampaignUpdated(true);
                            setTimeout(() => setIsCampaignUpdated(false), 4000);
                            setIsEditModalOpen(false);
                        } catch (err: any) {
                            console.error("Failed to update campaign:", err);
                            // Show error to user (you can adjust this if you have a state for it)
                            alert(err.message || "Failed to update campaign. Did you redeploy the contract?");
                        } finally {
                            setIsUploadingCampaign(false);
                        }
                    }}
                />
            )}
            
          
            {isUploadingCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Updating Campaign</h2>
                        <p className="text-gray-600">Please wait while we update your campaign...</p>
                    </div>
                </div>
            )}
            
          
            {isCampaignUpdated && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Updated!</h2>
                        <p className="text-gray-600">Your campaign has been successfully updated.</p>
                    </div>
                </div>
            )}
            
            {isDonating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Processing Donation</h2>
                        <p className="text-gray-600">Please wait while we process your donation...</p>
                    </div>
                </div>
            )}
            
            {donationSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Donation Successful!</h2>
                        <p className="text-gray-600 mb-4">Your donation has been processed. A proof-of-donation NFT has been minted to your wallet.</p>
                        {txHash && (
                            <p className="text-sm text-gray-500 mb-4 break-all">
                                Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                            </p>
                        )}
                        <p className="text-sm text-gray-600">
                            Funds have been automatically split: 70% to NGO, 20% to Designer, 10% to Platform
                        </p>
                    </div>
                </div>
            )}
            <KycModal
                isOpen={isKycModalOpen}
                walletAddress={address}
                onClose={() => setIsKycModalOpen(false)}
                onApproved={async () => {
                    setIsKycModalOpen(false)
                    await performDonation()
                }}
            />
        </div>
    )
}

export default CampaignDetails
