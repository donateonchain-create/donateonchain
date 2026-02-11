import { Users, Megaphone, Palette } from 'lucide-react'

interface EmptyStateProps {
  message: string
  cta?: { label: string; onClick: () => void }
  variant?: 'ngo' | 'campaign' | 'designer'
}

const iconMap = {
  ngo: Users,
  campaign: Megaphone,
  designer: Palette,
}

const EmptyState = ({ message, cta, variant = 'ngo' }: EmptyStateProps) => {
  const Icon = iconMap[variant]
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon className="h-8 w-8" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-4 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
