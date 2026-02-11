import Skeleton from './Skeleton'

interface RecentTableSkeletonProps {
  columns?: number
  rows?: number
}

const RecentTableSkeleton = ({ columns = 4, rows = 5 }: RecentTableSkeletonProps) => (
  <div className="rounded-xl border border-gray-200 bg-white">
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[400px]">
        <thead>
          <tr className="border-b border-gray-100">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
            <th className="w-24 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  {j === columns - 1 ? (
                    <Skeleton className="h-6 w-16 rounded-full" />
                  ) : (
                    <Skeleton className="h-4 w-full max-w-24" />
                  )}
                </td>
              ))}
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-12" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default RecentTableSkeleton
