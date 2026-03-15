import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { getStorageJson } from '../utils/safeStorage'
import { saveCart, getCart } from '../utils/storageApi'

interface CartItem {
    id: number
    quantity: number
    size: string
    color: string
    uniqueId: string
    campaign?: string
    pieceName?: string
    isNgo?: boolean
    maxQuantity?: number
}

interface CartContextType {
    cartItems: CartItem[]
    addToCart: (productId: number, size: string, color: string, maxQuantity?: number) => void
    updateQuantity: (uniqueId: string, newQuantity: number) => void
    removeItem: (uniqueId: string) => void
    clearCart: () => void
    getCartItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}

interface CartProviderProps {
    children: ReactNode
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [currentWallet, setCurrentWallet] = useState<string | null>(null)
    const { address, isConnected } = useAccount()

    useEffect(() => {
        const loadCart = async () => {
            if (isConnected && address) {
               
                if (currentWallet && currentWallet !== address) {
                    setCartItems([])
                    setCurrentWallet(address)
                    return
                }
                
             
                try {
                    const storedCart = await getCart(address)
                    if (storedCart && storedCart.length > 0) {
                        const migratedCart = storedCart.map((item: any) => {
                            if (!item.uniqueId) {
                                return {
                                    ...item,
                                    uniqueId: `${item.id}-${item.size}-${item.color}`
                                }
                            }
                            return item
                        })
                        setCartItems(migratedCart)
                        setCurrentWallet(address)
                        return
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        // eslint-disable-next-line no-console
                        console.error('Error loading cart from API:', error)
                    }
                }
                
             
                const parsedCart = getStorageJson<any[]>(`cart_${address}`, [])
                if (parsedCart.length > 0) {
                        const migratedCart = parsedCart.map((item: any) => {
                            if (!item.uniqueId) {
                                return {
                                    ...item,
                                    uniqueId: `${item.id}-${item.size}-${item.color}`
                                }
                            }
                            return item
                        })
                        setCartItems(migratedCart)
                    setCurrentWallet(address)
                } else {
                    setCurrentWallet(address)
                }
            } else if (!isConnected) {
               
                if (currentWallet) {
                    const parsedCart = getStorageJson<any[]>(`cart_${currentWallet}`, [])
                    if (parsedCart.length > 0) setCartItems(parsedCart)
                }
            }
        }
        
        loadCart()
    }, [address, isConnected, currentWallet])

    useEffect(() => {
        const saveToStorage = async () => {
            if (address) {
                localStorage.setItem(`cart_${address}`, JSON.stringify(cartItems))
            } else {
                localStorage.setItem('cart', JSON.stringify(cartItems))
            }
            
            if (isConnected && address) {
                try {
                    await saveCart(address, cartItems)
                } catch (error) {
                    if (import.meta.env.DEV) {
                        // eslint-disable-next-line no-console
                        console.error('Error saving cart to API:', error)
                    }
                }
            }
        }
        
        saveToStorage()
    }, [cartItems, address, isConnected])

    const addToCart = (productId: number, size: string, color: string, maxQuantity?: number) => {
        const uniqueId = `${productId}-${size}-${color}`
        setCartItems(prevItems => {
            const existingItemIndex = prevItems.findIndex(
                item => item.uniqueId === uniqueId
            )

                if (existingItemIndex > -1) {
                const updatedItems = [...prevItems]
                const currentItem = updatedItems[existingItemIndex]
                const newQuantity = currentItem.quantity + 1
                
                if (maxQuantity && newQuantity > maxQuantity) {
                    if (import.meta.env.DEV) {
                        // eslint-disable-next-line no-console
                        console.error('Cannot add more items, maximum quantity reached')
                    }
                    return prevItems
                }
                
                updatedItems[existingItemIndex] = {
                    ...currentItem,
                    quantity: newQuantity
                }
                return updatedItems
            } else {
                const newItem = { 
                    id: productId, 
                    quantity: 1, 
                    size, 
                    color, 
                    uniqueId,
                    maxQuantity
                }
                return [...prevItems, newItem]
            }
        })
    }

    const updateQuantity = (uniqueId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(uniqueId)
            return
        }
        
        setCartItems(items => 
            items.map(item => {
                if (item.uniqueId === uniqueId) {
                    if (item.maxQuantity && newQuantity > item.maxQuantity) {
                        if (import.meta.env.DEV) {
                            // eslint-disable-next-line no-console
                            console.error('Cannot exceed maximum quantity')
                        }
                        return item
                    }
                    return { ...item, quantity: newQuantity }
                }
                return item
            })
        )
    }

    const removeItem = (uniqueId: string) => {
        setCartItems(items => items.filter(item => item.uniqueId !== uniqueId))
    }

    const clearCart = () => {
        setCartItems([])
    }

    const getCartItemCount = () => {
        return cartItems.reduce((total, item) => total + item.quantity, 0)
    }

    const value: CartContextType = {
        cartItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        getCartItemCount
    }

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    )
}
