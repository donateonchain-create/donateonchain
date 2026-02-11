import type { ReactNode } from 'react'
import TableRowSkeleton from './TableRowSkeleton'
import ManagementCardList from './ManagementCardList'
import type { CardColumn } from './ManagementCardList'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface ManagementTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  skeletonRows?: number
  renderRowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
}

function ManagementTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  skeletonRows = 8,
  renderRowActions,
  onRowClick,
}: ManagementTableProps<T>) {
  const cardColumns: CardColumn<T>[] = columns.map((c) => ({
    key: c.key,
    label: c.header,
    render: c.render,
  }))

  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
              {renderRowActions && (
                <th className="w-12 px-4 py-3 text-right" />
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length + (renderRowActions ? 1 : 0)} />
              ))
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-900 ${col.className ?? ''}`}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderRowActions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
      <div className="md:hidden">
        <ManagementCardList<T>
          columns={cardColumns}
          rows={rows}
          getRowId={getRowId}
          isLoading={isLoading}
          skeletonCount={4}
          renderRowActions={renderRowActions}
          onRowClick={onRowClick}
        />
      </div>
    </>
  )
}

export default ManagementTable
