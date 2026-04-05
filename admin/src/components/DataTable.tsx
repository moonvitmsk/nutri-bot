import { type ReactNode, useState, useMemo } from 'react'
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Download, Search } from 'lucide-react'
import EmptyState from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  sortable?: boolean
  csvValue?: (row: T) => string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  onRowClick?: (row: T) => void
  emptyText?: string
  keyField?: string
  searchable?: boolean
  searchPlaceholder?: string
  exportable?: boolean
  exportFileName?: string
  pageSize?: number
}

type SortDir = 'asc' | 'desc' | null

export default function DataTable<T extends { [key: string]: any }>({
  columns,
  data,
  loading,
  onRowClick,
  emptyText = 'Нет данных',
  keyField = 'id',
  searchable = false,
  searchPlaceholder = 'Поиск...',
  exportable = false,
  exportFileName = 'export',
  pageSize: defaultPageSize,
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(defaultPageSize || 25)

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const s = search.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.render ? '' : String(row[col.key] ?? '')
        return val.toLowerCase().includes(s)
      })
    )
  }, [data, search, columns])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safeP = Math.min(page, totalPages - 1)
  const paginated = sorted.slice(safeP * perPage, (safeP + 1) * perPage)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc')
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function exportCSV() {
    const header = columns.map((c) => c.header).join(',')
    const rows = sorted.map((row) =>
      columns.map((col) => {
        const val = col.csvValue ? col.csvValue(row) : String(row[col.key] ?? '')
        return `"${val.replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Загрузка...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
              />
            </div>
          )}
          {exportable && (
            <button
              onClick={exportCSV}
              className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5 text-gray-600"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <EmptyState title={emptyText} description="" />
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && toggleSort(col.key)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none ${
                        col.sortable !== false ? 'cursor-pointer hover:text-gray-700' : ''
                      } ${col.className ?? ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {col.header}
                        {col.sortable !== false && (
                          sortKey === col.key
                            ? sortDir === 'asc'
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                            : <ChevronsUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr
                    key={String(row[keyField])}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-gray-50 last:border-0 transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-emerald-50/30' : ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : (String(row[col.key] ?? '—'))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Показано {safeP * perPage + 1}–{Math.min((safeP + 1) * perPage, sorted.length)} из {sorted.length}</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0) }}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / стр.</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, safeP - 1))}
                disabled={safeP === 0}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="px-3 py-1 text-xs">
                {safeP + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, safeP + 1))}
                disabled={safeP >= totalPages - 1}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
