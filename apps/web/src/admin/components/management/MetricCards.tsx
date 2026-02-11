import type { LucideIcon } from 'lucide-react'

interface Metric {
  label: string
  value: string | number
  icon?: LucideIcon
}

interface MetricCardsProps {
  metrics: Metric[]
  isLoading?: boolean
}

const MetricCards = ({ metrics, isLoading }: MetricCardsProps) => (
  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
    {metrics.map((m) => (
      <div
        key={m.label}
        className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm"
      >
        {isLoading ? (
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-8 w-16 rounded bg-gray-100 animate-pulse" />
            </div>
            {m.icon && (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 animate-pulse" />
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500">{m.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{m.value}</p>
            </div>
            {m.icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <m.icon className="h-5 w-5" />
              </div>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
)

export default MetricCards
