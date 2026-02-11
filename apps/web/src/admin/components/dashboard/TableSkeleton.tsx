const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-4 flex-1 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-8 w-16 rounded bg-gray-200" />
      </div>
    ))}
  </div>
)

export default TableSkeleton
