import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'
import { Save, Check, Loader2, Cpu, MessageSquare, Bell, Radio, Shield, Sliders, Hand, Type, ChevronDown, ChevronRight } from 'lucide-react'

interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string | null
}

const MODEL_OPTIONS: Record<string, string[]> = {
  ai_model_chat: [
    'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4.5-preview',
    'gpt-4o-mini', 'gpt-4o',
    'o3-mini', 'o3', 'o4-mini',
    'claude-sonnet-4-20250514', 'claude-haiku-4-20250414',
    'gemini-2.5-pro', 'gemini-2.5-flash',
    'deepseek-chat', 'deepseek-reasoner',
  ],
  ai_model_vision: [
    'gpt-4.1-mini', 'gpt-4.1', 'gpt-4.5-preview',
    'gpt-4o-mini', 'gpt-4o',
    'o3', 'o4-mini',
    'claude-sonnet-4-20250514',
    'gemini-2.5-pro', 'gemini-2.5-flash',
  ],
  ai_model_transcription: [
    'whisper-1',
    'gpt-4o-mini-transcribe', 'gpt-4o-transcribe',
  ],
  ai_model_quality: [
    'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1',
    'gpt-4o-mini', 'gpt-4o',
    'o3-mini', 'o4-mini',
  ],
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
  ai_model_quality: 'Модель AI (качество)',
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [confirmClearCache, setConfirmClearCache] = useState(false)
  const [confirmResetStreaks, setConfirmResetStreaks] = useState(false)

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

  async function saveSetting(key: string, value?: string) {
    const val = value ?? editValue
    setSaving(key)
    const { error } = await supabase
      .from('nutri_settings')
      .update({ value: val, updated_at: new Date().toISOString() })
      .eq('key', key)
    if (!error) {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val, updated_at: new Date().toISOString() } : s))
      setEditing(null)
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  function getVal(key: string): string {
    return settings.find(s => s.key === key)?.value ?? ''
  }

  async function upsertSetting(key: string, value: string) {
    setSaving(key)
    const { error } = await supabase
      .from('nutri_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (!error) {
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
      load()
    }
    setSaving(null)
  }

  async function exportAllData() {
    const tables = ['nutri_users', 'nutri_messages', 'nutri_food_logs', 'nutri_settings']
    const result: Record<string, any> = {}
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*').limit(10000)
      result[t] = data
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutribot-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка...
      </div>
    )
  }

  const modelSettings = settings.filter(s => s.key.startsWith('ai_model_'))
  const greetingKeys = ['prompt_greeting', 'prompt_greeting_ai', 'prompt_consent']
  const greetingSettings = settings.filter(s => greetingKeys.includes(s.key))
  const promptSettings = settings.filter(s => !s.key.startsWith('ai_model_') && !s.key.startsWith('config_') && !greetingKeys.includes(s.key))

  return (
    <div className="space-y-8">
      {/* Greeting / Welcome */}
      <section>
        <SectionHeader icon={Hand} title="Приветствие и онбординг" color="text-amber-500" />
        <p className="text-xs text-gray-400 mb-4">Текст приветствия при первом запуске бота. Если пусто — генерируется AI.</p>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">Приветственное сообщение</h3>
            <p className="text-xs text-gray-400 font-mono mb-2">prompt_greeting</p>
            <textarea
              value={getVal('prompt_greeting')}
              onChange={e => {
                const val = e.target.value
                setSettings(prev => prev.map(s => s.key === 'prompt_greeting' ? { ...s, value: val } : s))
              }}
              rows={4}
              placeholder="Оставь пустым — AI сгенерирует уникальное приветствие каждый раз"
              className="w-full font-mono text-sm p-3 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 resize-y mb-2"
            />
            <button onClick={() => upsertSetting('prompt_greeting', getVal('prompt_greeting'))}
              disabled={saving === 'prompt_greeting'}
              className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
              {saving === 'prompt_greeting' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'prompt_greeting' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved === 'prompt_greeting' ? 'Сохранено' : 'Сохранить'}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">Промпт для AI-приветствия</h3>
            <p className="text-xs text-gray-400 font-mono mb-2">prompt_greeting_ai</p>
            <textarea
              value={getVal('prompt_greeting_ai')}
              onChange={e => {
                const val = e.target.value
                setSettings(prev => prev.map(s => s.key === 'prompt_greeting_ai' ? { ...s, value: val } : s))
              }}
              rows={3}
              placeholder="Инструкция для AI при генерации приветствия (стиль, тон, длина)"
              className="w-full font-mono text-sm p-3 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 resize-y mb-2"
            />
            <button onClick={() => upsertSetting('prompt_greeting_ai', getVal('prompt_greeting_ai'))}
              disabled={saving === 'prompt_greeting_ai'}
              className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
              {saving === 'prompt_greeting_ai' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'prompt_greeting_ai' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved === 'prompt_greeting_ai' ? 'Сохранено' : 'Сохранить'}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">Приветственная картинка</h3>
          <p className="text-xs text-gray-400 mb-2">URL изображения (JPG/PNG). Отправляется новому пользователю вместе с приветствием. Если пусто — генерируется автоматически.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={getVal('config_welcome_image_url')}
              onChange={e => {
                const val = e.target.value
                setSettings(prev => {
                  const exists = prev.find(s => s.key === 'config_welcome_image_url')
                  if (exists) return prev.map(s => s.key === 'config_welcome_image_url' ? { ...s, value: val } : s)
                  return [...prev, { key: 'config_welcome_image_url', value: val, description: null, updated_at: null }]
                })
              }}
              placeholder="https://example.com/welcome.png"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => upsertSetting('config_welcome_image_url', getVal('config_welcome_image_url'))}
              disabled={saving === 'config_welcome_image_url'}
              className="px-3 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1"
            >
              {saving === 'config_welcome_image_url' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'config_welcome_image_url' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
          {getVal('config_welcome_image_url') && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 max-w-xs">
              <img src={getVal('config_welcome_image_url')} alt="preview" className="w-full h-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>
      </section>

      {/* Bot Messages */}
      <BotMessagesSection getVal={getVal} upsertSetting={upsertSetting} saving={saving} saved={saved} />

      {/* AI Models */}
      <section>
        <SectionHeader icon={Cpu} title="Модели AI" color="text-violet-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modelSettings.map(s => (
            <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">{NICE_NAMES[s.key] || s.key}</label>
              <select
                value={s.value}
                onChange={(e) => saveSetting(s.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-emerald-500 outline-none"
              >
                {(() => {
                  const opts = MODEL_OPTIONS[s.key] || []
                  const all = opts.includes(s.value) ? opts : [s.value, ...opts]
                  return all.map(m => <option key={m} value={m}>{m}</option>)
                })()}
              </select>
              {saved === s.key && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Сохранено</p>}
            </div>
          ))}
        </div>
      </section>

      {/* AI Parameters */}
      <section>
        <SectionHeader icon={Sliders} title="Параметры AI" color="text-cyan-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SettingInput label="Temperature (0.0 - 2.0)" settingKey="config_ai_temperature" defaultValue="0.7" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Max tokens (ответ)" settingKey="config_ai_max_tokens" defaultValue="2048" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Глубина контекста (сообщений)" settingKey="config_context_messages" defaultValue="15" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Суммаризация каждые N сообщений" settingKey="config_context_summary_every" defaultValue="50" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Top P" settingKey="config_ai_top_p" defaultValue="1.0" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Frequency penalty" settingKey="config_ai_frequency_penalty" defaultValue="0.0" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Presence penalty" settingKey="config_ai_presence_penalty" defaultValue="0.0" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Moonvit упоминание каждые N сообщений" settingKey="config_moonvit_mention_every" defaultValue="5" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
        </div>
      </section>

      {/* Freemium */}
      <section>
        <SectionHeader icon={Sliders} title="Freemium" color="text-amber-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput label="Бесплатных анализов" settingKey="config_free_analyses" defaultValue="10" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
          <SettingInput label="Дней trial при шаринге телефона" settingKey="config_trial_days" defaultValue="30" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
        </div>
      </section>

      {/* Reminders */}
      <section>
        <SectionHeader icon={Bell} title="Напоминания" color="text-blue-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput label="Время утренних (МСК)" settingKey="config_morning_time" defaultValue="08:00" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} type="time" />
          <SettingInput label="Время вечерних (МСК)" settingKey="config_evening_time" defaultValue="20:00" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} type="time" />
        </div>
      </section>

      {/* Broadcasts */}
      <section>
        <SectionHeader icon={Radio} title="Рассылки" color="text-violet-500" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput label="Время рассылки (МСК)" settingKey="config_broadcast_time" defaultValue="12:00" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} type="time" />
          <SettingInput label="Дни недели (пн=1, вс=7, через запятую)" settingKey="config_broadcast_days" defaultValue="1,3,5" getVal={getVal} onSave={upsertSetting} saving={saving} saved={saved} />
        </div>
      </section>

      {/* Prompts */}
      <section>
        <SectionHeader icon={MessageSquare} title="Промпты и тексты" color="text-emerald-500" />
        {promptSettings.length === 0 && <p className="text-gray-400 text-center py-12">Настройки не найдены</p>}
        {promptSettings.map(s => (
          <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">{NICE_NAMES[s.key] || s.key}</h3>
                <p className="text-xs text-gray-400 font-mono">{s.key}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {editing === s.key ? (
                  <>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Отмена</button>
                    <button onClick={() => saveSetting(s.key)} disabled={saving === s.key}
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50">
                      {saving === s.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Сохранить
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEdit(s)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
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
              <pre className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">{s.value}</pre>
            )}
            {s.updated_at && <p className="text-xs text-gray-400 mt-2">Обновлено: {new Date(s.updated_at).toLocaleString('ru-RU')}</p>}
          </div>
        ))}
      </section>

      {/* Danger Zone */}
      <section>
        <SectionHeader icon={Shield} title="Опасная зона" color="text-red-500" />
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setConfirmClearCache(true)} className="px-4 py-2 text-sm border border-red-200 text-red-500 rounded-xl hover:bg-red-50">
            Очистить все кеши
          </button>
          <button onClick={() => setConfirmResetStreaks(true)} className="px-4 py-2 text-sm border border-red-200 text-red-500 rounded-xl hover:bg-red-50">
            Ресет всех стриков
          </button>
          <button onClick={exportAllData} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
            Экспорт всех данных (JSON)
          </button>
        </div>
      </section>

      <ConfirmDialog open={confirmClearCache} title="Очистить кеши" message="Все кеши будут очищены." variant="warning" onConfirm={() => { setConfirmClearCache(false); alert('Кеш очищен') }} onCancel={() => setConfirmClearCache(false)} />
      <ConfirmDialog open={confirmResetStreaks} title="Ресет стриков" message="Все стрики пользователей будут сброшены." variant="danger"
        onConfirm={async () => {
          await supabase.from('nutri_users').update({ streak_days: 0 }).neq('streak_days', 0)
          setConfirmResetStreaks(false)
          alert('Стрики сброшены')
        }}
        onCancel={() => setConfirmResetStreaks(false)} />
    </div>
  )
}

const BOT_MSG_GROUPS = [
  {
    title: 'Онбординг',
    msgs: [
      { key: 'onboarding_step_1', label: 'Шаг 1: Имя', ph: 'Как тебя зовут?' },
      { key: 'onboarding_step_2', label: 'Шаг 2: Пол', ph: 'Укажи свой пол:' },
      { key: 'onboarding_step_3', label: 'Шаг 3: Возраст', ph: 'Когда ты родился? (дата рождения, например 15.03.1990)' },
      { key: 'onboarding_step_4', label: 'Шаг 4: Рост', ph: 'Какой у тебя рост в см?' },
      { key: 'onboarding_step_5', label: 'Шаг 5: Вес', ph: 'Какой у тебя вес в кг?' },
      { key: 'onboarding_step_6', label: 'Шаг 6: Цель', ph: 'Какая у тебя цель?' },
      { key: 'onboarding_sex_error', label: 'Ошибка: пол', ph: 'Выбери пол кнопкой выше или напиши М/Ж:' },
      { key: 'onboarding_date_error', label: 'Ошибка: дата', ph: 'Не распознал дату. Введи дату рождения...' },
      { key: 'onboarding_height_error', label: 'Ошибка: рост', ph: 'Введи рост числом в см (100-250):' },
      { key: 'onboarding_weight_error', label: 'Ошибка: вес', ph: 'Введи вес числом в кг (30-300):' },
      { key: 'onboarding_phone_activated', label: 'Телефон принят', ph: 'Спасибо! Пробный период активирован на 30 дней.' },
      { key: 'onboarding_phone_request', label: 'Запрос телефона', ph: 'Поделись номером телефона — активирую пробный период на 30 дней.' },
      { key: 'onboarding_fallback_greeting', label: 'Приветствие (fallback)', ph: 'Привет! Я — NutriBot, AI-нутрициолог от Moonvit...' },
    ],
  },
  {
    title: 'Сервисные сообщения',
    msgs: [
      { key: 'msg_analyzing_photo', label: 'Анализ фото', ph: 'Анализирую фото...' },
      { key: 'msg_analyzing_menu', label: 'Анализ меню', ph: 'Анализирую меню ресторана...' },
      { key: 'msg_send_food_photo', label: 'Запрос фото еды', ph: 'Отправь фото еды — я проанализирую состав и КБЖУ!' },
      { key: 'msg_send_lab_photo', label: 'Запрос фото анализов', ph: 'Отправь фото анализов крови, биохимии или гормонов...' },
      { key: 'msg_send_qr_photo', label: 'Запрос QR-кода', ph: 'Сфотографируй QR-код под крышкой продукта Moonvit...' },
      { key: 'msg_photo_error', label: 'Ошибка анализа фото', ph: 'Не удалось проанализировать фото. Попробуй ещё раз...' },
      { key: 'msg_deep_consult_start', label: 'Старт deep-консультации', ph: 'Запускаю глубокую консультацию (4 AI-агента)...' },
      { key: 'msg_restaurant_prompt', label: 'Запрос меню ресторана', ph: 'Сфотографируй меню ресторана — я посчитаю калории...' },
      { key: 'msg_weight_hint', label: 'Подсказка: вес', ph: 'Вес другой? Нажми «Изменить вес»' },
      { key: 'msg_intent_food', label: 'Запрос по намерению "еда"', ph: 'Отправь мне фото еды — я посчитаю калории!' },
      { key: 'msg_welcome_back', label: 'Возвращение (шаблон: {name})', ph: 'С возвращением, {name}! Выбери действие:' },
      { key: 'msg_nothing_today', label: 'Нет записей сегодня', ph: 'Сегодня ещё нет записей. Отправь фото еды!' },
    ],
  },
  {
    title: 'Вложения',
    msgs: [
      { key: 'msg_file_unsupported', label: 'Файл не поддерживается', ph: 'Я работаю с фото еды и анализами...' },
      { key: 'msg_video_unsupported', label: 'Видео', ph: 'Видео пока не умею анализировать...' },
      { key: 'msg_sticker_response', label: 'Стикер', ph: 'Классный стикер, но в нём ноль калорий...' },
      { key: 'msg_share_response', label: 'Ссылка', ph: 'Спасибо за ссылку! Но я лучше работаю с фото...' },
    ],
  },
  {
    title: 'Подписки и лимиты',
    msgs: [
      { key: 'msg_trial_activated', label: 'Trial активирован', ph: 'Спасибо! Активирован пробный период на 30 дней...' },
      { key: 'msg_trial_expired', label: 'Trial истёк', ph: 'Пробный период закончился...' },
      { key: 'feature_photo', label: 'Блокировка: фото', ph: 'Распознавание фото еды недоступно на бесплатном тарифе...' },
      { key: 'feature_lab', label: 'Блокировка: анализы', ph: 'Анализ лабораторных результатов доступен только на Premium...' },
      { key: 'feature_deepcheck', label: 'Блокировка: deep-консультация', ph: 'Глубокая консультация доступна на Trial и Premium тарифах.' },
      { key: 'feature_photo_limit', label: 'Блокировка: лимит фото', ph: 'Достигнут лимит фото на сегодня...' },
      { key: 'feature_chat_limit', label: 'Блокировка: лимит чата', ph: 'Достигнут лимит сообщений на сегодня...' },
      { key: 'msg_free_exhausted', label: 'Бесплатные закончились (полный текст)', ph: 'Бесплатные анализы закончились!...' },
    ],
  },
  {
    title: 'Дисклеймеры',
    msgs: [
      { key: 'disclaimer', label: 'Общий дисклеймер', ph: 'Бот не заменяет консультацию врача или диетолога.' },
      { key: 'lab_disclaimer', label: 'Дисклеймер: анализы', ph: 'Интерпретация носит информационный характер...' },
      { key: 'vitamin_disclaimer', label: 'Дисклеймер: витамины', ph: 'Перед приемом БАД проконсультируйтесь со специалистом.' },
    ],
  },
]

function BotMessagesSection({ getVal, upsertSetting, saving, saved }: {
  getVal: (k: string) => string
  upsertSetting: (k: string, v: string) => void
  saving: string | null
  saved: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <section>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-blue-600 transition-colors">
        <Type className="w-5 h-5 text-blue-500" />
        Тексты бота
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="text-xs font-normal text-gray-400 ml-2">~40 сообщений, редактируемых из админки</span>
      </button>
      {open && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">Все тексты, которые бот отправляет пользователям. Оставь пустым — используется текст по умолчанию (placeholder). Поддерживаются шаблоны: {'{name}'}, {'{macros}'}.</p>
          {BOT_MSG_GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-gray-600 mb-3 border-b border-gray-100 pb-1">{group.title}</h3>
              <div className="space-y-3">
                {group.msgs.map(m => (
                  <BotMsgRow key={m.key} msgKey={m.key} label={m.label} placeholder={m.ph}
                    value={getVal(m.key)} onSave={upsertSetting} saving={saving} saved={saved} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function BotMsgRow({ msgKey, label, placeholder, value, onSave, saving, saved }: {
  msgKey: string; label: string; placeholder: string; value: string
  onSave: (k: string, v: string) => void; saving: string | null; saved: string | null
}) {
  const [val, setVal] = useState(value || '')
  const isMultiline = placeholder.length > 80

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className="text-[10px] text-gray-300 font-mono">{msgKey}</span>
      </div>
      <div className="flex gap-2">
        {isMultiline ? (
          <textarea value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
            rows={3} className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500 resize-y font-mono" />
        ) : (
          <input type="text" value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500 font-mono" />
        )}
        <button onClick={() => onSave(msgKey, val)} disabled={saving === msgKey}
          className="px-2 py-1.5 bg-emerald-500 text-white text-xs rounded hover:bg-emerald-600 disabled:opacity-50 shrink-0">
          {saving === msgKey ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === msgKey ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} /> {title}
    </h2>
  )
}

function SettingInput({ label, settingKey, defaultValue, getVal, onSave, saving, saved, type = 'text' }: {
  label: string; settingKey: string; defaultValue: string; getVal: (k: string) => string
  onSave: (k: string, v: string) => void; saving: string | null; saved: string | null; type?: string
}) {
  const [val, setVal] = useState(getVal(settingKey) || defaultValue)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => onSave(settingKey, val)}
          disabled={saving === settingKey}
          className="px-3 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving === settingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === settingKey ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
