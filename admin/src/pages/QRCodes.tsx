import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DataTable, { type Column } from '../components/DataTable'
import { Download, Plus, Loader2 } from 'lucide-react'

interface QRCode {
  id: string
  code: string
  sku: string | null
  activated_by: string | null
  activated_at: string | null
  batch_id: string | null
  created_at: string
}

function randomCode(sku: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `MV-${sku}-${code}`
}

export default function QRCodes() {
  const [codes, setCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(10)
  const [sku, setSku] = useState('OMEGA3')
  const [filter, setFilter] = useState<'all' | 'available' | 'activated'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('nutri_qr_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (filter === 'available') query = query.is('activated_by', null)
    if (filter === 'activated') query = query.not('activated_by', 'is', null)

    const { data } = await query
    setCodes((data as QRCode[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function generate() {
    if (count < 1 || count > 1000 || !sku.trim()) return
    setGenerating(true)

    const batchId = `batch-${Date.now()}`
    const rows = Array.from({ length: count }, () => ({
      code: randomCode(sku.trim().toUpperCase()),
      sku: sku.trim().toUpperCase(),
      batch_id: batchId,
    }))

    const { error } = await supabase.from('nutri_qr_codes').insert(rows)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      load()
    }
    setGenerating(false)
  }

  function exportCSV() {
    const header = 'code,sku,status,activated_by,activated_at,created_at\n'
    const rows = codes
      .map(
        (c) =>
          `${c.code},${c.sku ?? ''},${c.activated_by ? 'activated' : 'available'},${c.activated_by ?? ''},${c.activated_at ?? ''},${c.created_at}`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-codes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: Column<QRCode>[] = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'sku', header: 'SKU' },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.activated_by ? (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">Activated</span>
        ) : (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Available</span>
        ),
    },
    { key: 'batch_id', header: 'Batch', render: (r) => <span className="text-xs text-gray-400">{r.batch_id ?? '—'}</span> },
    {
      key: 'created_at',
      header: 'Created',
      render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
  ]

  return (
    <div>
      {/* Generate section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Generate QR Codes</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Count</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. OMEGA3"
              className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        >
          <option value="all">All codes</option>
          <option value="available">Available</option>
          <option value="activated">Activated</option>
        </select>
        <span className="text-sm text-gray-500">{codes.length} codes</span>
        <button
          onClick={exportCSV}
          className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <DataTable columns={columns} data={codes} loading={loading} />
    </div>
  )
}
