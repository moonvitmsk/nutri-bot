// Рассылки — ручные с таргетингом, картинкой и произвольным текстом
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Radio, Users, Send, Loader2, CheckCircle, Clock, Image, Target, FileText, ChevronDown } from 'lucide-react'

interface BroadcastLog {
  id: number
  topic: string
  content: string
  sent_count: number
  triggered_by: string
  created_at: string
}

type Audience = 'all' | 'active_week' | 'trial' | 'premium'

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string }[] = [
  { value: 'all', label: 'Все подписчики', desc: 'Все с завершённым онбордингом' },
  { value: 'active_week', label: 'Активные за неделю', desc: 'Писали боту за последние 7 дней' },
  { value: 'trial', label: 'Trial-пользователи', desc: 'Пробный период' },
  { value: 'premium', label: 'Premium-пользователи', desc: 'Оплаченная подписка' },
]

const TEMPLATES = [
  { label: 'Полезный факт о витамине D', text: 'Знаешь, что 80% россиян испытывают дефицит витамина D? Особенно зимой. Лосось, яйца и грибы — лучшие источники. А ещё — Moonvit Энергия и иммунитет с D3.\n\nОтправь фото еды — я посчитаю калории!' },
  { label: 'Мотивация к дневнику', text: 'Привет! Напоминаю: те, кто ведёт дневник питания, худеют на 50% эффективнее. Просто сфотографируй свой обед — я всё посчитаю за секунду.\n\nОтправь фото еды!' },
  { label: 'Новая функция: рецепты', text: 'Обновление! Теперь Moonvit подбирает персональные рецепты на основе твоих дефицитов и отправляет красивую инфографику. Нажми 🍳 Рецепты в меню!' },
  { label: 'Промо Moonvit', text: 'Moonvit — витамины нового поколения. 6 формул для здоровья, энергии и красоты. Сканируй QR-код под крышкой и получи 30 дней Premium в Moonvit!\n\nmoonvit.ru' },
]

const BOT_URL = import.meta.env.VITE_BOT_URL || ''
const CRON_SECRET = import.meta.env.VITE_CRON_SECRET || ''

export default function Broadcasts() {
  const [logs, setLogs] = useState<BroadcastLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [error, setError] = useState('')

  // Form
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [showTemplates, setShowTemplates] = useState(false)

  // Counts
  const [counts, setCounts] = useState<Record<Audience, number>>({ all: 0, active_week: 0, trial: 0, premium: 0 })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [logsRes, allRes, activeRes, trialRes, premiumRes] = await Promise.all([
      supabase.from('nutri_broadcast_log').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true).not('max_chat_id', 'is', null),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true).not('max_chat_id', 'is', null).gte('last_active_at', weekAgo),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).eq('subscription_type', 'trial').not('max_chat_id', 'is', null),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).eq('subscription_type', 'premium').not('max_chat_id', 'is', null),
    ])

    setLogs((logsRes.data || []) as BroadcastLog[])
    setCounts({
      all: allRes.count || 0,
      active_week: activeRes.count || 0,
      trial: trialRes.count || 0,
      premium: premiumRes.count || 0,
    })
    setLoading(false)
  }

  async function sendBroadcast() {
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('text', text.trim())
      params.set('audience', audience)
      if (imageUrl.trim()) params.set('image_url', imageUrl.trim())

      const res = await fetch(`${BOT_URL}/api/cron-broadcast?${params}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSentOk(true)
        setText('')
        setImageUrl('')
        setTimeout(() => setSentOk(false), 4000)
        setTimeout(loadData, 1500)
      } else {
        setError(data.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка сети')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats — audience cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {AUDIENCE_OPTIONS.map(a => (
          <button key={a.value} type="button" onClick={() => setAudience(a.value)}
            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              audience === a.value
                ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100'
                : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50'
            }`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{a.label}</p>
            <p className={`text-2xl font-bold mt-1 ${audience === a.value ? 'text-emerald-600' : 'text-gray-900'}`}>
              {counts[a.value].toLocaleString('ru-RU')}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="gradient-border p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-500" /> Новая рассылка
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-gray-400" /> Текст сообщения
                </label>
                <button onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Шаблоны <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showTemplates && (
                <div className="mb-3 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => { setText(t.text); setShowTemplates(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0">
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={6}
                placeholder="Напиши текст рассылки..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">{text.length} символов</p>
            </div>

            {/* Image URL */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                <Image className="w-4 h-4 text-gray-400" /> Картинка (необязательно)
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="text-xs text-gray-400 mt-1">Прямая ссылка на JPG/PNG/GIF. Будет приложена к сообщению.</p>
            </div>

            {/* Audience */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                <Target className="w-4 h-4 text-gray-400" /> Кому отправить
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map(a => (
                  <label key={a.value}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${audience === a.value ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="audience" value={a.value} checked={audience === a.value}
                      onChange={() => setAudience(a.value)} className="accent-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-gray-400">{counts[a.value]} чел.</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button onClick={sendBroadcast} disabled={sending || !text.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sentOk ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sending ? 'Отправка...' : sentOk ? `Отправлено ${counts[audience]} чел.!` : `Отправить → ${counts[audience]} чел.`}
            </button>
          </div>

          {/* Right: preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Превью</h3>
            <div className="bg-gradient-to-b from-sky-100 to-sky-50 rounded-2xl p-5 border border-sky-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Moonvit</p>
                  <p className="text-[10px] text-gray-400">рассылка</p>
                </div>
              </div>
              {imageUrl && (
                <div className="mb-2 rounded-lg overflow-hidden bg-gray-200 h-32 flex items-center justify-center">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
              <div className="bg-white rounded-xl p-3 text-sm text-gray-600 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {text || 'Текст сообщения...'}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                → {AUDIENCE_OPTIONS.find(a => a.value === audience)?.label} ({counts[audience]} чел.)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="gradient-border p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" /> История рассылок
        </h2>
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm">Рассылок ещё не было.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-gray-100 rounded-xl p-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{log.topic}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{log.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{log.sent_count} чел.</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      log.triggered_by === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {log.triggered_by}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
