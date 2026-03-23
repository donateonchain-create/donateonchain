import Header from "../component/Header";
import Footer from "../component/Footer";
import Button from "../component/Button";
import { SkeletonProfile, SkeletonCard } from "../component/Skeleton";
import { Plus, X, Camera, Copy, Check, Loader2, XCircle } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { getStorageJson, setStorageJson, userProfileLocalKey } from '../utils/safeStorage'
import { getUserDesigns, saveUserProfileWithImages, getUserProfile, migrateDesignImagesToStorage, isNgoApplicationApproved, isDesignerApplicationApproved } from '../utils/storageApi'
import { useNgoApplicationQuery } from '../hooks/useNgoApplicationQuery'
import { useDesignerApplicationQuery } from '../hooks/useDesignerApplicationQuery'
import { getUserProofNFTs, listCampaignsByNGO } from '../onchain/adapter';
import { createCampaignByNGO } from '../onchain/adapter';
import CreateCampaignModal from '../component/CreateCampaignModal';
import { getIPFSURL, uploadFileToIPFS, uploadMetadataToIPFS } from '../utils/ipfs';
import { keccak256, stringToHex, formatUnits } from 'viem';
import { storeHash } from '../api/relayer';

interface Design {
    id: number;
    pieceName: string;
    campaign: string;
    price: string;
    createdAt: string;
    type: string;
    color: string;
    frontDesign?: {
        url?: string;
        dataUrl?: string;
    } | null;
    backDesign?: {
        url?: string;
        dataUrl?: string;
    } | null;
}

const UserProfile = () => {
    const navigate = useNavigate();
    const currentLocation = useLocation();
    const { address, isConnected } = useAccount();
        const queryClient = useQueryClient();
    const [activeCategory, setActiveCategory] = useState<'NFTs' | 'History' | 'Created' | 'Campaigns'>('NFTs');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Edit Profile Modal State
    const [formData, setFormData] = useState({ name: '', bio: '' });
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Create Campaign Modal State
    const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
    const [isCampaignCreatedSuccessfully, setIsCampaignCreatedSuccessfully] = useState(false);
    const [isCampaignCreateError, setIsCampaignCreateError] = useState(false);
    const [campaignErrorText, setCampaignErrorText] = useState('');
    const inFlightRef = useRef(false);

    // --- Queries ---

    const { data: myNfts = [], isLoading: isLoadingNfts } = useQuery({
        queryKey: ['userNfts', address],
        queryFn: async () => {
            if (!address) return [];
            return await getUserProofNFTs(address as `0x${string}`);
        },
        enabled: !!address,
    });

    const { data: profileData = { name: 'User', bio: '', bannerImage: null, profileImage: null }, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['userProfile', address, isConnected],
        queryFn: async () => {
            if (address && isConnected) {
                try {
                    const storedProfile = await getUserProfile(address);
                    if (storedProfile) {
                        return {
                            name: storedProfile.name || 'User',
                            bio: storedProfile.bio || '',
                            bannerImage: storedProfile.bannerImage || null,
                            profileImage: storedProfile.profileImage || null
                        };
                    }
                } catch {
                    // Fallback to local
                }
            }
            if (address) {
                const profile = getStorageJson<any>(userProfileLocalKey(address), null);
                if (profile) {
                    return {
                        name: profile.name || 'User',
                        bio: profile.bio || '',
                        bannerImage: profile.bannerImage ?? null,
                        profileImage: profile.profileImage ?? null
                    };
                }
            }
            return { name: 'User', bio: '', bannerImage: null, profileImage: null };
        }
    });

    const { data: ngoApplicationState, isLoading: isLoadingNgoApplication } = useNgoApplicationQuery()
    const ngoApproved = isNgoApplicationApproved(ngoApplicationState?.data ?? null)

    const { data: designerApplicationState, isLoading: isLoadingDesignerApplication } = useDesignerApplicationQuery()
    const designerApproved = isDesignerApplicationApproved(designerApplicationState?.data ?? null)

    const { data: createdDesigns = [] } = useQuery<Design[]>({
        queryKey: ['userDesigns', address],
        queryFn: async () => {
            if (!address || !isConnected) return getStorageJson<Design[]>('userDesigns', []);
            try {
                let storedDesigns = await getUserDesigns(address);
                const designsToMigrate = storedDesigns.filter((design: any) => 
                    (design.frontDesign?.dataUrl && !design.frontDesign?.url) || 
                    (design.backDesign?.dataUrl && !design.backDesign?.url)
                );
                
                if (designsToMigrate.length > 0) {
                    await Promise.all(designsToMigrate.map((design: any) => migrateDesignImagesToStorage(design, address, 'user')));
                    storedDesigns = await getUserDesigns(address);
                }
                if (storedDesigns && storedDesigns.length > 0) {
                    return storedDesigns.map((design: any) => ({
                        id: parseInt(design.id),
                        ...design
                    }));
                }
                return getStorageJson<Design[]>('userDesigns', []);
            } catch {
                return getStorageJson<Design[]>('userDesigns', []);
            }
        },
        enabled: !!address && isConnected,
    });

    const { data: createdCampaigns = [] } = useQuery({
        queryKey: ['userCampaigns', address],
        queryFn: async () => {
            if (!address || !isConnected || !ngoApproved) return [];
            try {
                return await listCampaignsByNGO(address, { bypassVisibilityAllowlist: true, includeAllStates: true });
            } catch {
                return [];
            }
        },
        enabled: !!address && isConnected && ngoApproved,
        refetchOnMount: true,
        staleTime: 0,
    });

    const sortedCreatedCampaigns = [...createdCampaigns].sort((a: any, b: any) => {
        const aid = Number(a?.onchainId ?? a?.id ?? 0)
        const bid = Number(b?.onchainId ?? b?.id ?? 0)
        return bid - aid
    })

    const statistics = {
        causesSupported: new Set(myNfts.map(n => n.campaignId.toString())).size,
        totalDonated: myNfts.reduce((sum, nft) => {
            if (!nft.amount || nft.amount <= 0n) return sum;
            return sum + parseFloat(formatUnits(nft.amount, 8));
        }, 0),
        totalProfit: 0,
        totalDesigns: createdDesigns.length
    };

    const isLoading = isLoadingProfile || isLoadingNgoApplication || isLoadingDesignerApplication;

    const saveProfileMutation = useMutation({
        mutationFn: async (updatedProfile: any) => {
            if (address) {
                setStorageJson(userProfileLocalKey(address), updatedProfile);
            }
            if (address && isConnected) {
                await saveUserProfileWithImages(address, updatedProfile);
            }
            return updatedProfile;
        },
        onSuccess: (updatedProfile) => {
            queryClient.setQueryData(['userProfile', address, isConnected], updatedProfile);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            setIsEditModalOpen(false);
        }
    });
    const isSaving = saveProfileMutation.isPending;

    const handleCategoryChange = (category: 'NFTs' | 'History' | 'Created' | 'Campaigns') => {
        setActiveCategory(category);
    };

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleEditProfile = () => {

        setFormData({
            name: profileData.name,
            bio: profileData.bio
        });
        setBannerImage(profileData.bannerImage);
        setProfileImage(profileData.profileImage);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        if (!isSaving) {
            setIsEditModalOpen(false);
        }
    };

    const handleSaveProfile = () => {
        if (!address || !isConnected) return;
        const updatedProfile = {
            name: formData.name,
            bio: formData.bio,
            bannerImage: bannerImage || profileData.bannerImage,
            profileImage: profileImage || profileData.profileImage
        };
        saveProfileMutation.mutate(updatedProfile);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setBannerImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateCampaign = async (campaignData: any) => {
        if (inFlightRef.current) return
        if (!isNgoApplicationApproved(ngoApplicationState?.data ?? null)) {
            setIsCampaignCreateError(true)
            setCampaignErrorText('Only approved NGOs can create campaigns.')
            return
        }
        inFlightRef.current = true
        setIsCreatingCampaign(true);
        setIsCampaignCreateError(false);
        setCampaignErrorText('');
        try {
            if (!address) throw new Error('Wallet not connected');
            let imageCid: string | null = null
            if (!campaignData.coverImageFile) {
                throw new Error('Campaign image is required')
            }
            imageCid = await uploadFileToIPFS(campaignData.coverImageFile)
            if (!imageCid) {
                throw new Error('Image upload failed; campaign will not be created')
            }
            const imageUrl = getIPFSURL(imageCid);
            // During campaign creation: create the onchain metadata object with 'goal' clearly set
            const goal = parseFloat((campaignData.target || '0').toString().replace(/[^0-9.]/g, '')) || 0
            const deadlineUnix =
                typeof campaignData.deadlineUnixSeconds === 'number' && Number.isFinite(campaignData.deadlineUnixSeconds)
                    ? campaignData.deadlineUnixSeconds
                    : undefined
            const baseMeta = {
                title: campaignData.campaignTitle,
                category: campaignData.category,
                description: campaignData.description,
                image: imageUrl,
                goal,
                ...(deadlineUnix != null
                    ? { deadlineUnix, deadlineISO: new Date(deadlineUnix * 1000).toISOString() }
                    : {}),
            }
            const contentHash = keccak256(stringToHex(JSON.stringify(baseMeta)));
            const meta = { ...baseMeta, contentHash };
            const metadataCid = await uploadMetadataToIPFS(meta);
            if (!metadataCid) throw new Error('Failed to upload metadata to IPFS');
            try {
                // Background tracking (optional in v2 contract)
                await storeHash(imageCid, address!);
                await storeHash(metadataCid, address!);
            } catch (e) {
                console.warn('relayer storeHash failed, proceeding with on-chain creation:', e)
            }
            const { receipt } = await createCampaignByNGO({
                designer: address as `0x${string}`,
                title: campaignData.campaignTitle,
                description: campaignData.description,
                imageCid: imageCid,
                metadataCid,
                targetHBAR: goal,
                ...(deadlineUnix != null ? { deadlineUnixSeconds: deadlineUnix } : {}),
            })

            const receiptStatus = receipt?.status as string | number | undefined
            if (!receipt || receiptStatus === 'reverted' || receiptStatus === 0 || receiptStatus === '0x0') {
                throw new Error('Campaign creation transaction failed on-chain')
            }

            setIsCampaignCreatedSuccessfully(true)
            setIsCreateCampaignModalOpen(false)
            // New logic: refetch campaigns after creation
            queryClient.invalidateQueries({ queryKey: ['userCampaigns', address] });
        } catch (err: any) {
            setIsCampaignCreateError(true)
            setCampaignErrorText(err?.message || 'Failed to create campaign')
        } finally {
            setIsCreatingCampaign(false)
            inFlightRef.current = false
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <SkeletonProfile />
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Header />


            <div className="pt-0 max-w-[1440px] mx-auto">

                <div className="relative w-full h-[150px] md:h-[250px] bg-black ">

                    {profileData.bannerImage && (
                        <img
                            src={profileData.bannerImage}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    )}


                    <div className="absolute bottom-[-25%]  left-4 md:left-7">
                        <div className="relative">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-yellow-400 rounded-full flex items-center justify-center overflow-hidden">
                                {profileData.profileImage ? (
                                    <img
                                        src={profileData.profileImage}
                                        alt="Profile"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <span className="text-black text-2xl md:text-4xl font-bold"></span>
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                                <Camera size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>


                <div className="px-4 md:px-7 pt-12 md:pt-24">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">

                        <div className="flex-1">
                            <h1 className="text-2xl md:text-4xl font-bold text-black mb-2">{profileData.name || 'User'}</h1>
                            {profileData.bio && (
                                <p className="text-black text-sm md:text-lg leading-relaxed max-w-md mb-3">
                                    {profileData.bio}
                                </p>
                            )}
                            {isConnected && address && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleCopyAddress}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-mono"
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={16} className="text-green-600" />
                                                <span className="text-green-600">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} className="text-gray-600" />
                                                <span className="text-gray-700">{shortenAddress(address)}</span>
                                            </>
                                        )}
                                    </button>
                                    {designerApproved && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                            🎨 Designer
                                        </span>
                                    )}
                                    {ngoApproved && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                            🏢 NGO
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>


                        <div className="flex flex-row flex-wrap gap-3">
                            <Button variant="secondary" size="lg" className="gap-2" onClick={handleEditProfile}>
                                Edit Profile
                            </Button>

                            {designerApproved ? (
                                <Button
                                    variant="primary-bw"
                                    size="lg"
                                    className="gap-2"
                                    onClick={() => navigate('/create-design', { state: { fromNgo: false } })}
                                >
                                    <Plus size={20} />
                                    Create Design
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    className="gap-2"
                                    onClick={() => navigate('/become-a-designer', { state: { fromNgo: false } })}
                                >
                                    <Plus size={20} />
                                    Become a Designer
                                </Button>
                            )}

                            {ngoApproved ? (
                                <Button
                                    variant="primary-bw"
                                    size="lg"
                                    className="gap-2"
                                    onClick={() => setIsCreateCampaignModalOpen(true)}
                                >
                                    <Plus size={20} />
                                    Create Campaign
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    className="gap-2"
                                    onClick={() => navigate('/become-an-ngo')}
                                >
                                    <Plus size={20} />
                                    Become an NGO
                                </Button>
                            )}
                        </div>
                    </div>
                </div>


                <div className="px-4 md:px-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        <div className="bg-black rounded-lg p-6">
                            <h3 className="text-white text-sm font-medium mb-2">Causes Supported</h3>
                            <p className="text-white text-3xl md:text-4xl font-bold">{statistics.causesSupported}</p>
                        </div>


                        <div className="bg-black rounded-lg p-6">
                            <h3 className="text-white text-sm font-medium mb-2">Total Donated</h3>
                            <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalDonated.toLocaleString()} HBAR</p>
                        </div>


                        {designerApproved && (
                            <div className="bg-black rounded-lg p-6">
                                <h3 className="text-white text-sm font-medium mb-2">Total Profit</h3>
                                <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalProfit.toLocaleString()} HBAR</p>
                            </div>
                        )}


                        {designerApproved && (
                            <div className="bg-black rounded-lg p-6">
                                <h3 className="text-white text-sm font-medium mb-2">Total Designs</h3>
                                <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalDesigns}</p>
                            </div>
                        )}

                        {ngoApproved && (
                            <div className="bg-black rounded-lg p-6">
                                <h3 className="text-white text-sm font-medium mb-2">Total Campaigns</h3>
                                <p className="text-white text-3xl md:text-4xl font-bold">{createdCampaigns.length}</p>
                            </div>
                        )}
                    </div>
                </div>


                <div className="px-4 md:px-7 mt-20">

                    <div className="flex gap-2 mb-8 flex-wrap">
                        <Button
                            variant={activeCategory === 'NFTs' ? 'primary-bw' : 'secondary'}
                            size="lg"
                            onClick={() => handleCategoryChange('NFTs')}
                        >
                            NFTs
                        </Button>
                        <Button
                            variant={activeCategory === 'History' ? 'primary-bw' : 'secondary'}
                            size="lg"
                            onClick={() => handleCategoryChange('History')}
                        >
                            History
                        </Button>
                        {designerApproved && (
                            <Button
                                variant={activeCategory === 'Created' ? 'primary-bw' : 'secondary'}
                                size="lg"
                                onClick={() => handleCategoryChange('Created')}
                            >
                                Created
                            </Button>
                        )}
                        {ngoApproved && (
                            <Button
                                variant={activeCategory === 'Campaigns' ? 'primary-bw' : 'secondary'}
                                size="lg"
                                onClick={() => handleCategoryChange('Campaigns')}
                            >
                                Campaigns
                            </Button>
                        )}
                    </div>


                    {activeCategory === 'NFTs' && (
                        <div className="mb-40">
                            {isLoadingNfts ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <SkeletonCard key={i} />
                                    ))}
                                </div>
                            ) : myNfts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🎫</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No NFTs collected yet</h3>
                                    <p className="text-gray-500">Your collected NFTs will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {myNfts.map((nft, idx) => (
                                        <div
                                            key={idx}
                                            className="border rounded-xl overflow-hidden bg-white cursor-pointer hover:shadow-lg transition-shadow"
                                            onClick={() => {
                                                const tokenId = import.meta.env.VITE_NFT_TOKEN_ID || '0.0.8318134'
                                                window.open(`https://hashscan.io/testnet/token/${tokenId}/${nft.tokenId.toString()}`, '_blank', 'noopener,noreferrer')
                                            }}
                                            title="View NFT on HashScan"
                                        >
                                            {nft.image ? (
                                                <img src={nft.image} alt={nft.campaignTitle || `NFT #${nft.tokenId.toString()}`} className="w-full h-48 object-cover" />
                                            ) : (
                                                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-2">
                                                    <span className="text-4xl">🎫</span>
                                                    <span className="text-xs text-gray-400">Proof of Donation</span>
                                                </div>
                                            )}
                                            <div className="p-3">
                                                <div className="text-sm font-semibold text-black truncate">
                                                    {nft.campaignTitle || `Donation #${nft.tokenId.toString()}`}
                                                </div>
                                                <div className="text-xs mt-1.5 flex flex-col gap-1">
                                                    <div className="font-medium text-gray-800 flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        {nft.amount && nft.amount > 0n
                                                            ? `${parseFloat(formatUnits(nft.amount, 8)).toLocaleString(undefined, { maximumFractionDigits: 2 })} HBAR Donated`
                                                            : `Donated`}
                                                    </div>
                                                    <div className="flex items-center justify-between text-gray-500">
                                                        <span>{nft.timestamp ? new Date(Number(nft.timestamp) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : `NFT #${nft.tokenId.toString()}`}</span>
                                                        <span className="text-blue-600 font-medium tracking-wide">HashScan ↗</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeCategory === 'History' && (
                        <div className="mb-40">
                            {isLoadingNfts ? (
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="border rounded-lg p-4 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : myNfts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📜</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No transaction history</h3>
                                    <p className="text-gray-500">Your donation history will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {[...myNfts]
                                        .sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)))
                                        .map((nft, idx) => {
                                            const tokenId = import.meta.env.VITE_NFT_TOKEN_ID || '0.0.8318134'
                                            const hashScanUrl = `https://hashscan.io/testnet/token/${tokenId}/${nft.tokenId.toString()}`
                                            const amountDisplay = nft.amount && nft.amount > 0n
                                                ? `${parseFloat(formatUnits(nft.amount, 8)).toLocaleString(undefined, { maximumFractionDigits: 2 })} HBAR`
                                                : '—'
                                            const dateDisplay = nft.timestamp
                                                ? new Date(Number(nft.timestamp) * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '—'
                                            return (
                                                <div key={idx} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium">{nft.campaignTitle || `Campaign #${nft.campaignId.toString()}`}</div>
                                                            <div className="text-xs text-gray-500 mt-1">{dateDisplay}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold text-green-700">{amountDisplay} Donated</div>
                                                            <a
                                                                className="text-xs underline text-blue-600"
                                                                href={hashScanUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                HashScan ↗
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeCategory === 'Created' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-40">
                            {createdDesigns.length > 0 ? (
                                createdDesigns.map((design) => (
                                    <div
                                        key={design.id}
                                        className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/product/${design.id}`)}
                                    >
                                        <div className="rounded-2xl bg-[#eeeeee] mb-4">
                                            <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center relative">

                                                <img
                                                    src="/shirtfront.png"
                                                    alt="Shirt Mockup"
                                                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                                    style={{
                                                        filter: design.color === '#FFFFFF' ? 'none' :
                                                            design.color === '#000000' ? 'brightness(0)' : 'none'
                                                    }}
                                                />


                                                {(design.frontDesign?.dataUrl || design.frontDesign?.url) && (
                                                    <div
                                                        className="absolute"
                                                        style={{
                                                            width: '65%',
                                                            height: 'auto',
                                                            maxWidth: '145px',
                                                            maxHeight: '200px',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)'
                                                        }}
                                                    >
                                                        <img
                                                            src={design.frontDesign?.url || design.frontDesign?.dataUrl}
                                                            alt="Design"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}


                                                {!(design.frontDesign?.dataUrl || design.frontDesign?.url) && (
                                                    <div className="text-center text-gray-500">
                                                        <div className="text-4xl mb-2">👕</div>
                                                        <p className="text-sm">{design.type}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[22px] font-semibold leading-tight mb-1">
                                                {design.pieceName}
                                            </h3>
                                            <p className="text-[14px] text-black/60 mb-3">Campaign: {design.campaign}</p>
                                            <p className="text-[22px] font-semibold">{design.price} HBAR</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Created: {new Date(design.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-6xl mb-4">🎨</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No designs created yet</h3>
                                    <p className="text-gray-500 mb-6">Start creating your first design to see it here!</p>
                                    {designerApproved ? (
                                        <Button
                                            variant="primary-bw"
                                            size="lg"
                                            onClick={() => navigate('/create-design', { state: { fromNgo: false } })}
                                            className="gap-2"
                                        >
                                            <Plus size={20} />
                                            Create Design
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={() => navigate('/become-a-designer', { state: { fromNgo: false } })}
                                            className="gap-2"
                                        >
                                            <Plus size={20} />
                                            Become a Designer
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                        {activeCategory === 'Campaigns' && ngoApproved && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-40">
                            {sortedCreatedCampaigns.length > 0 ? (
                                sortedCreatedCampaigns.map((campaign) => (
                                    <div
                                        key={campaign.onchainId || campaign.id}
                                        className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                                        onClick={() =>
                                            navigate(`/campaign/${campaign.onchainId || campaign.id}`, {
                                                state: { fromPath: currentLocation.pathname },
                                            })
                                        }
                                    >
                                        <div className="relative h-48 bg-gray-200">
                                            {campaign.image && (
                                                <img
                                                    src={campaign.image}
                                                    alt={campaign.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-lg font-semibold text-black mb-2">{campaign.title}</h3>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Raised: {campaign.amountRaised || 0} HBAR</span>
                                                    <span>Target: {campaign.target || 0} HBAR</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-black h-2 rounded-full"
                                                        style={{ width: `${Math.min((campaign.amountRaised || 0) / (campaign.target || 1) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    Created: {new Date(campaign.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        campaign.status === 'active'
                                                            ? 'bg-green-100 text-green-700'
                                                            : campaign.status === 'pending'
                                                              ? 'bg-yellow-100 text-yellow-700'
                                                              : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {campaign.status === 'active'
                                                        ? 'Active'
                                                        : campaign.status === 'pending'
                                                          ? 'Pending'
                                                          : 'Flagged'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-6xl mb-4">📢</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No campaigns created yet</h3>
                                    <p className="text-gray-500 mb-6">Start your first fundraising campaign!</p>
                                    <Button
                                        variant="primary-bw"
                                        size="lg"
                                        onClick={() => setIsCreateCampaignModalOpen(true)}
                                        className="gap-2"
                                    >
                                        <Plus size={20} />
                                        Create Campaign
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>


            {isEditModalOpen && (
                <>

                    <div
                        className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-50"
                        onClick={handleCloseModal}
                    />


                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-600" />
                                </button>
                                <h2 className="text-xl font-semibold text-black">Edit profile</h2>
                                <Button
                                    variant="primary-bw"
                                    size="sm"
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </Button>
                            </div>


                            <div className="p-6">

                                <div className="relative mb-6">
                                    <div className="w-full h-32 bg-black rounded-xl relative overflow-hidden">
                                        {bannerImage && (
                                            <img
                                                src={bannerImage}
                                                alt="Banner"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-colors cursor-pointer">
                                            <Camera size={24} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleBannerUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>


                                <div className="relative mb-6">
                                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center relative -mt-10 ml-4 overflow-hidden">
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <span className="text-black text-2xl font-bold"></span>
                                        )}
                                        <label className="absolute w-8 h-8 bg-black rounded-full flex items-center justify-center cursor-pointer border-2 border-white">
                                            <Camera size={14} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProfileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>


                                <div className="space-y-4">

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                        />
                                    </div>


                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => handleInputChange('bio', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}


            {showSuccessMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Profile has been successfully updated!</span>
                </div>
            )}

            {isCreateCampaignModalOpen && ngoApproved && (
                <CreateCampaignModal
                    isOpen={isCreateCampaignModalOpen}
                    onClose={() => {
                        setIsCreateCampaignModalOpen(false);
                        if (address && isConnected && ngoApproved) {
                            queryClient.invalidateQueries({ queryKey: ['userCampaigns', address] });
                        }
                    }}
                    onSubmit={handleCreateCampaign}
                />
            )}

            <Footer />

            {isCreatingCampaign && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Creating campaign</h2>
                        <p className="text-gray-600">Uploading media and confirming on-chain…</p>
                    </div>
                </div>
            )}

            {isCampaignCreatedSuccessfully && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Created!</h2>
                        <p className="text-gray-600 mb-6">Your campaign has been created successfully.</p>
                        <Button
                            variant="primary-bw"
                            size="lg"
                            onClick={() => {
                                setIsCampaignCreatedSuccessfully(false);
                                setActiveCategory('Campaigns');
                            }}
                            className="w-full"
                        >
                            View Campaigns
                        </Button>
                    </div>
                </div>
            )}

            {isCampaignCreateError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Creation Failed</h2>
                        <p className="text-gray-600 mb-6">{campaignErrorText}</p>
                        <Button variant="primary-bw" size="lg" onClick={() => setIsCampaignCreateError(false)} className="w-full">Close</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserProfile;

