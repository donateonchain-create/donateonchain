import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  status?: FilterOption[]
  country?: FilterOption[]
  sort?: FilterOption[]
}

interface FiltersBarProps {
  filters: FilterConfig
  searchPlaceholder?: string
  onSearch?: (q: string) => void
  onStatusChange?: (v: string) => void
  onSortChange?: (v: string) => void
  onClear?: () => void
  isLoading?: boolean
}

const FiltersBar = ({
  filters,
  searchPlaceholder = 'Search...',
  onSearch,
  onStatusChange,
  onSortChange,
  onClear,
  isLoading,
}: FiltersBarProps) => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearch(v)
    onSearch?.(v)
  }

  const hasFilters = status || sort || search

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearch}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            aria-label="Search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.status && filters.status.length > 0 && (
            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value
                setStatus(v)
                onStatusChange?.(v)
              }}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              {filters.status.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {filters.sort && filters.sort.length > 0 && (
            <select
              value={sort}
              onChange={(e) => {
                const v = e.target.value
                setSort(v)
                onSortChange?.(v)
              }}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              aria-label="Sort by"
            >
              <option value="">Sort by</option>
              {filters.sort.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatus('')
                setSort('')
                onClear?.()
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Clear filters"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
