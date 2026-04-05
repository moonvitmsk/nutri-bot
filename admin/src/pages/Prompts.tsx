import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Check, Loader2, Cpu, MessageSquare } from 'lucide-react'

interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string | null
}

const MODEL_OPTIONS: Record<string, string[]> = {
  ai_model_chat: ['gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o', 'o4-mini', 'o3'],
  ai_model_vision: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'o4-mini', 'o3'],
  ai_model_transcription: ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'],
}

const NICE_NAMES: Record<string, string> = {
  system_prompt: 'Системный промпт (характер бота)',
  prompt_consent: 'Приветственное сообщение',
  food_vision_prompt: 'Промпт: анализ фото еды',
  lab_vision_prompt: 'Промпт: разбор анализов',
  agent_dietolog_prompt: 'Агент: Диетолог',
  agent_health_prompt: 'Агент: Здоровье',
  agent_lifestyle_prompt: 'Агент: Лайфстайл',
  agent_report_prompt: 'Агент: Отчёт',
  ai_model_chat: 'Модель AI (чат)',
  ai_model_vision: 'Модель AI (Vision)',
  ai_model_transcription: 'Модель AI (голосовые)',
}

export default function Prompts() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nutri_settings').select('*').order('key')
    setSettings((data as Setting[]) ?? [])
    setLoading(false)
  }

  function startEdit(s: Setting) {
    setEditing(s.key)
    setEditValue(s.value)
  }

  async function handleSave(key: string) {
    setSaving(key)
    const { error } = await supabase
      .from('nutri_settings')
      .update({ value: editValue, updated_at: new Date().toISOString() })
      .eq('key', key)
    if (!error) {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: editValue, updated_at: new Date().toISOString() } : s))
      setEditing(null)
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка...
      </div>
    )
  }

  // Split: model settings vs prompts
  const modelSettings = settings.filter(s => s.key.startsWith('ai_model_'))
  const promptSettings = settings.filter(s => !s.key.startsWith('ai_model_'))

  return (
    <div className="space-y-6">
      {/* Model selection cards */}
      {modelSettings.length > 0 && (
        <div className="gradient-border p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-500" />
            Модели AI
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modelSettings.map(s => (
              <div key={s.key} className="bg-gray-50 rounded-xl p-4">
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {NICE_NAMES[s.key] || s.key}
                </label>
                {s.description && <p className="text-xs text-gray-400 mb-2">{s.description}</p>}
                <select
                  value={s.value}
                  onChange={async (e) => {
                    const newVal = e.target.value
                    setSaving(s.key)
                    await supabase.from('nutri_settings')
                      .update({ value: newVal, updated_at: new Date().toISOString() })
                      .eq('key', s.key)
                    setSettings(prev => prev.map(p => p.key === s.key ? { ...p, value: newVal } : p))
                    setSaving(null)
                    setSaved(s.key)
                    setTimeout(() => setSaved(null), 2000)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                  style={{ maxHeight: '200px' }}
                >
                  {(() => {
                    const opts = MODEL_OPTIONS[s.key] || []
                    const all = opts.includes(s.value) ? opts : [s.value, ...opts]
                    return all.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  })()}
                </select>
                {saved === s.key && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Сохранено</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt cards */}
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-500" />
        Промпты и тексты
      </h2>
      {promptSettings.length === 0 && <p className="text-gray-400 text-center py-12">Настройки не найдены</p>}
      {promptSettings.map(s => (
        <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{NICE_NAMES[s.key] || s.key}</h3>
              <p className="text-xs text-gray-400 font-mono">{s.key}</p>
              {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {editing === s.key ? (
                <>
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                    Отмена
                  </button>
                  <button onClick={() => handleSave(s.key)} disabled={saving === s.key}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50">
                    {saving === s.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Сохранить
                  </button>
                </>
              ) : (
                <button onClick={() => startEdit(s)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  {saved === s.key ? <><Check className="w-3 h-3 text-emerald-500" /> Сохранено</> : 'Редактировать'}
                </button>
              )}
            </div>
          </div>
          {editing === s.key ? (
            <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
              rows={Math.max(6, editValue.split('\n').length + 2)}
              className="w-full font-mono text-sm p-3 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 resize-y" />
          ) : (
            <pre className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
              {s.value}
            </pre>
          )}
          {s.updated_at && <p className="text-xs text-gray-400 mt-2">Обновлено: {new Date(s.updated_at).toLocaleString('ru-RU')}</p>}
        </div>
      ))}
    </div>
  )
}
