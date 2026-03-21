import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import type { Persister } from '@tanstack/react-query-persist-client'

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
    const [
      { QueryClient, QueryClientProvider },
      { WagmiProvider },
      { wagmiConfig },
      { persistQueryClient },
      { default: localforage },
      { default: App },
    ] = await Promise.all([
      import('@tanstack/react-query'),
      import('wagmi'),
      import('./config/reownConfig'),
      import('@tanstack/react-query-persist-client'),
      import('localforage'),
      import('./App'),
    ])

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchInterval: 30_000,
          refetchOnWindowFocus: false,
        },
      },
    })

    const persister: Persister = {
      persistClient: (client: any) =>
        localforage.setItem('donateonchain-query-cache', client).then(() => undefined),
      restoreClient: () =>
        localforage
          .getItem('donateonchain-query-cache')
          .then((value: any) => (value === null ? undefined : value)),
      removeClient: () =>
        localforage.removeItem('donateonchain-query-cache').then(() => undefined),
    }

    persistQueryClient({
      queryClient: queryClient as any,
      persister,
      maxAge: 1000 * 60 * 60,
    })

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
