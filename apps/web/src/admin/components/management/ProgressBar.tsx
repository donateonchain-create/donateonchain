interface ProgressBarProps {
  value: number
  max: number
  showLabel?: boolean
}

const getProgressColor = (pct: number) => {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 75) return 'bg-blue-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-gray-300'
}

const ProgressBar = ({ value, max, showLabel = true }: ProgressBarProps) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = getProgressColor(pct)

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
