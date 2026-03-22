import Header from "../component/Header";
import Footer from "../component/Footer";
import CreatorCard from "../component/CreatorCard";
import CampaignCard from "../component/CampaignCard";
import { SkeletonCard, SkeletonCampaignCard } from "../component/Skeleton";
import HeroImage from "../assets/Heroimg.png";
import Clothimg from "../assets/Clothimg.png";
import Bannerleft from "../assets/Bannerleft.png";
import Bannerright from "../assets/Bannerright.png";
import BannerNft from "../assets/BannerNft.png";
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react'
import Creatorimg from '../assets/Creator.png'
import { getAllGlobalDesigns } from '../utils/storageApi'
import { getStorageJson } from '../utils/safeStorage'
import { listAllCampaignsFromChain, getUserRoles } from '../onchain/adapter'
import { computeCampaignPercent } from '../utils/hbar'

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

const Home = () => {
    const navigate = useNavigate();
    const { address, isConnected } = useAccount()
        const { data: popularDesigns = [], isLoading: isLoadingDesigns } = useQuery({
        queryKey: ['globalDesigns'],
        queryFn: async () => {
            try {
                const storedDesigns = await getAllGlobalDesigns();
                const validStoredDesigns = storedDesigns.filter((design: any) => design && design.id && design.pieceName);
                
                const userDesigns = getStorageJson<any[]>('userDesigns', []);
                const ngoDesigns = getStorageJson<any[]>('ngoDesigns', []);
                const validUserDesigns = userDesigns.filter((design: any) => design && design.id && design.pieceName);
                const validNgoDesigns = ngoDesigns.filter((design: any) => design && design.id && design.pieceName);
                
                const allDesigns = [...validStoredDesigns, ...validUserDesigns, ...validNgoDesigns];
                
                const uniqueDesigns = Array.from(
                    new Map(allDesigns.map(design => [design.id, design])).values()
                );
                
                const sortedDesigns = uniqueDesigns
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                
                return sortedDesigns.slice(0, 10);
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('Error loading designs from API, using localStorage only:', error);
                }
                const userDesigns = getStorageJson<any[]>('userDesigns', []);
                const ngoDesigns = getStorageJson<any[]>('ngoDesigns', []);
                const validUserDesigns = userDesigns.filter((design: any) => design && design.id && design.pieceName);
                const validNgoDesigns = ngoDesigns.filter((design: any) => design && design.id && design.pieceName);
                const allDesigns = [...validUserDesigns, ...validNgoDesigns];
                
                const sortedDesigns = allDesigns
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                
                return sortedDesigns.slice(0, 10);
            }
        }
    });

    const { data: popularCampaigns = [], isLoading: isLoadingCampaigns } = useQuery({
        queryKey: ['globalCampaigns'],
        queryFn: async () => {
            const cacheKey = 'home_popular_campaigns_v2';
            const cached = getCache(cacheKey);
            if (cached) return cached;

            try {
                const onchainCampaigns = await listAllCampaignsFromChain();
                const sortedCampaigns = onchainCampaigns
                    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                const topCampaigns = sortedCampaigns.slice(0, 5);
                setCache(cacheKey, topCampaigns);
                return topCampaigns;
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('Error loading campaigns:', error);
                }
                return [];
            }
        }
    });

    const showcaseCreators = useMemo(() => {
        const map = new Map<string, { id: string; image: string; name: string; role: string }>()
        for (const d of popularDesigns as any[]) {
            const w = d?.walletAddress || d?.connectedWalletAddress
            if (typeof w === 'string' && w.length > 4) {
                const k = w.toLowerCase()
                if (!map.has(k)) {
                    map.set(k, {
                        id: k,
                        image: Creatorimg,
                        name: `${w.slice(0, 6)}…${w.slice(-4)}`,
                        role: d?.isNgo ? 'NGO' : 'Designer',
                    })
                }
            }
        }
        return Array.from(map.values()).slice(0, 6)
    }, [popularDesigns])

    const shoeCollections = useMemo(
        () =>
            (popularDesigns as any[]).filter((d) => {
                const t = String(d?.type || d?.design?.type || '').toLowerCase()
                return t.includes('shoe') || t.includes('footwear') || t.includes('sneaker')
            }),
        [popularDesigns]
    )

    const isLoading = isLoadingDesigns || isLoadingCampaigns;
    const handleGetStarted = async () => {
        if (isConnected && address) {
            try {
                const roles = await getUserRoles(address as `0x${string}`)
                if (roles.isDesigner) {
                    navigate('/create-design')
                    return
                }
            } catch {}
        }
        navigate('/become-a-designer')
    }
  return (
    <div>
      <Header />

      <section className="relative max-h-[780px] min-h-[780px] flex items-end justify-start overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={HeroImage}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>

        <div className="relative z-10 text-white px-6 pb-20 max-w-2xl">
          <h1
            className="mb-6 text-left"
            style={{
              fontFamily: "Legian Typeface",
              fontWeight: 400,
              fontStyle: "normal",
              fontSize: "60px",
              lineHeight: "65px",
              letterSpacing: "-3%",
            }}
          >
            Where <span className="font-black">Creativity</span> Meets{" "}
            <span className="font-black">Social Impact</span>
          </h1>
          <p
            className="text-left text-gray-200 max-w-xl"
            style={{
              fontFamily: "Gellix",
              fontWeight: 300,
              fontStyle: "normal",
              fontSize: "20px",
              lineHeight: "30px",
              letterSpacing: "0%",
            }}
          >
            Buy or design products that give back. Every transaction supports
            verified causes and rewards you with NFT proof of donation.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-7 py-12">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
          Popular Designs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {isLoading ? (
            [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
          ) : popularDesigns.length > 0 ? (
            popularDesigns.slice(0, 5).map((item) => {
                const design = (item as any).isDesign ? (item as any).design : item;
                return (
                  <div 
                    key={item.id}
                    className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                    onClick={() => navigate(`/product/${item.id}`)}
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
                        
                      
                        {design.frontDesign?.url && (
                          <div 
                            className="absolute"
                            style={{ 
                              width: '50%', 
                              height: 'auto',
                              maxWidth: '145px',
                              maxHeight: '200px',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <img 
                              src={design.frontDesign.url} 
                              alt="Design" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        {!design.frontDesign?.url && design.frontDesign?.dataUrl && (
                          <div 
                            className="absolute"
                            style={{ 
                              width: '50%', 
                              height: 'auto',
                              maxWidth: '145px',
                              maxHeight: '200px',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <img 
                              src={design.frontDesign.dataUrl} 
                              alt="Design" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        
                        
                      {!design.frontDesign?.url && !design.frontDesign?.dataUrl && (
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-2">👕</div>
                            <p className="text-sm">{design.type}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold leading-tight mb-1">
                        {item.pieceName || design.pieceName}
                      </h3>
                      <p className="text-[14px] text-black/60 mb-3">Campaign: {design.campaign}</p>
                      <p className="text-[22px] font-semibold">{design.price} HBAR</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(design.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
            })
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">
              No designs yet. Browse the shop or create your own.
            </p>
          )}
        </div>
      </section>

      
      <section className="px-4 md:px-7 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 max-h-[600px]">
          <div className="relative rounded-3xl overflow-hidden lg:col-span-6 max-h-[500px]">
            <img
              src={Bannerleft}
              alt="Design your own merch"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute inset-0 p-6 md:p-10 text-white flex flex-col justify-between">
              <div>
                <h3
                  className="text-3xl md:text-5xl font-semibold leading-tight"
                  style={{
                    fontFamily: "Legian Typeface",
                    fontWeight: 400,
                    fontSize: "40px",
                    lineHeight: "45px",
                    letterSpacing: "-3%",
                  }}
                >
                  Design your own Merch
                </h3>
                <p
                  className="mt-4 text-lg md:text-xl max-w-xl"
                  style={{
                    fontFamily: "Gellix",
                    fontWeight: 400,
                    fontSize: "20px",
                    lineHeight: "28px",
                    letterSpacing: "0%",
                  }}
                >
                  Design with purpose turn your creativity into meaningful
                  contributions that support real-world causes.
                </p>
              </div>
              <div className="self-end">
                <button className="bg-white text-black rounded-full px-6 py-3 text-sm font-semibold" onClick={handleGetStarted}>
                  Get Started
                </button>
              </div>
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden bg-[#FFC33F] lg:col-span-4 max-h-[600px]">
            <img
              src={Bannerright}
              alt="Earn NFTs for Every Creation Bought"
              className="absolute right-0 bottom-0 h-full object-contain pointer-events-none"
            />
            <div className="absolute inset-0 p-6 md:p-10 text-white flex flex-col justify-between">
              <div>
                <h3
                  className="text-3xl md:text-5xl font-semibold leading-tight"
                  style={{
                    fontFamily: "Legian Typeface",
                    fontWeight: 400,
                    fontSize: "40px",
                    lineHeight: "45px",
                    letterSpacing: "-3%",
                  }}
                >
                  Earn NFTs for Every Creation Bought
                </h3>
                <p
                  className="mt-4 text-lg md:text-xl max-w-xl"
                  style={{
                    fontFamily: "Gellix",
                    fontWeight: 400,
                    fontSize: "20px",
                    lineHeight: "28px",
                    letterSpacing: "0%",
                  }}
                >
                  For Every Item you purchase, you're rewarded with an NFT that
                  celebrates your contribution to meaningful causes.
                </p>
              </div>
              <div className="self-end">
                <button className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold" onClick={() => navigate('/shop')}>
                  Start Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section className="px-4 md:px-7 py-12">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
          Popular Campaigns
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {isLoading ? (
            [...Array(5)].map((_, i) => <SkeletonCampaignCard key={i} />)
          ) : popularCampaigns.map((campaign: Record<string, any>) => {
            const target = Number(campaign.target || 0)
            const amountRaised = Number(campaign.amountRaised || 0)
            const percentage = computeCampaignPercent(amountRaised, target)
            const imageUrl = campaign.image || campaign.coverImageFile
            
            return (
              <CampaignCard
                key={campaign.onchainId || campaign.id}
                image={imageUrl}
                title={campaign.title}
                amountRaised={`${amountRaised.toLocaleString()} HBAR`}
                target={`${target.toLocaleString()} HBAR`}
                percentage={percentage}
                alt={campaign.title}
                onClick={() => navigate(`/campaign/${campaign.onchainId || campaign.id}`)}
              />
            )
          })}
        </div>
      </section>

      
      {popularDesigns.length > 5 && (
      <section className="px-4 md:px-7 py-12">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
          More designs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {popularDesigns.slice(5, 10).map((item) => {
                const design = (item as any).isDesign ? (item as any).design : item;
                return (
                  <div 
                    key={`more-${(item as any).id}`}
                    className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                    onClick={() => navigate(`/product/${(item as any).id}`)}
                  >
                    <div className="rounded-2xl bg-[#eeeeee] mb-4">
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center relative">
                        <img 
src="/shirtfront.png" 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          style={{ 
                            filter: design.color === '#FFFFFF' ? 'none' : 
                                   design.color === '#000000' ? 'brightness(0)' : 'none'
                          }}
                        />
                        {design.frontDesign?.url && (
                          <div 
                            className="absolute"
                            style={{ 
                              width: '50%', 
                              height: 'auto',
                              maxWidth: '145px',
                              maxHeight: '200px',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <img 
                              src={design.frontDesign.url} 
                              alt="" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        {!design.frontDesign?.url && design.frontDesign?.dataUrl && (
                          <div 
                            className="absolute"
                            style={{ 
                              width: '50%', 
                              height: 'auto',
                              maxWidth: '145px',
                              maxHeight: '200px',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <img 
                              src={design.frontDesign.dataUrl} 
                              alt="" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold leading-tight mb-1">
                        {(item as any).pieceName || design.pieceName}
                      </h3>
                      <p className="text-[22px] font-semibold">{design.price} HBAR</p>
                    </div>
                  </div>
                )
          })}
        </div>
      </section>
      )}

      
      <section className="px-4 md:px-8 py-12">
        <div className="bg-black rounded-3xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
            <div className="relative flex justify-center items-center h-[350px] xl:h-[650px]">
              <img
                src={BannerNft}
                alt="NFT Card"
                className="absolute w-[40%] md:w-[35%] rotate-[16deg] left-[55%] top-[10%] object-contain"
              />

              <img
                src={Clothimg}
                alt="T-shirt"
                className="absolute w-[80%] md:w-[75%] rotate-[-20deg] left-[5%] top-[-10%] object-contain z-10"
              />
            </div>

            <div className="p-8 md:p-12 text-white flex flex-col justify-center">
              <h3
                className="font-semibold leading-tight mb-6 text-4xl md:text-5xl"
                style={{
                  fontFamily: "Legian Typeface",
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                How It All Comes Together
              </h3>
              <p
                className="text-lg md:text-xl mb-8 max-w-lg"
                style={{
                  fontFamily: "Gellix",
                  fontWeight: 400,
                  lineHeight: "28px",
                }}
              >
                Creators design, supporters purchase, and together we make an
                impact powered by NFTs that track every contribution.
              </p>
              <button className="bg-white text-black rounded-full px-6 py-3 text-sm font-semibold w-fit hover:bg-gray-100 transition">
                Learn How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      

      

      
      {showcaseCreators.length > 0 && (
      <section className="px-4 md:px-7 py-12">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">Featured creators</h2>
           <div className="flex flex-wrap gap-6">
              {showcaseCreators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  image={creator.image}
                  name={creator.name}
                  role={creator.role}
                  alt={creator.name}
                />
              ))}
          </div>
      </section>
      )}


      {shoeCollections.length > 0 && (
       <section className="px-4 md:px-7 py-12">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
          Footwear
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {shoeCollections.slice(0, 5).map((item: any) => (
                <div 
                  key={`shoe-${item.id}`}
                  className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <div className="rounded-2xl bg-[#eeeeee] mb-4">
                    <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center relative">

                      {(item.frontDesign?.dataUrl || item.frontDesign?.url) && (
                        <img 
                          src={item.frontDesign?.url || item.frontDesign?.dataUrl} 
                          alt={item.pieceName}
                          className="w-full h-full object-contain"
                        />
                      )}
                      {!(item.frontDesign?.dataUrl || item.frontDesign?.url) && (
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">👟</div>
                          <p className="text-sm">{item.type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[22px] font-semibold leading-tight mb-1">{item.pieceName}</h3>
                    <p className="text-[14px] text-black/60 mb-3">Campaign: {item.campaign}</p>
                    <p className="text-[22px] font-semibold">{item.price} HBAR</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
          ))}
        </div>
      </section>
      )}

      <Footer />
    </div>
  );
};

export default Home;
