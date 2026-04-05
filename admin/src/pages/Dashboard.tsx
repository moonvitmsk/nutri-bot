import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users, UserCheck, MessageSquare, Camera, RefreshCw,
  Send, Trash2, Zap, Clock, UserPlus, AlertCircle, Radio,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import Chart from '../components/Chart'
import EmptyState from '../components/EmptyState'

interface HealthData {
  status: string
  version?: string
  checks?: Record<string, any>
  stats?: Record<string, number>
}

interface KPI {
  totalUsers: number
  dau: number
  messagesToday: number
  photosToday: number
  totalUsersYesterday: number
  dauYesterday: number
  messagesTodayYesterday: number
  photosTodayYesterday: number
}

interface ActivityDay {
  date: string
  users: number
  messages: number
}

interface IntentData {
  name: string
  count: number
}

interface EventEntry {
  id: string
  time: string
  type: 'user' | 'photo' | 'error' | 'broadcast'
  description: string
}

const BOT_URL = import.meta.env.VITE_BOT_URL || 'https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app'
const CRON_SECRET = import.meta.env.VITE_CRON_SECRET || ''

function calcTrend(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [botStatus, setBotStatus] = useState<'online' | 'error' | 'checking'>('checking')
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [intents, setIntents] = useState<IntentData[]>([])
  const [events, setEvents] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)

  const checkHealth = useCallback(async () => {
    setBotStatus('checking')
    try {
      const res = await fetch(`${BOT_URL}/api/health`)
      const data: HealthData = await res.json()
      setHealth(data)
      setBotStatus(data.status === 'ok' ? 'online' : 'error')
    } catch {
      setBotStatus('error')
    }
  }, [])

  const loadKPI = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const yesterdayEnd = today

    const [totalRes, dauRes, msgRes, photoRes, totalYRes, dauYRes, msgYRes, photoYRes] = await Promise.all([
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).gte('updated_at', today),
      supabase.from('nutri_messages').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('nutri_food_logs').select('*', { count: 'exact', head: true }).gte('created_at', today),
      // Yesterday
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).lt('created_at', today),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).gte('updated_at', yesterday).lt('updated_at', yesterdayEnd),
      supabase.from('nutri_messages').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', yesterdayEnd),
      supabase.from('nutri_food_logs').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', yesterdayEnd),
    ])

    setKpi({
      totalUsers: totalRes.count ?? 0,
      dau: dauRes.count ?? 0,
      messagesToday: msgRes.count ?? 0,
      photosToday: photoRes.count ?? 0,
      totalUsersYesterday: totalYRes.count ?? 0,
      dauYesterday: dauYRes.count ?? 0,
      messagesTodayYesterday: msgYRes.count ?? 0,
      photosTodayYesterday: photoYRes.count ?? 0,
    })
  }, [])

  const loadActivity = useCallback(async () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const [usersRes, msgsRes] = await Promise.all([
      supabase.from('nutri_users').select('updated_at').gte('updated_at', since),
      supabase.from('nutri_messages').select('created_at').gte('created_at', since).eq('role', 'user'),
    ])

    const dayMap = new Map<string, { users: Set<string>; messages: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dayMap.set(d, { users: new Set(), messages: 0 })
    }

    for (const r of (usersRes.data || []) as any[]) {
      const day = r.updated_at?.slice(0, 10)
      if (day && dayMap.has(day)) dayMap.get(day)!.users.add(r.updated_at)
    }
    for (const r of (msgsRes.data || []) as any[]) {
      const day = r.created_at?.slice(0, 10)
      if (day && dayMap.has(day)) dayMap.get(day)!.messages++
    }

    setActivity([...dayMap.entries()].map(([date, v]) => ({
      date: date.slice(5),
      users: v.users.size,
      messages: v.messages,
    })))
  }, [])

  const loadIntents = useCallback(async () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data } = await supabase
      .from('nutri_messages')
      .select('content')
      .eq('role', 'user')
      .gte('created_at', since)
      .limit(500)

    const topics = ['витамин', 'белок', 'калори', 'похуд', 'набрать', 'сон', 'энерги',
      'железо', 'анализ', 'завтрак', 'ужин', 'обед', 'перекус', 'вода', 'спорт']
    const counts: Record<string, number> = {}
    for (const row of (data || []) as any[]) {
      const msg = (row.content || '').toLowerCase()
      for (const t of topics) {
        if (msg.includes(t)) counts[t] = (counts[t] || 0) + 1
      }
    }
    setIntents(
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }))
    )
  }, [])

  const loadEvents = useCallback(async () => {
    const [newUsers, recentMsgs, errors] = await Promise.all([
      supabase.from('nutri_users').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('nutri_food_logs').select('id, description, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('nutri_error_log').select('id, message, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    const items: EventEntry[] = []
    for (const u of (newUsers.data || []) as any[]) {
      items.push({ id: `u-${u.id}`, time: u.created_at, type: 'user', description: `Новый пользователь: ${u.name || 'без имени'}` })
    }
    for (const f of (recentMsgs.data || []) as any[]) {
      items.push({ id: `f-${f.id}`, time: f.created_at, type: 'photo', description: `Фото: ${f.description || 'еда'}` })
    }
    for (const e of (errors.data || []) as any[]) {
      items.push({ id: `e-${e.id}`, time: e.created_at, type: 'error', description: e.message })
    }

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setEvents(items.slice(0, 20))
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([checkHealth(), loadKPI(), loadActivity(), loadIntents(), loadEvents()])
      setLoading(false)
    }
    init()

    const healthInterval = setInterval(checkHealth, 30000)
    const eventsInterval = setInterval(loadEvents, 60000)
    return () => { clearInterval(healthInterval); clearInterval(eventsInterval) }
  }, [checkHealth, loadKPI, loadActivity, loadIntents, loadEvents])

  const EVENT_ICONS: Record<string, React.ReactNode> = {
    user: <UserPlus className="w-4 h-4 text-blue-500" />,
    photo: <Camera className="w-4 h-4 text-emerald-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    broadcast: <Radio className="w-4 h-4 text-violet-500" />,
  }

  return (
    <div className="space-y-6">
      {/* Section 1: System Status */}
      <div className="gradient-border p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Бот:</span>
            <StatusBadge status={botStatus} />
          </div>
          {health && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Supabase:</span>
                <StatusBadge status={health.checks?.supabase?.status === 'ok' ? 'online' : 'error'} />
                {health.checks?.supabase?.latency_ms != null && (
                  <span className="text-xs text-gray-400">{health.checks.supabase.latency_ms}ms</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">OpenAI:</span>
                <StatusBadge status={health.checks?.openai_key?.status === 'ok' ? 'online' : 'error'} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">MAX:</span>
                <StatusBadge status={health.checks?.max_token?.status === 'ok' ? 'online' : 'error'} />
              </div>
            </>
          )}
          {health?.version && (
            <span className="text-xs text-gray-400 ml-auto">v{health.version}</span>
          )}
          <button
            onClick={checkHealth}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${botStatus === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Section 2: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Всего пользователей"
          value={kpi?.totalUsers ?? 0}
          trend={kpi ? calcTrend(kpi.totalUsers, kpi.totalUsersYesterday) : null}
          loading={loading}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={UserCheck}
          label="DAU"
          value={kpi?.dau ?? 0}
          trend={kpi ? calcTrend(kpi.dau, kpi.dauYesterday) : null}
          loading={loading}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={MessageSquare}
          label="Сообщений сегодня"
          value={kpi?.messagesToday ?? 0}
          trend={kpi ? calcTrend(kpi.messagesToday, kpi.messagesTodayYesterday) : null}
          loading={loading}
          gradient="from-indigo-500 to-blue-600"
        />
        <StatCard
          icon={Camera}
          label="Фото сегодня"
          value={kpi?.photosToday ?? 0}
          trend={kpi ? calcTrend(kpi.photosToday, kpi.photosTodayYesterday) : null}
          loading={loading}
          gradient="from-orange-500 to-red-500"
        />
      </div>

      {/* Section 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-border p-6">
          {activity.length > 0 ? (
            <Chart
              type="line"
              title="Активность за 7 дней"
              data={activity}
              dualAxis
              lines={[
                { dataKey: 'users', name: 'DAU', color: '#10b981', yAxisId: 'left' },
                { dataKey: 'messages', name: 'Сообщений', color: '#6366f1', yAxisId: 'right' },
              ]}
            />
          ) : (
            <EmptyState title="Нет данных активности" />
          )}
        </div>
        <div className="gradient-border p-6">
          {intents.length > 0 ? (
            <Chart
              type="pie"
              title="Топ темы (7 дней)"
              data={intents}
              dataKey="count"
              nameKey="name"
            />
          ) : (
            <EmptyState title="Нет данных по темам" />
          )}
        </div>
      </div>

      {/* Section 4: Recent Events */}
      <div className="gradient-border p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" />
          Последние события
        </h2>
        {events.length === 0 ? (
          <EmptyState title="Нет событий" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                {EVENT_ICONS[e.type]}
                <span className="text-sm text-gray-700 flex-1 truncate">{e.description}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(e.time).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Quick Actions */}
      <div className="gradient-border p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Быстрые действия
        </h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton
            icon={<Send className="w-4 h-4" />}
            label="Тестовое сообщение"
            onClick={async () => {
              try {
                await fetch(`${BOT_URL}/api/test`, {
                  headers: { Authorization: `Bearer ${CRON_SECRET}` },
                })
                alert('Тестовое сообщение отправлено')
              } catch { alert('Ошибка отправки') }
            }}
          />
          <ActionButton
            icon={<Radio className="w-4 h-4" />}
            label="Запустить рассылку"
            onClick={() => window.location.hash = '#/broadcasts'}
          />
          <ActionButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Очистить кеш"
            onClick={() => alert('Кеш очищен (заглушка)')}
          />
          <ActionButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Пересчитать стрики"
            onClick={() => alert('Стрики пересчитаны (заглушка)')}
          />
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-emerald-300 transition-all"
    >
      {icon} {label}
    </button>
  )
}
