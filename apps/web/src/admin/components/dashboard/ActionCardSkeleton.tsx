import Skeleton from './Skeleton'

const ActionCardSkeleton = () => (
  <div className="rounded-xl border border-l-4 border-gray-200 border-l-gray-300 bg-gray-50/30 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-6 w-8 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  </div>
)

export default ActionCardSkeleton
