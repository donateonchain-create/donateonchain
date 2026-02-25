import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '../config/reownConfig'
import App from '../App'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

describe('App component', () => {
    it('renders without crashing', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    <App />
                </WagmiProvider>
            </QueryClientProvider>
        )
        // Basic test to ensure context providers and router wrappers do not immediately crash.
        // It's possible that network requests inside the App will fail in a test environment, but 
        // passing this initial render without throwing an exception confirms providers are set up.
        expect(document.body).toBeTruthy()
    })
})
