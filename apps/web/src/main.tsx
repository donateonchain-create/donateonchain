import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === 'true'

const rootElement = document.getElementById('root')!
const root = ReactDOM.createRoot(rootElement)

async function renderApp() {
  if (WAITLIST_MODE) {
    const { Waitlist } = await import('./waitlist')
    root.render(
      <React.StrictMode>
        <Waitlist />
      </React.StrictMode>
    )
  } else {
    const [{ QueryClient, QueryClientProvider }, { WagmiProvider }, { wagmiConfig }, { default: App }] =
      await Promise.all([
        import('@tanstack/react-query'),
        import('wagmi'),
        import('./config/reownConfig'),
        import('./App')
      ])

    const queryClient = new QueryClient()

    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <App />
          </WagmiProvider>
        </QueryClientProvider>
      </React.StrictMode>
    )
  }
}

renderApp()
