import { AlertCircle, Users, Palette, ShieldCheck, Megaphone, MessageSquare, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const priorityStyles = {
  urgent: 'border-l-red-500 bg-red-50/50',
  attention: 'border-l-amber-500 bg-amber-50/50',
  neutral: 'border-l-gray-400 bg-gray-50',
}

const iconMap: Record<string, typeof Users> = {
  ngo: Users,
  designer: Palette,
  kyc: ShieldCheck,
  campaign: Megaphone,
  complaint: MessageSquare,
  transaction: AlertTriangle,
}

interface ActionCardProps {
  id: string
  type: string
  title: string
  description: string
  count: number
  priority: 'urgent' | 'attention' | 'neutral'
  cta: string
}

const ActionCard = ({ type, title, description, count, priority, cta }: ActionCardProps) => {
  const Icon = iconMap[type] ?? AlertCircle
  const basePath = type === 'ngo' ? '/admin/ngos' : type === 'designer' ? '/admin/designers' : type === 'kyc' ? '/admin/kyc-review' : type === 'complaint' ? '/admin/complaints' : type === 'campaign' ? '/admin/campaigns' : '/admin/dashboard'

  return (
    <div className={`rounded-xl border border-l-4 border-gray-200 p-4 ${priorityStyles[priority]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gray-200 px-2 text-xs font-medium text-gray-700">
            {count}
          </span>
          <Link
            to={basePath}
            className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ActionCard
