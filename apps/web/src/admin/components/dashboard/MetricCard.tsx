import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtext?: string
  trend?: string
  icon?: LucideIcon
  href?: string
}

const MetricCard = ({ title, value, subtext, trend, icon: Icon, href }: MetricCardProps) => {
  const content = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="mt-0.5 text-xs text-gray-500">{subtext}</p>}
          {trend && <p className="mt-2 text-xs text-gray-500">{trend}</p>}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : content
}

export default MetricCard
