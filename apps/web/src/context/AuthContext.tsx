import { createContext, useContext, useState, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import {
  requestNonce,
  verifySignature,
  getAuthToken,
  getAuthWallet,
  clearAuth,
  type VerifyResponse,
} from '../api/auth'

// ── Types ──────────────────────────────────────────────────────────────

interface AuthState {
  /** True once JWT is obtained and wallet still matches */
  isAuthenticated: boolean
  /** Authenticated wallet address (lowercase) */
  walletAddress: string | null
  /** User roles from the backend User model */
  roles: string[]
  /** JWT access token */
  token: string | null
  /** True while nonce/sign/verify flow is in progress */
  isSigningIn: boolean
  /** Last auth error message */
  error: string | null
  /** Trigger the SIWE sign-in flow manually */
  signIn: () => Promise<void>
  /** Clear auth state (on disconnect) */
  signOut: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

// ── Provider ───────────────────────────────────────────────────────────

/**
 * AuthProvider manages SIWE sign-in state.
 *
 * Key design choices (no-useEffect):
 * - Session restore is derived via useMemo (runs once per mount).
 * - Wallet disconnect / switch is handled by deriving `isAuthenticated`
 *   from whether the stored wallet matches the currently connected address.
 * - Parent should render <AuthProvider key={address ?? 'disconnected'}>
 *   if a full state reset on wallet change is desired (key-based remount).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  // Restore session from storage on mount (computed once, no effect needed)
  const restored = useMemo(() => {
    const storedToken = getAuthToken()
    const storedWallet = getAuthWallet()
    if (storedToken && storedWallet) {
      return { token: storedToken, walletAddress: storedWallet, roles: [] as string[] }
    }
    return null
  }, [])

  const [token, setToken] = useState<string | null>(restored?.token ?? null)
  const [walletAddress, setWalletAddress] = useState<string | null>(restored?.walletAddress ?? null)
  const [roles, setRoles] = useState<string[]>(restored?.roles ?? [])
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived: authenticated only if we have a token AND the connected wallet matches
  const isAuthenticated = useMemo(() => {
    if (!token || !walletAddress) return false
    if (!isConnected || !address) return false
    return address.toLowerCase() === walletAddress
  }, [token, walletAddress, isConnected, address])

  // If wallet disconnected or switched, clear stored auth (no effect — just derived + lazy clear)
  const prevAddressRef = useRef(address)
  if (address !== prevAddressRef.current) {
    prevAddressRef.current = address
    // Wallet changed — if we had auth for a different wallet, purge it
    if (walletAddress && address?.toLowerCase() !== walletAddress) {
      clearAuth()
      setToken(null)
      setWalletAddress(null)
      setRoles([])
      setError(null)
    }
  }

  const signOut = useCallback(() => {
    clearAuth()
    setToken(null)
    setWalletAddress(null)
    setRoles([])
    setError(null)
  }, [])

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      setError('Wallet not connected')
      return
    }

    setIsSigningIn(true)
    setError(null)

    try {
      // Step 1: Request nonce
      const nonceRes = await requestNonce(address)

      // Step 2: Prompt user to sign the message
      const signature = await signMessageAsync({ message: nonceRes.message })

      // Step 3: Verify with backend
      const verifyRes: VerifyResponse = await verifySignature(
        address,
        nonceRes.nonce,
        signature
      )

      if (verifyRes.ok && verifyRes.token) {
        setToken(verifyRes.token)
        setWalletAddress(verifyRes.user.walletAddress)
        setRoles(verifyRes.user.roles)
      } else {
        setError('Verification failed')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed'
      setError(msg)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('SIWE sign-in error:', e)
      }
    } finally {
      setIsSigningIn(false)
    }
  }, [address, isConnected, signMessageAsync])

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      walletAddress,
      roles,
      token,
      isSigningIn,
      error,
      signIn,
      signOut,
    }),
    [isAuthenticated, walletAddress, roles, token, isSigningIn, error, signIn, signOut]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
