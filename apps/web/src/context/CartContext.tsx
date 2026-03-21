import React, { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

    useQuery({
        queryKey: ['cartInit', address, isConnected],
        queryFn: async () => {
            let loadedCart: CartItem[] = [];
            let w = address || null;
            if (isConnected && address) {
                try {
                    const storedCart = await getCart(address);
                    if (storedCart && storedCart.length > 0) {
                        loadedCart = storedCart.map((item: any) => ({
                            ...item,
                            uniqueId: item.uniqueId || `${item.id}-${item.size}-${item.color}`
                        }));
                    }
                } catch {
                    const parsedCart = getStorageJson<any[]>(`cart_${address}`, []);
                    if (parsedCart.length > 0) Object.assign(loadedCart, parsedCart.map((item: any) => ({
                        ...item, uniqueId: item.uniqueId || `${item.id}-${item.size}-${item.color}`
                    })));
                }
            } else if (!isConnected && currentWallet) {
                const parsedCart = getStorageJson<any[]>(`cart_${currentWallet}`, []);
                if (parsedCart.length > 0) Object.assign(loadedCart, parsedCart.map((item: any) => ({
                    ...item, uniqueId: item.uniqueId || `${item.id}-${item.size}-${item.color}`
                })));
            }
            if (loadedCart.length > 0 || (currentWallet && currentWallet !== address)) {
                setCartItems(loadedCart);
                setCurrentWallet(w as any);
            }
            return loadedCart;
        }
    });

    const triggerSave = (newItems: CartItem[]) => {
        if (address) {
            localStorage.setItem(`cart_${address}`, JSON.stringify(newItems));
            saveCart(address, newItems).catch(() => {});
        } else {
            localStorage.setItem('cart', JSON.stringify(newItems));
        }
    };



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
                triggerSave(updatedItems);
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
                const newArr = [...prevItems, newItem];
                triggerSave(newArr);
                return newArr;
            }
        })
    }

    const updateQuantity = (uniqueId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(uniqueId)
            return
        }
        
        setCartItems(items => {
            const newItems = items.map(item => {
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
            });
            triggerSave(newItems);
            return newItems;
        })
    }

    const removeItem = (uniqueId: string) => {
        setCartItems(items => { const newItems = items.filter(item => item.uniqueId !== uniqueId); triggerSave(newItems); return newItems; })
    }

    const clearCart = () => {
        const newItems: CartItem[] = [];
        setCartItems(newItems);
        triggerSave(newItems);
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
