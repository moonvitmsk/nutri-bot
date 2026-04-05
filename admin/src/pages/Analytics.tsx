import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, TrendingUp, Cpu, DollarSign } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface DauStats {
  date: string
  dau: number
  messages: number
}

interface AiStats {
  totalCalls: number
  avgLatency: number
  p50: number
  p95: number
  totalCost: number
  byModel: Record<string, { calls: number; avgMs: number; cost: number }>
}

interface DayStats {
  date: string
  calories: number
  logs: number
}

interface UserGrowth {
  date: string
  users: number
}

interface StreakDist {
  range: string
  count: number
}

interface CohortRow {
  week: string
  total: number
  d7: number
  d14: number
  d30: number
}

export default function Analytics() {
  const [caloriesTrend, setCaloriesTrend] = useState<DayStats[]>([])
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([])
  const [streakDist, setStreakDist] = useState<StreakDist[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [avgWater, setAvgWater] = useState<number>(0)
  const [dauStats, setDauStats] = useState<DauStats[]>([])
  const [aiStats, setAiStats] = useState<AiStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      await Promise.all([
        loadCaloriesTrend(), loadUserGrowth(), loadStreakDist(),
        loadWaterAvg(), loadRetentionCohorts(), loadDauStats(), loadAiStats(),
      ])
    } finally {
      setLoading(false)
    }
  }

  // E-4 / J-4: DAU + messages per day
  async function loadDauStats() {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const [usersRes, msgsRes] = await Promise.all([
      supabase.from('nutri_users').select('last_active_at').gte('last_active_at', since),
      supabase.from('nutri_messages').select('created_at').gte('created_at', since).eq('role', 'user'),
    ])

    const dauMap = new Map<string, Set<string>>()
    const msgMap = new Map<string, number>()

    for (const r of (usersRes.data || []) as any[]) {
      const day = r.last_active_at?.slice(0, 10)
      if (day) dauMap.set(day, (dauMap.get(day) || new Set()).add(r.last_active_at))
    }
    for (const r of (msgsRes.data || []) as any[]) {
      const day = r.created_at?.slice(0, 10)
      if (day) msgMap.set(day, (msgMap.get(day) || 0) + 1)
    }

    const result: DauStats[] = []
    const allDays = new Set([...dauMap.keys(), ...msgMap.keys()])
    for (const day of [...allDays].sort()) {
      result.push({
        date: day.slice(5),
        dau: dauMap.get(day)?.size || 0,
        messages: msgMap.get(day) || 0,
      })
    }
    setDauStats(result)
  }

  // J-3: AI metrics
  async function loadAiStats() {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data } = await supabase
      .from('nutri_ai_metrics')
      .select('model, operation, tokens_in, tokens_out, response_time_ms, cost_usd')
      .gte('created_at', since)

    if (!data?.length) { setAiStats(null); return }

    const totalCalls = data.length
    const avgLatency = Math.round(data.reduce((s: number, r: any) => s + r.response_time_ms, 0) / totalCalls)
    const totalCost = Math.round(data.reduce((s: number, r: any) => s + (r.cost_usd || 0), 0) * 10000) / 10000
    const sorted = data.map((r: any) => r.response_time_ms).sort((a: number, b: number) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0

    const byModel: Record<string, { calls: number; avgMs: number; cost: number }> = {}
    for (const row of data as any[]) {
      const m = byModel[row.model] || { calls: 0, avgMs: 0, cost: 0 }
      m.calls++
      m.avgMs += row.response_time_ms
      m.cost += row.cost_usd || 0
      byModel[row.model] = m
    }
    for (const m of Object.values(byModel)) {
      m.avgMs = Math.round(m.avgMs / m.calls)
      m.cost = Math.round(m.cost * 10000) / 10000
    }

    setAiStats({ totalCalls, avgLatency, p50, p95, totalCost, byModel })
  }

  async function loadCaloriesTrend() {
    const since = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data } = await supabase
      .from('nutri_food_logs')
      .select('calories, created_at')
      .eq('confirmed', true)
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const byDay = new Map<string, { total: number; count: number }>()
    for (const row of (data || []) as any[]) {
      const day = row.created_at.slice(0, 10)
      const prev = byDay.get(day) || { total: 0, count: 0 }
      byDay.set(day, { total: prev.total + (row.calories || 0), count: prev.count + 1 })
    }
    const result: DayStats[] = []
    for (const [date, v] of byDay.entries()) {
      result.push({ date: date.slice(5), calories: Math.round(v.total / v.count), logs: v.count })
    }
    setCaloriesTrend(result)
  }

  async function loadUserGrowth() {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data } = await supabase
      .from('nutri_users')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const byDay = new Map<string, number>()
    for (const row of (data || []) as any[]) {
      const day = row.created_at.slice(0, 10)
      byDay.set(day, (byDay.get(day) || 0) + 1)
    }
    const result: UserGrowth[] = []
    for (const [date, users] of byDay.entries()) {
      result.push({ date: date.slice(5), users })
    }
    setUserGrowth(result)
  }

  async function loadStreakDist() {
    const { data } = await supabase
      .from('nutri_users')
      .select('streak_days')

    const rows = (data || []) as any[]
    const buckets: Record<string, number> = { '0': 0, '1-2': 0, '3-6': 0, '7-13': 0, '14-29': 0, '30+': 0 }
    for (const r of rows) {
      const s = r.streak_days || 0
      if (s === 0) buckets['0']++
      else if (s <= 2) buckets['1-2']++
      else if (s <= 6) buckets['3-6']++
      else if (s <= 13) buckets['7-13']++
      else if (s <= 29) buckets['14-29']++
      else buckets['30+']++
    }
    setStreakDist(Object.entries(buckets).map(([range, count]) => ({ range, count })))
  }

  // J-2: Retention cohort analysis — group users by signup week, measure activity at day 7/14/30
  async function loadRetentionCohorts() {
    const since = new Date(Date.now() - 8 * 7 * 86400000).toISOString()
    const [usersRes, msgsRes] = await Promise.all([
      supabase.from('nutri_users').select('id, created_at').gte('created_at', since),
      supabase.from('nutri_messages').select('user_id, created_at').gte('created_at', since).eq('role', 'user'),
    ])
    const users = (usersRes.data || []) as { id: string; created_at: string }[]
    const msgs = (msgsRes.data || []) as { user_id: string; created_at: string }[]

    // Build map: userId → sorted message timestamps
    const msgMap = new Map<string, number[]>()
    for (const m of msgs) {
      const t = new Date(m.created_at).getTime()
      const arr = msgMap.get(m.user_id) || []
      arr.push(t)
      msgMap.set(m.user_id, arr)
    }

    // Group users by ISO week (Mon–Sun)
    const cohortMap = new Map<string, { users: { id: string; created_at: string }[]; label: string }>()
    for (const u of users) {
      const d = new Date(u.created_at)
      const mon = new Date(d)
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const key = mon.toISOString().slice(0, 10)
      const label = mon.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      const entry = cohortMap.get(key) || { users: [], label }
      entry.users.push(u)
      cohortMap.set(key, entry)
    }

    const result: CohortRow[] = []
    for (const [, { users: cohortUsers, label }] of cohortMap.entries()) {
      const total = cohortUsers.length
      let d7 = 0, d14 = 0, d30 = 0
      for (const u of cohortUsers) {
        const signup = new Date(u.created_at).getTime()
        const userMsgs = msgMap.get(u.id) || []
        if (userMsgs.some(t => t >= signup + 6 * 86400000 && t <= signup + 14 * 86400000)) d7++
        if (userMsgs.some(t => t >= signup + 13 * 86400000 && t <= signup + 21 * 86400000)) d14++
        if (userMsgs.some(t => t >= signup + 29 * 86400000 && t <= signup + 37 * 86400000)) d30++
      }
      result.push({ week: label, total, d7, d14, d30 })
    }
    result.sort((a, b) => a.week.localeCompare(b.week))
    setCohorts(result)
  }

  async function loadWaterAvg() {
    const { data } = await supabase
      .from('nutri_users')
      .select('water_glasses')
      .gt('water_glasses', 0)
    const rows = (data || []) as any[]
    if (!rows.length) { setAvgWater(0); return }
    const avg = rows.reduce((s: number, r: any) => s + (r.water_glasses || 0), 0) / rows.length
    setAvgWater(Math.round(avg * 10) / 10)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="gradient-border p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Среднее воды (стаканы)</p>
          <p className="text-3xl font-bold text-cyan-600">{avgWater}</p>
          <p className="text-xs text-gray-400 mt-1">среди активных пользователей</p>
        </div>
        <div className="gradient-border p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Записей еды за 14 дней</p>
          <p className="text-3xl font-bold text-emerald-600">
            {caloriesTrend.reduce((s, d) => s + d.logs, 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">подтверждённых</p>
        </div>
      </div>

      {/* E-4/J-4: DAU + Messages per day */}
      {dauStats.length > 0 && (
        <div className="gradient-border p-6">
          <h2 className="text-base font-semibold mb-4 text-gray-800">DAU и сообщения (30 дней)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dauStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="dau" name="DAU" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="messages" name="Сообщений" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* J-3: AI Metrics */}
      {aiStats && (
        <div className="gradient-border p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            AI метрики (7 дней)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Вызовов</p>
              <p className="text-xl font-bold text-gray-800">{aiStats.totalCalls}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Avg latency</p>
              <p className="text-xl font-bold text-blue-600">{aiStats.avgLatency}ms</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">p50 / p95</p>
              <p className="text-xl font-bold text-amber-600">{aiStats.p50} / {aiStats.p95}ms</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />Стоимость</p>
              <p className="text-xl font-bold text-emerald-600">${aiStats.totalCost}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-400">Модель</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400">Вызовов</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400">Avg ms</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-400">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(aiStats.byModel).map(([model, stats]) => (
                  <tr key={model} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-700">{model}</td>
                    <td className="py-2 text-right text-gray-500">{stats.calls}</td>
                    <td className="py-2 text-right text-gray-500">{stats.avgMs}ms</td>
                    <td className="py-2 text-right text-emerald-600">${stats.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calories trend */}
      <div className="gradient-border p-6">
        <h2 className="text-base font-semibold mb-4 text-gray-800">Средние калории / день (14 дней)</h2>
        {caloriesTrend.length === 0 ? (
          <p className="text-gray-400 text-sm">Нет данных</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={caloriesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} ккал`, 'Среднее']} />
              <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* User growth */}
      <div className="gradient-border p-6">
        <h2 className="text-base font-semibold mb-4 text-gray-800">Новые пользователи (30 дней)</h2>
        {userGrowth.length === 0 ? (
          <p className="text-gray-400 text-sm">Нет данных</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}`, 'Новых']} />
              <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* J-2: Retention cohorts */}
      {cohorts.length > 0 && (
        <div className="gradient-border p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-500" />
            Когортный анализ (retention по неделям)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Неделя</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Новых</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600 uppercase">Day 7</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-blue-600 uppercase">Day 14</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-violet-600 uppercase">Day 30</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => {
                  const pct7 = c.total ? Math.round((c.d7 / c.total) * 100) : 0
                  const pct14 = c.total ? Math.round((c.d14 / c.total) * 100) : 0
                  const pct30 = c.total ? Math.round((c.d30 / c.total) * 100) : 0
                  return (
                    <tr key={c.week} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-gray-700">{c.week}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">{c.total}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-semibold ${pct7 >= 30 ? 'text-emerald-600' : pct7 >= 15 ? 'text-amber-500' : 'text-red-400'}`}>
                          {pct7}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-semibold ${pct14 >= 20 ? 'text-blue-600' : pct14 >= 10 ? 'text-amber-500' : 'text-red-400'}`}>
                          {pct14}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-semibold ${pct30 >= 15 ? 'text-violet-600' : pct30 >= 8 ? 'text-amber-500' : 'text-red-400'}`}>
                          {pct30}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">% пользователей, активных в соответствующий период после регистрации</p>
        </div>
      )}

      {/* Streak distribution */}
      <div className="gradient-border p-6">
        <h2 className="text-base font-semibold mb-4 text-gray-800">Распределение streak (дни подряд)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={streakDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}`, 'Пользователей']} />
            <Legend formatter={() => 'Пользователей'} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
