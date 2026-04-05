import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Loader2 } from 'lucide-react'

interface LogEntry {
  id: string
  user_id: string
  role: string
  content: string
  tokens_used: number | null
  created_at: string
  user_name?: string
}

const ROLE_OPTIONS = ['all', 'user', 'assistant', 'system']

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('nutri_messages')
      .select('id, user_id, role, content, tokens_used, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59')
    }

    const { data: messagesData } = await query

    const messages = (messagesData as LogEntry[]) ?? []

    // Fetch user names for the unique user_ids
    if (messages.length > 0) {
      const userIds = [...new Set(messages.map((m) => m.user_id))]
      const { data: usersData } = await supabase
        .from('nutri_users')
        .select('id, name')
        .in('id', userIds)

      const nameMap = new Map<string, string>()
      ;(usersData ?? []).forEach((u: { id: string; name: string | null }) => {
        if (u.name) nameMap.set(u.id, u.name)
      })

      messages.forEach((m) => {
        m.user_name = nameMap.get(m.user_id) ?? m.user_id.slice(0, 8)
      })
    }

    // Client-side search filter
    if (search.trim()) {
      const s = search.toLowerCase()
      setLogs(
        messages.filter(
          (m) =>
            m.content?.toLowerCase().includes(s) ||
            m.user_name?.toLowerCase().includes(s),
        ),
      )
    } else {
      setLogs(messages)
    }

    setLoading(false)
  }, [roleFilter, dateFrom, dateTo, search])

  useEffect(() => {
    load()
  }, [load])

  // Group by user_id to show threads
  const grouped = new Map<string, LogEntry[]>()
  logs.forEach((log) => {
    const group = grouped.get(log.user_id) ?? []
    group.push(log)
    grouped.set(log.user_id, group)
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search content or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r === 'all' ? 'All roles' : r}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No messages found</div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([userId, entries]) => (
            <div key={userId} className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className="font-semibold text-sm">{entries[0].user_name}</span>
                <span className="text-xs text-gray-400">({entries.length} messages)</span>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg text-sm ${
                      entry.role === 'user'
                        ? 'bg-blue-50 ml-8'
                        : entry.role === 'system'
                          ? 'bg-yellow-50'
                          : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <RoleBadge role={entry.role} />
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      {entry.tokens_used != null && (
                        <span className="text-xs text-gray-400">{entry.tokens_used} tok</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-gray-700">
                      {entry.content?.slice(0, 400)}
                      {(entry.content?.length ?? 0) > 400 && '...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
