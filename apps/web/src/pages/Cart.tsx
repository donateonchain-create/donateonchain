import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react'
import { useAccount } from 'wagmi'
import Header from "../component/Header";
import Footer from "../component/Footer";
import Banner from "../component/Banner";
import Button from "../component/Button";
import KycModal from '../component/KycModal'
import { useCart } from "../context/CartContext";
import { getStorageJson } from '../utils/safeStorage'
import { getAllGlobalDesigns } from '../utils/storageApi'
import { getDesignPrice, isKycVerifiedOnChain, listDesigns } from '../onchain/adapter';
import { SkeletonCartRow } from '../component/Skeleton';
import { getKycVerifications } from '../api'

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeItem } = useCart();
  const { address } = useAccount()
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const [kycError, setKycError] = useState<string | null>(null)

  const { data: customDesigns = [], isLoading: isDesignsLoading } = useQuery({
    queryKey: ['customDesigns'],
    queryFn: async () => {
      try {
        const storedDesigns = await getAllGlobalDesigns();
        let chainDesigns: any[] = []
        try {
          const onchain = await listDesigns()
          chainDesigns = onchain.map((d) => ({
            id: Number(d.id),
            pieceName: d.title,
            frontDesign: {},
            price: `${Number(d.priceHBAR) / 1e18}`,
            type: 'shirt',
            createdAt: Date.now(),
          }))
        } catch {}
        const userDesigns = getStorageJson<any[]>('userDesigns', []);
        const ngoDesigns = getStorageJson<any[]>('ngoDesigns', []);
        const allDesigns = [...chainDesigns, ...storedDesigns, ...userDesigns, ...ngoDesigns];
        return Array.from(
          new Map(allDesigns.map(design => [design.id, design])).values()
        );
      } catch {
        const userDesigns = getStorageJson<any[]>('userDesigns', []);
        const ngoDesigns = getStorageJson<any[]>('ngoDesigns', []);
        return [...userDesigns, ...ngoDesigns];
      }
    }
  });

  const { data: onchainPrices = {}, isLoading: isPricesLoading } = useQuery({
    queryKey: ['cachedPrices', cartItems.map(item => item.id).sort().join(',')],
    queryFn: async () => {
      const ids = Array.from(new Set(cartItems.map(ci => ci.id)));
      const next: Record<number, number> = {};
      for (const id of ids) {
        try {
          const p = await getDesignPrice(BigInt(id));
          const hbar = Number(p) / 1e18;
          if (hbar > 0) next[id] = hbar;
        } catch {}
      }
      return next;
    },
    enabled: cartItems.length > 0
  });

  const isLoading = isDesignsLoading || isPricesLoading;

 




  const getProductById = (id: number) => {
    return customDesigns.find((design) => design.id === id);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = getProductById(item.id);
      if (product) {
        const overrideHBAR = onchainPrices[item.id];
        if (overrideHBAR && !isNaN(overrideHBAR)) {
          return total + overrideHBAR * item.quantity;
        }
        let price;
        if (product.pieceName) {
          price = parseInt(product.price.toString().replace(/[^\d]/g, ""));
        } else if (product.price) {
          price = parseInt(product.price.replace(/[^\d]/g, ""));
        } else {
          price = 0;
        }
        return total + price * item.quantity;
      }
      return total;
    }, 0);
  };

  const shippingCost = 0;
  const subtotal = calculateSubtotal();

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} HBAR`;
  };

  const handleContinueToCheckout = async () => {
    if (!address) {
      navigate('/checkout')
      return
    }

    setKycError(null)
    try {
      const kyc = await getKycVerifications({ walletAddress: address, page: 1, limit: 1 })
      const latest = kyc.items?.[0]
      const isOnChainKyc = await isKycVerifiedOnChain(address as `0x${string}`)
      if (latest?.status !== 'approved' || !isOnChainKyc) {
        setIsKycModalOpen(true)
        return
      }
    } catch {
      setKycError('Unable to verify KYC status. Please try again.')
      return
    }

    navigate('/checkout')
  }

    return (
        <div>
            <Header />

         
      <section className="px-4 md:px-7 py-12">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-10 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <SkeletonCartRow key={i} />
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-10 bg-gray-200 rounded w-32 mb-8 animate-pulse"></div>
                <div className="bg-gray-100 rounded-lg p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded w-full animate-pulse mt-4"></div>
                </div>
              </div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-20">
              <h1 className="text-3xl font-bold text-black mb-8">
                Shopping bag
              </h1>
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Button
                onClick={() => navigate("/shop")}
                variant="primary-bw"
                size="lg"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
          
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold text-black mb-8">
                  Shopping bag
                </h1>

                <div className="space-y-6">
                  {cartItems.map((item, index) => {
                    const product = getProductById(item.id);
                    if (!product) return null;

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className="border-b border-gray-200 pb-6"
                      >
                        <div className="flex gap-4">
                        
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {product.pieceName ? (
                            
                              <>
                                <img 
                                  src="/shirtfront.png" 
                                  alt="Shirt Mockup" 
                                  className="w-full h-full object-cover"
                                  style={{ 
                                    filter: product.color === '#FFFFFF' ? 'none' : 
                                           product.color === '#000000' ? 'brightness(0)' : 'none'
                                  }}
                                />
                                {(product.frontDesign?.dataUrl || product.frontDesign?.url) && (
                                  <div 
                                    className="absolute"
                                    style={{ 
                                      width: '65%', 
                                      height: 'auto',
                                      maxWidth: '36px',
                                      maxHeight: '50px',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                  >
                                    <img 
                                      src={product.frontDesign?.url || product.frontDesign?.dataUrl} 
                                      alt="Design" 
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                           
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-black mb-1">
                              {product.pieceName || product.title}
                            </h3>
                            <p className="text-sm text-black mb-3">
                              {product.pieceName ? `Campaign: ${product.campaign}` : `By ${product.creator}`}
                            </p>
                            <p className="text-sm text-black mb-3">
                              {item.color} {item.size}
                            </p>

                            <div className="mb-3">
                              <label className="text-sm text-black mb-2 block">
                                Quantity{item.maxQuantity ? ` (max ${item.maxQuantity})` : ''}
                              </label>
                              <div className="flex items-center gap-2">
                                 <button
                                   onClick={() =>
                                     updateQuantity(item.uniqueId, item.quantity - 1)
                                   }
                                   className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                                 >
                                   <span className="text-base">-</span>
                                 </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.uniqueId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-12 h-8 border border-gray-300 rounded text-center text-sm"
                                  min="0"
                                />
                                 <button
                                   onClick={() =>
                                     updateQuantity(
                                       item.uniqueId,
                                       item.quantity + 1
                                     )
                                   }
                                   className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
                                   disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                                 >
                                   <span className="text-base">+</span>
                                 </button>
                              </div>
                            </div>

                            <button
                              onClick={() => removeItem(item.uniqueId)}
                              className="text-sm text-black hover:text-gray-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-medium text-black">
                              {formatPrice(
                                product.pieceName ? 
                                  parseInt(product.price.toString().replace(/[^\d]/g, "")) * item.quantity :
                                  parseInt(product.price.replace(/[^\d]/g, "")) * item.quantity
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            
              <div className="lg:col-span-1">
                <h2 className="text-3xl font-bold text-black mb-8">Summary</h2>

                <div className="bg-gray-100 rounded-lg p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-black">Subtotal</span>
                      <span className="text-black font-medium">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Shipping</span>
                      <span className="text-black font-medium">
                        {formatPrice(shippingCost)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-4">
                      <div className="flex justify-between">
                        <span className="text-black font-semibold text-lg">
                          Total
                        </span>
                        <span className="text-black font-semibold text-lg">
                          {formatPrice(subtotal + shippingCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary-bw"
                    size="lg"
                    className="w-full"
                    onClick={handleContinueToCheckout}
                  >
                    Continue to Checkout
                  </Button>
                  {kycError && (
                    <p className="mt-3 text-sm text-red-700">{kycError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

            <Banner />
            <KycModal
              isOpen={isKycModalOpen}
              walletAddress={address}
              onClose={() => setIsKycModalOpen(false)}
              onApproved={async () => {
                setIsKycModalOpen(false)
                navigate('/checkout')
              }}
            />
            <Footer />
        </div>
  );
};

export default Cart;
