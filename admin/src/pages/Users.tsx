import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DataTable, { type Column } from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import { X, Crown, Send, Trash2, Loader2 } from 'lucide-react'

interface User {
  id: string
  max_user_id: number | null
  name: string | null
  age: number | null
  sex: string | null
  phone: string | null
  subscription_type: string | null
  onboarding_completed: boolean | null
  messages_today: number | null
  photos_today: number | null
  streak_days: number | null
  free_analyses_used: number | null
  referral_code: string | null
  referred_by: string | null
  created_at: string
  updated_at: string | null
  last_active_at: string | null
}

interface Message {
  id: string
  role: string
  content: string
  created_at: string
}

interface FoodLog {
  id: string
  description: string | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  created_at: string
}

type ActivityFilter = 'all' | 'active_7d' | 'inactive'

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [subFilter, setSubFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [selected, setSelected] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
  const [detailTab, setDetailTab] = useState<'messages' | 'food' | 'profile'>('profile')
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [premiumDays, setPremiumDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('nutri_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (subFilter !== 'all') query = query.eq('subscription_type', subFilter)

    if (activityFilter === 'active_7d') {
      const week = new Date(Date.now() - 7 * 86400000).toISOString()
      query = query.gte('updated_at', week)
    } else if (activityFilter === 'inactive') {
      const week = new Date(Date.now() - 7 * 86400000).toISOString()
      query = query.lt('updated_at', week)
    }

    const { data } = await query
    setUsers((data as User[]) ?? [])
    setLoading(false)
  }, [subFilter, activityFilter])

  useEffect(() => { load() }, [load])

  async function openDetail(user: User) {
    setSelected(user)
    setDetailTab('profile')
    setDetailLoading(true)
    const [msgRes, foodRes] = await Promise.all([
      supabase.from('nutri_messages').select('id, role, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('nutri_food_logs').select('id, description, calories, protein, fat, carbs, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])
    setMessages((msgRes.data as Message[]) ?? [])
    setFoodLogs((foodRes.data as FoodLog[]) ?? [])
    setDetailLoading(false)
  }

  async function grantPremium() {
    if (!selected) return
    const expiresAt = new Date(Date.now() + premiumDays * 86400000).toISOString()
    await supabase.from('nutri_users').update({
      subscription_type: 'premium',
      trial_started_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setSelected({ ...selected, subscription_type: 'premium' })
    load()
  }

  async function deleteUser() {
    if (!selected) return
    await supabase.from('nutri_users').delete().eq('id', selected.id)
    setSelected(null)
    setConfirmDelete(false)
    load()
  }

  function maskPhone(phone: string | null): string {
    if (!phone) return '—'
    if (phone.length < 6) return phone
    return phone.slice(0, 3) + '***' + phone.slice(-2)
  }

  const columns: Column<User>[] = [
    {
      key: 'max_user_id',
      header: 'ID',
      render: (r) => <span className="font-mono text-xs text-gray-500">{r.max_user_id ?? r.id.slice(0, 8)}</span>,
    },
    {
      key: 'name',
      header: 'Имя',
      render: (r) => <span className="font-medium">{r.name || '(без имени)'}</span>,
    },
    {
      key: 'phone',
      header: 'Телефон',
      render: (r) => <span className="text-xs text-gray-500">{maskPhone(r.phone)}</span>,
    },
    {
      key: 'subscription_type',
      header: 'Статус',
      render: (r) => <SubBadge type={r.subscription_type} />,
    },
    {
      key: 'created_at',
      header: 'Регистрация',
      render: (r) => new Date(r.created_at).toLocaleDateString('ru-RU'),
    },
    {
      key: 'last_active_at',
      header: 'Последняя активность',
      render: (r) => r.last_active_at ? new Date(r.last_active_at).toLocaleDateString('ru-RU') : '—',
    },
    {
      key: 'streak_days',
      header: 'Стрик',
      render: (r) => <span>{r.streak_days ?? 0}</span>,
    },
    {
      key: 'photos_today',
      header: 'Фото',
      render: (r) => <span>{r.photos_today ?? 0}</span>,
    },
  ]

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        >
          <option value="all">Все тарифы</option>
          <option value="free">Free</option>
          <option value="trial">Trial</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        >
          <option value="all">Все</option>
          <option value="active_7d">Активные за 7д</option>
          <option value="inactive">Неактивные</option>
        </select>
        <span className="text-sm text-gray-400 self-center">{users.length} пользователей</span>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        onRowClick={openDetail}
        searchable
        searchPlaceholder="Поиск по имени..."
        exportable
        exportFileName="users"
      />

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">{selected.name || '(без имени)'}</h2>
                <p className="text-sm text-gray-500">
                  {selected.sex ?? '?'}, возраст {selected.age ?? '?'} &middot; <SubBadge type={selected.subscription_type} />
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5">
              {(['profile', 'messages', 'food'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    detailTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'profile' ? 'Профиль' : tab === 'messages' ? `Сообщения (${messages.length})` : `Еда (${foodLogs.length})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />Загрузка...
                </div>
              ) : detailTab === 'profile' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ProfileField label="ID" value={String(selected.max_user_id ?? selected.id.slice(0, 8))} />
                    <ProfileField label="Телефон" value={selected.phone || '—'} />
                    <ProfileField label="Тариф" value={selected.subscription_type || 'free'} />
                    <ProfileField label="Онбординг" value={selected.onboarding_completed ? 'Завершён' : 'Не завершён'} />
                    <ProfileField label="Стрик" value={`${selected.streak_days ?? 0} дней`} />
                    <ProfileField label="Бесплатных анализов" value={`${selected.free_analyses_used ?? 0} / 10`} />
                    <ProfileField label="Реферал" value={selected.referral_code || '—'} />
                    <ProfileField label="Привёл" value={selected.referred_by || '—'} />
                    <ProfileField label="Регистрация" value={new Date(selected.created_at).toLocaleString('ru-RU')} />
                    <ProfileField label="Последняя активность" value={selected.last_active_at ? new Date(selected.last_active_at).toLocaleString('ru-RU') : '—'} />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">Дать Premium на</span>
                      <input
                        type="number"
                        value={premiumDays}
                        onChange={(e) => setPremiumDays(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                        min={1}
                      />
                      <span className="text-sm text-gray-500">дней</span>
                      <button onClick={grantPremium} className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                        Активировать
                      </button>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" /> Удалить пользователя
                    </button>
                  </div>
                </div>
              ) : detailTab === 'messages' ? (
                messages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Нет сообщений</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div key={m.id} className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                        <p className="text-xs text-gray-400 mb-1">{m.role} &middot; {new Date(m.created_at).toLocaleString('ru-RU')}</p>
                        <p className="whitespace-pre-wrap break-words">{m.content?.slice(0, 500)}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : foodLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Нет записей</p>
              ) : (
                <div className="space-y-2">
                  {foodLogs.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg bg-gray-50 text-sm">
                      <p className="font-medium">{f.description || '(без описания)'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {f.calories ?? 0} ккал &middot; Б{f.protein ?? 0} Ж{f.fat ?? 0} У{f.carbs ?? 0}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(f.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Удаление пользователя"
        message={`Удалить пользователя ${selected?.name || 'без имени'}? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        onConfirm={deleteUser}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  )
}

function SubBadge({ type }: { type: string | null }) {
  const colors: Record<string, string> = {
    premium: 'bg-purple-100 text-purple-700',
    trial: 'bg-amber-100 text-amber-700',
    free: 'bg-gray-100 text-gray-600',
  }
  const t = type ?? 'free'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[t] ?? colors.free}`}>
      {t}
    </span>
  )
}
