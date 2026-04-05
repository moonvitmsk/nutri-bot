import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Plus, Trash2, GripVertical, Loader2, Check, Smartphone } from 'lucide-react'

interface MenuItem {
  text: string
  payload: string
}

const DEFAULT_MENU: MenuItem[] = [
  { text: '📸 Фото еды', payload: 'action_food' },
  { text: '🍽 Меню ресторана', payload: 'action_restaurant' },
  { text: '📊 Дневник', payload: 'action_today' },
  { text: '📈 Неделя', payload: 'action_week' },
  { text: '💧 Вода', payload: 'action_water' },
  { text: '💊 Витамины', payload: 'action_vitamins' },
  { text: '🍳 Рецепты', payload: 'action_recipes' },
  { text: '📋 План питан��я', payload: 'action_mealplan' },
  { text: '🔬 Deepcheck', payload: 'action_deep' },
  { text: '🧪 Анализ��', payload: 'action_lab' },
  { text: '👤 Профиль', payload: 'action_profile' },
  { text: '⚙️ Ещё', payload: 'action_more' },
]

const ALL_PAYLOADS: { value: string; label: string }[] = [
  { value: 'action_food', label: 'Фото еды' },
  { value: 'action_restaurant', label: 'Меню ресторана' },
  { value: 'action_today', label: 'Дневник (сегодня)' },
  { value: 'action_week', label: 'Статистика (неделя)' },
  { value: 'action_water', label: 'Стакан воды' },
  { value: 'action_vitamins', label: 'Витаминный баланс' },
  { value: 'action_recipes', label: 'Рецепты' },
  { value: 'action_mealplan', label: 'План питания' },
  { value: 'action_deep', label: 'Deepcheck (4 AI-агента)' },
  { value: 'action_lab', label: 'Анализы крови' },
  { value: 'action_profile', label: 'Профиль' },
  { value: 'action_editprofile', label: 'Редактировать профиль' },
  { value: 'action_more', label: 'Подменю Ещё' },
  { value: 'action_subscribe', label: 'Подписка' },
  { value: 'action_promo', label: 'Промокод' },
  { value: 'action_allergy', label: 'Аллергии' },
  { value: 'action_invite', label: 'Пригласить друга' },
  { value: 'action_reminders', label: 'Напоминания' },
  { value: 'action_qr', label: 'QR-код Moonvit' },
  { value: 'action_addfood', label: 'Добавить еду текстом' },
  { value: 'action_delfood', label: 'Удалить запись из дневника' },
  { value: 'action_stats', label: 'Статистика (всё время)' },
  { value: 'action_help', label: 'Помощь' },
  { value: 'action_menu', label: 'Назад в меню' },
]

export default function BotMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nutri_settings')
      .select('value')
      .eq('key', 'bot_menu_config')
      .single()
    if (data?.value) {
      try {
        // value may be text (JSON string) or jsonb (already parsed)
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
        setItems(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MENU)
      } catch { setItems(DEFAULT_MENU) }
    } else {
      setItems(DEFAULT_MENU)
    }
    setLoading(false)
  }

  function updateItem(idx: number, field: keyof MenuItem, val: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function addItem() {
    setItems(prev => [...prev, { text: '', payload: '' }])
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= items.length) return
    setItems(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  async function handleSave() {
    setSaving(true)
    const filtered = items.filter(i => i.text && i.payload)
    await supabase
      .from('nutri_settings')
      .upsert({ key: 'bot_menu_config', value: JSON.stringify(filtered), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function resetToDefault() {
    setItems([...DEFAULT_MENU])
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Настрой кнопки главного меню бота. Кнопки по 2 в ряд.</p>
        <div className="flex gap-2">
        <button onClick={resetToDefault}
          className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium">
          Сбросить по умолчанию
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl hover:from-emerald-600 hover:to-cyan-600 flex items-center gap-2 disabled:opacity-50 shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Сохранено!' : 'Сохранить меню'}
        </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Кнопки</h3>
          {items.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 group hover:border-emerald-300 transition-colors">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveItem(idx, -1)} className="text-gray-300 hover:text-gray-500 text-xs" disabled={idx === 0}>&#9650;</button>
                <GripVertical className="w-4 h-4 text-gray-300" />
                <button onClick={() => moveItem(idx, 1)} className="text-gray-300 hover:text-gray-500 text-xs" disabled={idx === items.length - 1}>&#9660;</button>
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={item.text}
                  onChange={e => updateItem(idx, 'text', e.target.value)}
                  placeholder="Текст кнопки (с эмодзи)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
                <select
                  value={item.payload}
                  onChange={e => updateItem(idx, 'payload', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-gray-500 outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Выбери payload...</option>
                  {ALL_PAYLOADS.map(p => (
                    <option key={p.value} value={p.value}>{p.value} — {p.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Добавить кнопку
          </button>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Превью в MAX</h3>
          <div className="bg-gradient-to-b from-sky-100 to-sky-50 rounded-2xl p-6 max-w-sm mx-auto border border-sky-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Moonvit Нутрициолог</p>
                <p className="text-xs text-gray-400">бот</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 mb-3 text-sm text-gray-600">
              Выбери действие:
            </div>
            <div className="space-y-2">
              {(() => {
                const rows: MenuItem[][] = []
                const filtered = items.filter(i => i.text)
                for (let i = 0; i < filtered.length; i += 2) {
                  rows.push(filtered.slice(i, i + 2))
                }
                return rows.map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    {row.map((item, ci) => (
                      <button key={ci}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-white text-sm rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow truncate">
                        {item.text || '...'}
                      </button>
                    ))}
                  </div>
                ))
              })()}
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            {ALL_PAYLOADS.length} доступных действий. Кнопки по 2 в ряд.
          </p>
        </div>
      </div>
    </div>
  )
}
