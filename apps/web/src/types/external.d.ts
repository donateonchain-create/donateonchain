declare module '../contracts/addresses' {
  const value: {
    DONATE_ON_CHAIN: string
  }
  export default value
}

declare global {
  interface Window {
    ethereum?: {
      isHashPack?: boolean
      isMetaMask?: boolean
    }
  }
}

