import Skeleton from './Skeleton'

const MetricCardSkeleton = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
    </div>
  </div>
)

export default MetricCardSkeleton
