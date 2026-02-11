import { useEffect } from 'react'
import { X } from 'lucide-react'
import StatusBadge from './StatusBadge'

type ModalMode = 'donation' | 'ngo' | 'campaign' | 'transaction'

interface DetailModalProps {
  title: string
  data: Record<string, string | number | string[]>
  onClose: () => void
  mode: ModalMode
}

const DetailModal = ({ title, data, onClose, mode }: DetailModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const wallet = (data.donor || data.buyer || data.walletAddress || data.wallet || '') as string
  const formatWallet = (w: string) => w.length > 20 ? `${w.substring(0, 10)}...${w.substring(w.length - 8)}` : w

  const hashScanUrl = (data.transactionHash as string)
    ? `https://hashscan.io/testnet/transaction/${data.transactionHash}`
    : wallet ? `https://hashscan.io/testnet/account/${wallet}` : null

  const renderWalletBox = () => {
    if (!wallet) return null
    const label = mode === 'ngo' ? 'Wallet Address' : mode === 'donation' ? 'Donor' : mode === 'transaction' ? 'Buyer' : 'Wallet'
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
        <div className="flex items-center gap-2">
          <code className="text-sm text-blue-800 font-mono break-all md:break-normal">
            <span className="hidden md:inline">{wallet}</span>
            <span className="md:hidden">{formatWallet(wallet)}</span>
          </code>
          <button type="button" onClick={() => copyToClipboard(wallet)} className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
          >
            Copy
          </button>
        </div>
      </div>
    )
  }

  const renderGridField = (label: string, value: string | number | undefined, isStatus?: boolean) => (
    <div key={label}>
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      {isStatus ? (
        <StatusBadge status={String(value ?? '')} />
      ) : (
        <div className="text-black">{value ?? '—'}</div>
      )}
    </div>
  )

  const renderNgo = () => (
    <>
      {renderWalletBox()}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {renderGridField('Organization Name', data.ngoName as string)}
        {renderGridField('Email', data.email as string)}
        {renderGridField('Phone', data.phoneNumber as string)}
        {renderGridField('Registration Number', data.registrationNumber as string)}
        {renderGridField('Year Founded', data.yearFounded as string)}
        {renderGridField('Organization Type', data.organizationType as string)}
        {renderGridField('Website', data.website as string)}
        {renderGridField('Country', data.country as string)}
        {renderGridField('State/Region', data.stateRegion as string)}
        {renderGridField('Address', data.address as string)}
      </div>
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-600 mb-1">Focus Areas/Causes</div>
        <div className="text-black">{Array.isArray(data.focusAreas) ? (data.focusAreas as string[]).join(', ') : (data.focusAreas as string) ?? '—'}</div>
      </div>
      <div className="space-y-3 mb-6">
        <div className="text-sm font-medium text-gray-700 mb-3">Application Documents</div>
        {(data.logoHash as string) && (
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="text-sm text-gray-700">Logo</span>
            <a href={`https://gateway.pinata.cloud/ipfs/${data.logoHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
          </div>
        )}
        {(data.registrationCertHash as string) && (
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="text-sm text-gray-700">Registration Certificate</span>
            <a href={`https://gateway.pinata.cloud/ipfs/${data.registrationCertHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
          </div>
        )}
        {(data.annualReportHash as string) && (
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="text-sm text-gray-700">Annual Report</span>
            <a href={`https://gateway.pinata.cloud/ipfs/${data.annualReportHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
          </div>
        )}
        {(data.metadataHash as string) && (
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="text-sm text-gray-700">Complete Metadata</span>
            <a href={`https://gateway.pinata.cloud/ipfs/${data.metadataHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
          </div>
        )}
      </div>
    </>
  )

  const renderDonation = () => (
    <>
      {renderWalletBox()}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {renderGridField('ID', data.id as string)}
        {renderGridField('Amount', data.amount as string)}
        {renderGridField('Campaign', data.campaign as string)}
        {renderGridField('Time', data.time as string)}
        {renderGridField('Status', data.status as string, true)}
      </div>
    </>
  )

  const renderCampaign = () => (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-medium text-gray-600 mb-1">Title</div>
        <div className="text-black font-semibold">{data.title}</div>
      </div>
      {(data.description as string) && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-1">Description</div>
          <div className="text-black">{data.description}</div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderGridField('Goal', `HBAR ${data.goal}`)}
        {renderGridField('Raised', `HBAR ${data.amountRaised}`)}
        {renderGridField('NGO', (data.ngoName || data.ngo) as string)}
        {renderGridField('Created', data.created as string)}
        {renderGridField('Status', data.status as string, true)}
      </div>
    </div>
  )

  const renderTransaction = () => {
    const priceDisplay = data.amount ? `${data.amount} HBAR` : (data.price ? `${data.price} HBAR` : '-')
    return (
      <>
        {renderWalletBox()}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderGridField('ID', data.id as string)}
          {renderGridField('Design', (data.pieceName || data.design) as string)}
          {renderGridField('Campaign', data.campaign as string)}
          {renderGridField('Price', priceDisplay)}
          {renderGridField('Type', data.type as string)}
          {renderGridField('Time', data.time as string)}
          {renderGridField('Status', data.status as string, true)}
        </div>
      </>
    )
  }

  const renderContent = () => {
    switch (mode) {
      case 'ngo': return renderNgo()
      case 'donation': return renderDonation()
      case 'campaign': return renderCampaign()
      case 'transaction': return renderTransaction()
      default: return null
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 id="detail-drawer-title" className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 pb-16" onClick={(e) => e.stopPropagation()}>
          {renderContent()}

          {hashScanUrl && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <a href={hashScanUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                View on HashScan
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default DetailModal
