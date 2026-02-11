import type { ReactNode } from 'react'

export interface CardColumn<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
}

interface ManagementCardListProps<T> {
  columns: CardColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  skeletonCount?: number
  renderRowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
}

function ManagementCardList<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  skeletonCount = 4,
  renderRowActions,
  onRowClick,
}: ManagementCardListProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-8 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={getRowId(row)}
          className={`rounded-xl border border-gray-200 bg-white p-4 ${
            onRowClick ? 'cursor-pointer hover:bg-gray-50/50' : ''
          }`}
          onClick={() => onRowClick?.(row)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              {columns.map((col) => (
                <div key={col.key}>
                  <p className="text-xs font-medium text-gray-500">{col.label}</p>
                  <div className="mt-0.5 text-sm text-gray-900">
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] as ReactNode}
                  </div>
                </div>
              ))}
            </div>
            {renderRowActions && (
              <div onClick={(e) => e.stopPropagation()}>
                {renderRowActions(row)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ManagementCardList
