interface TableRowSkeletonProps {
  columns: number
}

const TableRowSkeleton = ({ columns }: TableRowSkeletonProps) => (
  <tr className="border-b border-gray-50 last:border-0">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div
          className={`rounded bg-gray-100 animate-pulse ${
            i === 0 ? 'h-8 w-32' : i === columns - 1 ? 'h-8 w-24 ml-auto' : 'h-4 w-24'
          }`}
        />
      </td>
    ))}
  </tr>
)

export default TableRowSkeleton
