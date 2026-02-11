import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import StatusBadge from './StatusBadge'

interface Column {
  key: string
  label: string
  className?: string
  badge?: boolean
}

interface RecentTableProps {
  title: string
  viewAllHref: string
  columns: Column[]
  rows: Record<string, unknown>[]
  emptyMessage?: string
  actionLabel?: string
  onViewRow?: (row: Record<string, unknown>) => void
}

const RecentTable = ({ title, viewAllHref, columns, rows, emptyMessage = 'No data yet', actionLabel = 'View', onViewRow }: RecentTableProps) => (
  <div className="rounded-xl border border-gray-200 bg-white">
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <Link
        to={viewAllHref}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black"
      >
        View all
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
    <div className="overflow-x-auto">
      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-gray-500">{emptyMessage}</div>
      ) : (
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${col.className ?? ''}`}>
                  {col.label}
                </th>
              ))}
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-gray-900 ${col.className ?? ''}`}>
                    {col.badge ? (
                      <StatusBadge status={String(row[col.key] ?? '')} />
                    ) : (
                      (row[col.key] as string | number) ?? ''
                    )}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {onViewRow ? (
                    <button
                      type="button"
                      onClick={() => onViewRow(row)}
                      className="text-sm font-medium text-black hover:underline"
                    >
                      {actionLabel}
                    </button>
                  ) : (
                    <Link
                      to={viewAllHref}
                      className="text-sm font-medium text-black hover:underline"
                    >
                      {actionLabel}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
)

export default RecentTable
