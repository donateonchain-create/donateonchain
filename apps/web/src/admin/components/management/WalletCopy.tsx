import { useState } from 'react'
import { Copy } from 'lucide-react'

interface WalletCopyProps {
  address: string
  className?: string
}

const truncate = (addr: string) =>
  addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr

const WalletCopy = ({ address, className = '' }: WalletCopyProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          handleCopy()
        }}
        className="group flex items-center gap-1.5 font-mono text-sm text-gray-700 hover:text-gray-900"
        title="Copy address"
      >
        <span>{truncate(address)}</span>
        <Copy className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
      </button>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap">
          Copied
        </span>
      )}
    </span>
  )
}

export default WalletCopy
