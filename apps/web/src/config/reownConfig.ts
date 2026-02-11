import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

export const hederaMainnet = {
  id: 295,
  name: 'Hedera Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR'
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api']
    }
  },
  blockExplorers: {
    default: {
      name: 'HashScan',
      url: 'https://hashscan.io/mainnet'
    }
  },
  testnet: false
}

export const hederaTestnet = {
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR'
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api']
    }
  },
  blockExplorers: {
    default: {
      name: 'HashScan',
      url: 'https://hashscan.io/testnet'
    }
  },
  testnet: true
}

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

const metadata = {
  name: 'DonateOnChain',
  description: 'Hedera donation platform',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://donateonchain.com',
  icons: []
}

const networks = [hederaMainnet, hederaTestnet]

const wagmiAdapter = new WagmiAdapter({
  networks: networks as any,
  projectId,
  ssr: false
})
const adapters = [wagmiAdapter]

export const reownAppKit = createAppKit({
  adapters,
  networks: networks as any,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: []
  },
  enableEIP6963: true,
  enableCoinbase: true
})

export const wagmiConfig = wagmiAdapter.wagmiConfig