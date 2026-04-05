import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DataTable, { type Column } from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react'

interface ErrorEntry {
  id: string
  error_type: string
  message: string
  stack: string | null
  user_id: number | null
  context: Record<string, any>
  resolved: boolean
  created_at: string
}

interface LogEntry {
  id: string
  user_id: string
  role: string
  content: string
  tokens_used: number | null
  created_at: string
}

const ERROR_TYPES = ['all', 'webhook', 'ai', 'db', 'cron', 'auth', 'monitor']

export default function ErrorLogs() {
  const [tab, setTab] = useState<'errors' | 'logs'>('errors')
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [logLevel, setLogLevel] = useState('all')
  const [expandedStack, setExpandedStack] = useState<string | null>(null)
  const [logSearch, setLogSearch] = useState('')

  const loadErrors = useCallback(async () => {
    let query = supabase
      .from('nutri_error_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (typeFilter !== 'all') query = query.eq('error_type', typeFilter)

    const { data } = await query
    setErrors((data as ErrorEntry[]) ?? [])
  }, [typeFilter])

  const loadLogs = useCallback(async () => {
    let query = supabase
      .from('nutri_messages')
      .select('id, user_id, role, content, tokens_used, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (logLevel !== 'all') query = query.eq('role', logLevel)

    const { data } = await query
    setLogs((data as LogEntry[]) ?? [])
  }, [logLevel])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadErrors(), loadLogs()]).finally(() => setLoading(false))
  }, [loadErrors, loadLogs])

  async function resolveError(id: string) {
    await supabase.from('nutri_error_log').update({ resolved: true }).eq('id', id)
    setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
  }

  const errorColumns: Column<ErrorEntry>[] = [
    {
      key: 'created_at',
      header: 'Время',
      render: (r) => (
        <span className="text-xs text-gray-500">
          {new Date(r.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'error_type',
      header: 'Тип',
      render: (r) => <ErrorTypeBadge type={r.error_type} />,
    },
    {
      key: 'message',
      header: 'Сообщение',
      render: (r) => (
        <div>
          <p className="text-sm text-gray-700 truncate max-w-md">{r.message}</p>
          {r.stack && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedStack(expandedStack === r.id ? null : r.id) }}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mt-1"
            >
              {expandedStack === r.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Stack trace
            </button>
          )}
          {expandedStack === r.id && r.stack && (
            <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {r.stack}
            </pre>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      key: 'user_id',
      header: 'User ID',
      render: (r) => <span className="font-mono text-xs text-gray-500">{r.user_id ?? '—'}</span>,
    },
    {
      key: 'resolved',
      header: 'Статус',
      render: (r) => r.resolved ? (
        <span className="text-emerald-500 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); resolveError(r.id) }}
          className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 text-gray-500"
        >
          Resolve
        </button>
      ),
      sortable: false,
    },
  ]

  const filteredLogs = logSearch.trim()
    ? logs.filter(l => l.content?.toLowerCase().includes(logSearch.toLowerCase()))
    : logs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('errors')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'errors' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 inline mr-1" />
          Ошибки ({errors.filter(e => !e.resolved).length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Логи ({logs.length})
        </button>
      </div>

      {tab === 'errors' ? (
        <>
          <div className="flex flex-wrap gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
            >
              {ERROR_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'Все типы' : t}</option>
              ))}
            </select>
          </div>

          {errors.length === 0 ? (
            <EmptyState title="Нет ошибок" description="Всё работает" />
          ) : (
            <DataTable
              columns={errorColumns}
              data={errors}
              exportable
              exportFileName="errors"
            />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по содержимому..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">Все роли</option>
              <option value="user">user</option>
              <option value="assistant">assistant</option>
              <option value="system">system</option>
            </select>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState title="Нет логов" />
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((l) => (
                <div key={l.id} className={`p-3 rounded-lg text-sm ${
                  l.role === 'user' ? 'bg-blue-50' : l.role === 'system' ? 'bg-yellow-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <RoleBadge role={l.role} />
                    <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString('ru-RU')}</span>
                    {l.tokens_used != null && <span className="text-xs text-gray-400">{l.tokens_used} tok</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-gray-700">{l.content?.slice(0, 400)}{(l.content?.length ?? 0) > 400 && '...'}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ErrorTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    webhook: 'bg-blue-100 text-blue-700',
    ai: 'bg-violet-100 text-violet-700',
    db: 'bg-amber-100 text-amber-700',
    cron: 'bg-cyan-100 text-cyan-700',
    auth: 'bg-red-100 text-red-700',
    monitor: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    user: 'bg-blue-100 text-blue-700',
    assistant: 'bg-emerald-100 text-emerald-700',
    system: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}
