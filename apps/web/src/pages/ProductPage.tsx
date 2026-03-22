import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Banner from '../component/Banner'
import ProductCard from '../component/ProductCard'
import Clothimg from '../assets/Clothimg.png'
import { ChevronDown, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { getIPFSURL } from '../utils/ipfs'
import { getStorageJson } from '../utils/safeStorage'
import { getUserDesigns, getNGODesigns, getAllGlobalDesigns, getDesignIndex } from '../utils/storageApi'
import { getDesignById, getDesignPrice } from '../onchain/adapter'
import { SkeletonProductDetail, SkeletonCard } from '../component/Skeleton'

const ProductPage = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { address, isConnected } = useAccount()
        const [selectedSize, setSelectedSize] = useState<string>('')
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
    const [openAccordion, setOpenAccordion] = useState<string | null>(null)
    const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false)
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
    const [currentImageView, setCurrentImageView] = useState<'front' | 'back'>('front')
    const { addToCart } = useCart()

    const { data: customDesign, isLoading } = useQuery({
        queryKey: ['product', id, address, isConnected],
        queryFn: async () => {
            if (!id) return null
            try {
                const onchain = await getDesignById(BigInt(id))
                if (onchain) {
                    let price = Number(onchain.priceHBAR) / 1e18
                    try { const p = await getDesignPrice(BigInt(id)); price = Number(p) / 1e18 } catch {}
                    const index = await getDesignIndex(id.toString())
                    let meta: any = null
                    if (index?.metadataCid) {
                        const url = getIPFSURL(index.metadataCid)
                        try { meta = await fetch(url).then(r => r.json()) } catch {}
                    }
                    return {
                        id: Number(id),
                        pieceName: meta?.name || onchain.title,
                        description: meta?.description || '',
                        price: `${price}`,
                        campaign: Number(onchain.campaignId),
                        color: '#FFFFFF',
                        sizes: ['XS','S','M','L','XL','XXL'],
                        frontDesign: index?.previewCid ? { url: getIPFSURL(index.previewCid) } : null,
                        backDesign: null,
                        walletAddress: onchain.designer,
                        isNgo: false,
                        quantity: 9999
                    }
                }
            } catch {}

            const userDesigns = getStorageJson<any[]>('userDesigns', [])
            const ngoDesigns = getStorageJson<any[]>('ngoDesigns', [])
            const allDesigns = [...userDesigns, ...ngoDesigns]
            const foundDesign = allDesigns.find((design: any) => design.id?.toString() === id?.toString() || design.id === parseInt(id))
            if (foundDesign) return foundDesign

            try {
                const allGlobalDesigns = await getAllGlobalDesigns()
                const foundGlobalDesign = allGlobalDesigns.find((design: any) => design.id?.toString() === id?.toString() || design.id === parseInt(id))
                if (foundGlobalDesign) return foundGlobalDesign

                if (address && isConnected) {
                    const userDesignsList = await getUserDesigns(address)
                    const ngoDesignsList = await getNGODesigns(address)
                    const allOwnDesigns = [...userDesignsList, ...ngoDesignsList]
                    const foundOwnDesign = allOwnDesigns.find((design: any) => design.id?.toString() === id?.toString() || design.id === parseInt(id))
                    if (foundOwnDesign) return foundOwnDesign
                }
            } catch {}
            return null
        }
    })

    const { data: relatedDesigns = [] } = useQuery({
        queryKey: ['relatedDesigns', id],
        queryFn: async () => {
            const all = await getAllGlobalDesigns().catch(() => [] as any[])
            const user = getStorageJson<any[]>('userDesigns', [])
            const ngo = getStorageJson<any[]>('ngoDesigns', [])
            const merged = [...all, ...user, ...ngo]
            const uniq = Array.from(new Map(merged.map((d: any) => [d.id, d])).values())
            return uniq.filter((d: any) => String(d.id) !== String(id)).slice(0, 5)
        },
        enabled: !!id,
    })

    const profileName = customDesign?.walletAddress ? (customDesign.isNgo ? 'An NGO' : 'A Designer') : ''
    const isMyDesign = customDesign && isConnected && address ? 
        (customDesign.walletAddress?.toLowerCase() === address.toLowerCase() || customDesign.connectedWalletAddress?.toLowerCase() === address.toLowerCase()) 
        : false
    const availableQuantity = customDesign ? (customDesign.quantity ?? customDesign.maxQuantity ?? 9999) : Infinity
    const maxAvailable = availableQuantity

    if (!customDesign) {
        return (
            <div>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
                        <button onClick={() => navigate('/')} className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors">Go Home</button>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const handleAccordionToggle = (section: string) => { setOpenAccordion(openAccordion === section ? null : section) }

    const handleAddToCart = () => {
        if (customDesign) {
            const limit = customDesign.quantity || customDesign.maxQuantity || maxAvailable
            const safeQuantity = Math.min(selectedQuantity, limit)

            if (isConnected && isMyDesign) {
                const maxQuantity = limit
                customDesign.sizes.forEach((size: string) => {
                    for (let i = 0; i < safeQuantity; i++) {
                        addToCart(customDesign.id, size, customDesign.color, maxQuantity)
                    }
                })
            } else if (selectedSize) {
                const maxQuantity = limit
                for (let i = 0; i < safeQuantity; i++) {
                    addToCart(customDesign.id, selectedSize, customDesign.color, maxQuantity)
                }
            }
            setShowSuccessMessage(true)
            setTimeout(() => { setShowSuccessMessage(false) }, 3000)
        }
    }

    const handleDeleteClick = () => { setShowDeleteModal(true) }
    const handleConfirmDelete = () => {
        if (customDesign) {
            const storageKey = customDesign.isNgo ? 'ngoDesigns' : 'userDesigns'
            const existingDesigns = getStorageJson<any[]>(storageKey, [])
            const updatedDesigns = existingDesigns.filter((design: any) => design.id !== customDesign.id)
            localStorage.setItem(storageKey, JSON.stringify(updatedDesigns))
            const redirectPath = customDesign.isNgo ? '/ngo-profile' : '/user-profile'
            navigate(redirectPath)
        }
    }
    const handleCancelDelete = () => { setShowDeleteModal(false) }

    if (isLoading) {
        return (
            <div>
                <Header />
                <section className="px-4 md:px-7 py-12">
                    <SkeletonProductDetail />
                </section>
                <section className="px-4 md:px-7 py-12">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-8 animate-pulse"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </section>
                <Banner />
                <Footer />
            </div>
        )
    }

    return (
        <div>
            <Header />
            {showSuccessMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="font-medium">You added {selectedQuantity} item{selectedQuantity > 1 ? 's' : ''} to cart!</span>
                </div>
            )}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-red-500" /></div>
                        <h2 className="text-2xl font-bold text-black mb-2">Delete Design?</h2>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete "{customDesign?.pieceName}"?</p>
                        <div className="flex gap-3">
                            <button onClick={handleCancelDelete} className="flex-1 bg-gray-200 text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
                            <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            <section className="px-4 md:px-7 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
                    <div className="flex justify-center">
                        <div className="w-full max-w-md">
                            <div className="bg-gray-100 rounded-2xl p-8 flex items-center justify-center">
                                {customDesign && (
                                    <div className="relative w-full max-w-sm">
                                        <img src="/shirtfront.png" alt="Shirt Mockup" className="w-full h-auto object-contain" style={{ filter: customDesign.color === '#FFFFFF' ? 'none' : customDesign.color === '#000000' ? 'brightness(0)' : 'none' }} />
                                        {currentImageView === 'front' && (customDesign.frontDesign?.dataUrl || customDesign.frontDesign?.url) && (
                                            <div className="absolute" style={{ width: '65%', height: 'auto', maxWidth: '145px', maxHeight: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                <img src={customDesign.frontDesign.url || customDesign.frontDesign.dataUrl} alt="Front Design" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        {currentImageView === 'back' && (customDesign.backDesign?.dataUrl || customDesign.backDesign?.url) && (
                                            <div className="absolute" style={{ width: '65%', height: 'auto', maxWidth: '145px', maxHeight: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                <img src={customDesign.backDesign.url || customDesign.backDesign.dataUrl} alt="Back Design" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        {((customDesign.frontDesign?.dataUrl || customDesign.frontDesign?.url) && (customDesign.backDesign?.dataUrl || customDesign.backDesign?.url)) && (
                                            <>
                                                <button onClick={() => setCurrentImageView(currentImageView === 'front' ? 'back' : 'front')} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"><ChevronLeft size={20} className="text-gray-700" /></button>
                                                <button onClick={() => setCurrentImageView(currentImageView === 'front' ? 'back' : 'front')} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"><ChevronRight size={20} className="text-gray-700" /></button>
                                            </>
                                        )}
                                        {((customDesign.frontDesign?.dataUrl || customDesign.frontDesign?.url) || (customDesign.backDesign?.dataUrl || customDesign.backDesign?.url)) && (
                                            <div className="flex justify-center mt-4">
                                                <div className="flex bg-white rounded-lg p-1 shadow-sm">
                                                    <button onClick={() => setCurrentImageView('front')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentImageView === 'front' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'}`}>Front</button>
                                                    <button onClick={() => setCurrentImageView('back')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentImageView === 'back' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'}`}>Back</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="max-w-md">
                            <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">{customDesign.pieceName}</h1>
                            <p className="text-lg text-black mb-2">{`Campaign: ${customDesign.campaign}`}</p>
                            <p className="text-base text-gray-600 mb-4">Created by: {isConnected && isMyDesign ? 'You' : (profileName || (customDesign.isNgo ? 'An NGO' : 'A User'))}</p>
                            <p className="text-2xl font-semibold text-black mb-8">{`${customDesign.price} HBAR`}</p>
                            {customDesign && isConnected && isMyDesign ? (
                                <div className="flex gap-3 mb-8">
                                    <button onClick={() => navigate('/create-design', { state: { editDesign: customDesign } })} className="flex-1 bg-black text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">Edit Design</button>
                                    <button onClick={handleDeleteClick} className="bg-red-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-red-600 transition-colors"><Trash2 size={20} /></button>
                                    </div>
                            ) : (
                                <>
                            <div className="mb-8">
                                        <label className="block text-sm font-medium text-black mb-3">Size</label>
                                <div className="relative">
                                            <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent">
                                        <option value="">Choose an option</option>
                                        {(customDesign?.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map((size: string) => (
                                                    <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                            </div>
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-black mb-3">
                                    Quantity {(maxAvailable !== Infinity) && `(${maxAvailable} available)`}
                                </label>
                                {maxAvailable !== Infinity && selectedQuantity > maxAvailable && (
                                    <p className="text-red-500 text-sm mb-2">
                                        Cannot select more than {maxAvailable} items
                                    </p>
                                )}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                                        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-black hover:bg-gray-300 transition-colors"
                                    >
                                        <span className="text-base">-</span>
                                    </button>
                                    <input
                                        type="number"
                                        value={Math.min(selectedQuantity, maxAvailable)}
                                        onChange={(e) => {
                                            const raw = parseInt(e.target.value) || 1
                                            const clamped = Math.max(1, Math.min(raw, maxAvailable))
                                            setSelectedQuantity(clamped)
                                        }}
                                        className="w-16 h-10 border border-gray-300 rounded text-center text-sm"
                                        min="1"
                                        max={maxAvailable !== Infinity ? maxAvailable : undefined}
                                    />
                                    {maxAvailable !== Infinity && selectedQuantity > maxAvailable && (
                                        <span className="text-red-500 text-xs">Max: {maxAvailable}</span>
                                    )}
                                    <button
                                        onClick={() => setSelectedQuantity(Math.min(selectedQuantity + 1, maxAvailable))}
                                        className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={maxAvailable !== Infinity && selectedQuantity >= maxAvailable}
                                    >
                                        <span className="text-base">+</span>
                                    </button>
                                </div>
                            </div>
                                    {maxAvailable !== Infinity && maxAvailable <= 0 ? (
                                        <button className="w-full bg-gray-500 text-white py-4 px-6 rounded-lg font-semibold text-lg mb-8 cursor-not-allowed" disabled>Sold Out</button>
                                    ) : (
                                        <button
                                            onClick={handleAddToCart}
                                            className="w-full bg-black text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors mb-8 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            disabled={!selectedSize || (maxAvailable !== Infinity && selectedQuantity > maxAvailable)}
                                        >
                                            Add to cart
                                        </button>
                                    )}
                                </>
                            )}
                            {customDesign && customDesign.description && (
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-black mb-3">Description</label>
                                    <div className="p-4 bg-gray-50 rounded-lg"><p className="text-gray-700">{customDesign.description}</p></div>
                                        </div>
                                    )}
                            <div className="space-y-2">
                                <div className="border border-gray-200 rounded-lg">
                                    <button onClick={() => handleAccordionToggle('details')} className="w-full px-4 py-3 text-left bg-black text-white rounded-lg flex items-center justify-between hover:bg-gray-800 transition-colors"><span className="font-medium">Product Details</span><ChevronDown className={`transform transition-transform ${openAccordion === 'details' ? 'rotate-180' : ''}`} size={20} /></button>
                                    {openAccordion === 'details' && (<div className="p-4 bg-gray-50 text-gray-700"><p>{(customDesign as any)?.details || customDesign.description || '—'}</p></div>)}
                                </div>
                                <div className="border border-gray-200 rounded-lg">
                                    <button onClick={() => handleAccordionToggle('shipping')} className="w-full px-4 py-3 text-left bg-black text-white rounded-lg flex items-center justify-between hover:bg-gray-800 transition-colors"><span className="font-medium">Shipping</span><ChevronDown className={`transform transition-transform ${openAccordion === 'shipping' ? 'rotate-180' : ''}`} size={20} /></button>
                                    {openAccordion === 'shipping' && (<div className="p-4 bg-gray-50 text-gray-700"><p>{(customDesign as any)?.shipping || 'Standard shipping at checkout.'}</p></div>)}
                                </div>
                                <div className="border border-gray-200 rounded-lg">
                                    <button onClick={() => handleAccordionToggle('delivery')} className="w-full px-4 py-3 text-left bg-black text-white rounded-lg flex items-center justify-between hover:bg-gray-800 transition-colors"><span className="font-medium">Delivery</span><ChevronDown className={`transform transition-transform ${openAccordion === 'delivery' ? 'rotate-180' : ''}`} size={20} /></button>
                                    {openAccordion === 'delivery' && (<div className="p-4 bg-gray-50 text-gray-700"><p>{(customDesign as any)?.delivery || 'Delivery timelines are confirmed after order.'}</p></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {relatedDesigns.length > 0 && (
            <section className="px-4 md:px-7 py-12">
                <h2 className="text-3xl md:text-4xl font-bold text-black mb-8">You may also like</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {relatedDesigns.map((relatedProduct: any) => (
                        <ProductCard key={relatedProduct.id} image={relatedProduct.frontDesign?.url || relatedProduct.frontDesign?.dataUrl || Clothimg} title={relatedProduct.pieceName || relatedProduct.title || 'Design'} creator={relatedProduct.creator || `${String(relatedProduct.walletAddress || '').slice(0, 6)}…`} price={typeof relatedProduct.price === 'string' && relatedProduct.price.includes('HBAR') ? relatedProduct.price : `${relatedProduct.price} HBAR`} alt={relatedProduct.pieceName || ''} onClick={() => navigate(`/product/${relatedProduct.id}`)} />
                            ))}
                    </div>
            </section>
            )}
<Banner />
            <Footer />
        </div>
    )
}

export default ProductPage