const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  suspended: { bg: 'bg-gray-100', text: 'text-gray-800' },
  active: { bg: 'bg-blue-100', text: 'text-blue-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  paused: { bg: 'bg-gray-100', text: 'text-gray-800' },
  flagged: { bg: 'bg-red-100', text: 'text-red-800' },
}

const getStatusStyle = (status: string) => {
  const key = String(status).toLowerCase()
  return statusStyles[key] ?? { bg: 'bg-gray-100', text: 'text-gray-800' }
}

interface StatusBadgeProps {
  status: string
  className?: string
}

const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  const { bg, text } = getStatusStyle(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${bg} ${text} ${className}`}
    >
      {status}
    </span>
  )
}

export default StatusBadge
