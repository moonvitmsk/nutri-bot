# NutriBot — Полный HANDOFF для продолжения работы

## Скопируй это в новый чат Claude Code

---

Продолжаем работу над NutriBot — AI-бот-нутрициолог для мессенджера MAX (Moonvit).
Прочитай `C:\Users\sasha\.claude\projects\D--DX\memory\project_nutribot.md` и `C:\Users\sasha\.claude\projects\D--DX\memory\MEMORY.md`.

## 1. ПРОЕКТ

### Структура
```
D:\DX\nutri-bot\
├── api/
│   ├── webhook.ts          # Vercel serverless entry — обрабатывает {"updates":[...]}
│   ├── test.ts             # Диагностика (MAX, Supabase, OpenAI check)
│   └── cron-reminders.ts   # Утренние напоминания (09:00 МСК)
├── src/
│   ├── config.ts           # ENV config
│   ├── max/
│   │   ├── api.ts          # sendMessage, sendContactRequest, answerCallback, subscribeWebhook
│   │   ├── types.ts        # MaxUpdate, MaxMessage, MaxCallback, MaxAttachment, NutriUser...
│   │   └── keyboard.ts     # mainMenu() [async!], onboardingSex, onboardingGoal, skipButton
│   ├── handlers/
│   │   ├── router.ts       # ГЛАВНЫЙ: routeUpdate → bot_started/callback/message
│   │   ├── onboarding.ts   # Wow-first: AI-приветствие → фото → 6 шагов
│   │   ├── commands.ts     # /start, /profile, /today, /week, /deepcheck, /lab, /water, /help, /reset, /deletedata
│   │   ├── callbacks.ts    # Inline кнопки: action_food, action_deep, action_lab, action_water...
│   │   ├── intent-detector.ts # NLU: 12 regex-паттернов свободного текста → действия
│   │   ├── food-photo.ts   # Vision API → калории
│   │   ├── lab-results.ts  # Vision API → анализы/МРТ/документы
│   │   ├── deep-consult.ts # 4 AI-агента параллельно → отчёт
│   │   ├── qr-code.ts      # jsQR → активация подписки
│   │   └── chat.ts         # GPT-4.1-mini чат (стиль Бендер+Лебедев)
│   ├── ai/
│   │   ├── client.ts       # chatCompletion, visionAnalysis — модель из getSetting()
│   │   ├── prompts.ts      # Системный промпт из DB
│   │   ├── context.ts      # Контекст 10 сообщений + summarize
│   │   ├── vision.ts       # food vision prompt
│   │   └── agents.ts       # 4 агента deepcheck
│   ├── db/
│   │   ├── supabase.ts     # Supabase client (service_role)
│   │   ├── users.ts        # CRUD, findByMaxId, setContextState, deleteUserData, updateStreak
│   │   ├── messages.ts     # saveMessage, getHistory, deleteUserMessages
│   │   ├── food-logs.ts    # saveFoodLog, getTodayLogs, getWeekLogs...
│   │   ├── products.ts     # getProducts, getBySlug
│   │   ├── settings.ts     # getSetting (кеш 60с), updateSetting
│   │   └── subscriptions.ts # getSubscriptionStatus, canUseFeature
│   └── utils/
│       ├── nutrition.ts    # calculateMacros (Mifflin-St Jeor), formatMacros, formatDaySummary
│       ├── formatter.ts    # splitMessage, disclaimer, featureLocked
│       └── qr-decoder.ts   # jsQR
├── admin/                  # React + Vite + Tailwind
│   └── src/
│       ├── App.tsx         # Логин (moonvit2026) + роуты
│       ├── components/
│       │   ├── Layout.tsx  # Космический sidebar со звёздами
│       │   └── DataTable.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx   # 11 карточек + $ токены + график 7 дней
│       │   ├── Users.tsx       # Таблица юзеров + поиск + фильтр
│       │   ├── Prompts.tsx     # Dropdown модели + все промпты + редактор
│       │   ├── Vitamins.tsx    # 6 SKU Moonvit
│       │   ├── QRCodes.tsx     # Генерация + CSV
│       │   ├── Logs.tsx        # Сообщения
│       │   ├── Analytics.tsx   # Аналитика
│       │   └── BotMenu.tsx     # Визуальный редактор меню бота
│       └── lib/supabase.ts    # Supabase anon client
├── knowledge/              # База знаний 6 SKU
├── docs/
│   ├── ROADMAP_100.md      # 120 задач (блоки A-M)
│   ├── RESEARCH_PROMPT.md  # Промпт для deep research
│   └── FINAL_REPORT.md
├── vercel.json             # fra1, maxDuration 60s, cron 06:00 UTC
├── tsconfig.json
└── package.json
```

### Стек
- **Бот**: Node.js/TypeScript, Vercel serverless (fra1), OpenAI GPT-4.1/4.1-mini/Vision
- **БД**: Supabase moonvit (zfihygjekrheimvrpdtp), 9 таблиц с префиксом nutri_*
- **Админка**: React 18 + Vite + Tailwind CSS, 8 страниц, Supabase anon client
- **MAX Bot API**: https://platform-api.max.ru, Auth: token header, 30 rps, 4000 char limit

### Ключи и доступы
- **Supabase project**: zfihygjekrheimvrpdtp
- **Supabase anon key**: (см. Vercel env / Claude memory)
- **Supabase service_role key**: (см. Vercel env / Claude memory)
- **Vercel token**: (см. Vercel env / Claude memory)
- **MAX Bot Token**: (см. Vercel env MAX_BOT_TOKEN)
- **MAX Bot**: "Нутрициолог moonvit" (@id7730325082_bot), user_id=229087219
- **OpenAI key**: (см. Vercel env OPENAI_API_KEY)
- **21st.dev key**: НЕВАЛИДЕН — нужен новый
- **Админка локально**: `cd D:\DX\nutri-bot\admin && npm run dev` (порт 5175, пароль moonvit2026)

### Деплой
```bash
# Бот (токен в Vercel env или Claude memory)
cd D:\DX\nutri-bot && npx vercel --prod --yes --token $VERCEL_TOKEN
# Админка
cd D:\DX\nutri-bot\admin && npx vercel --prod --yes --token $VERCEL_TOKEN
```

## 2. КРИТИЧЕСКИЕ ЗНАНИЯ (не ломай!)

1. **MAX sends `{"updates":[...], "marker":...}`** — api/webhook.ts итерирует массив updates
2. **mainMenu() — async!** Везде `await mainMenu()`
3. **Модели AI** загружаются из nutri_settings: getSetting('ai_model_chat'), getSetting('ai_model_vision')
4. **RLS**: anon имеет GRANT SELECT+UPDATE на nutri_settings, GRANT SELECT на все остальные nutri_* таблицы
5. **Vercel Hobby**: только 1 cron/day, только 10 сек на функцию
6. **MAX API 4000 char limit**: splitMessage() в formatter.ts разбивает длинные ответы
7. **Contact attachment**: тип `contact` обрабатывается в router.ts для шага телефона
8. **Wow-first онбординг**: step 0 = ждёт фото (не текст), transitionAfterWow переводит на step 1
9. **Intent detector**: 12 regex-паттернов в intent-detector.ts, работает ТОЛЬКО для onboarded юзеров
10. **Кеш настроек**: getSetting() кеширует 60 сек — изменения из админки применяются с задержкой

## 3. ЧТО УЖЕ СДЕЛАНО

- [x] Бот на Vercel (fra1, 24/7), webhook зарегистрирован
- [x] Wow-first онбординг: AI-приветствие (Бендер) → фото еды → wow → 6 шагов (имя, пол, возраст, рост, вес, цель)
- [x] AI-чат (GPT-4.1-mini из настроек), Vision (GPT-4.1), deepcheck (4 агента)
- [x] Фото еды → КБЖУ, анализы крови → разбор, МРТ/УЗИ → "иди к врачу"
- [x] QR-коды (jsQR), вода, streak
- [x] NLU: 12 паттернов свободного текста → действия ("покажи дневник" → /today)
- [x] Админка 8 страниц: Дашборд ($-токены + график), Юзеры, Промпты (dropdown модели), Витамины, QR, Логи, Аналитика, Меню бота
- [x] Все тексты/промпты/модели редактируются из админки (nutri_settings)
- [x] Меню бота загружается динамически из настроек
- [x] Промпт: Бендер + Лебедев (дерзкий юмор без мата)
- [x] Напоминания: Vercel Cron 09:00 МСК (утренние)
- [x] Описание бота в MAX обновлено
- [x] Космический дизайн sidebar админки

## 4. НЕВЫПОЛНЕННЫЕ ЗАДАЧИ (приоритет)

### P0 — КРИТИЧНО (бот ломается или юзер не может пользоваться)

#### 4.1 Голосовые сообщения
MAX API присылает audio attachments (type: 'audio'). Сейчас бот их ИГНОРИРУЕТ — router.ts обрабатывает только image и contact. Нужно:
- Скачать аудио файл (payload.url)
- Транскрибировать через OpenAI Whisper API: `openai.audio.transcriptions.create({ model: 'whisper-1', file: audioBuffer })`
- Полученный текст обработать как обычное сообщение (intent detection → chat)
- Файл: `src/handlers/router.ts` — добавить обработку `a.type === 'audio'` после image

#### 4.2 Приём документов/файлов
MAX API присылает file attachments (type: 'file'). Нужно:
- Если PDF/документ с анализами → скачать, конвертировать в изображение или извлечь текст, передать в lab-results handler
- Если другой файл → отправить вежливый отказ ("я работаю с фото еды и анализами")
- Файл: `src/handlers/router.ts` — добавить обработку `a.type === 'file'`

#### 4.3 Все виды вложений от MAX
MaxAttachment.type может быть: 'image' | 'video' | 'audio' | 'file' | 'contact' | 'sticker' | 'share'.
Обработаны: image, contact. НЕ обработаны: video, audio, file, sticker, share.
- video → "Пока не умею анализировать видео, отправь фото"
- audio → Whisper транскрипция (см. выше)
- file → обработка документов (см. выше)
- sticker → проигнорировать или пошутить
- share → проигнорировать

### P1 — ВЫСОКИЙ (пользователь просил)

#### 4.4 21st.dev дизайн
Пользователь хочет "охрененный дизайн" через 21st.dev. Текущий ключ невалиден — нужен новый с https://21st.dev/magic/console. Если не получится — продолжать улучшать вручную: космическая тема + КБЖУ, фотографии еды.

#### 4.5 Дашборд: сделать удобным для исполнения ТЗ
Пользователь хочет чтобы дашборд помогал управлять ботом: видеть что работает, что сломалось, быстро менять настройки. Добавить:
- Статус бота (последний webhook, ошибки)
- Быстрые действия (сбросить кеш, перерегистрировать webhook)
- Популярные запросы юзеров

#### 4.6 Космические фото/иллюстрации в UI
Пользователь хочет фотографии "связанные с космосом, но приземлённые на КБЖУ". Нужно добавить в дашборд и логин.

#### 4.7 Вечерние напоминания
Vercel Hobby позволяет только 1 cron/day. Для вечерних итогов нужен:
- Либо Supabase Edge Function + pg_cron
- Либо Supabase Webhooks
- Либо внешний cron сервис (cron-job.org)

### P2 — СРЕДНИЙ

#### 4.8 Тесты
Юнит-тесты для: intent-detector, nutrition calculator, formatter, onboarding flow. Есть 15 тестов в tests/ — расширить.

#### 4.9 Deep Research
Файл `D:\DX\nutri-bot\docs\RESEARCH_PROMPT.md` содержит полный промпт для глубокого исследования проекта (10 направлений). Прогнать через другой чат и применить рекомендации.

#### 4.10 Roadmap блоки D-M
Файл `D:\DX\nutri-bot\docs\ROADMAP_100.md`:
- D: 21st.dev дизайн (частично сделан)
- E: Мультиагентная оценка (частично — reviews в docs/)
- F: Маркетинг (7 файлов в docs/marketing/)
- G: Улучшения бота (вода+streak сделано, рецепты нет)
- H: Аналитика (дашборд сделан, воронки нет)
- I: Монетизация (тарифы базово, промо нет)
- J: Техническое (тесты, CI/CD, мониторинг)
- K: Безопасность (152-ФЗ consent сделан, rate limiting нет)
- L: Масштабирование
- M: Команда и процессы

## 5. SUPABASE СХЕМА

9 таблиц с префиксом nutri_*:

| Таблица | Описание | Ключевые поля |
|---------|----------|---------------|
| nutri_users | Пользователи | max_user_id, name, age, sex, goal, onboarding_step, subscription_type, water_glasses, streak_days |
| nutri_messages | История чата | user_id, role, content, tokens_used |
| nutri_food_logs | Дневник еды | user_id, photo_url, calories, protein, fat, carbs, ai_analysis, confirmed |
| nutri_lab_results | Анализы | user_id, photo_url, parsed_data, ai_interpretation, deficiencies |
| nutri_deep_consults | Глубокие консультации | user_id, agents_input, agents_output, final_report |
| nutri_qr_codes | QR-коды | code, sku, activated_by, batch_id |
| nutri_settings | Настройки бота | key, value, description (все промпты, модели, тексты) |
| nutri_moonvit_products | 6 SKU Moonvit | slug, name, composition, talking_points_md, key_ingredients |
| nutri_deficiency_map | Маппинг дефицитов | deficiency_key, product_slug, priority, reason |

**RLS**: anon имеет SELECT на все таблицы + UPDATE на nutri_settings. service_role имеет ALL.

## 6. MAX BOT API ОСОБЕННОСТИ

- Domain: https://platform-api.max.ru
- Auth: `Authorization: <token>` (без Bearer!)
- Формат webhook: `{"updates": [...], "marker": 12345}` — всегда итерировать массив
- Отправка: `POST /messages?chat_id={id}` body: `{"text":"...", "format":"markdown", "attachments":[...]}`
- Inline keyboard: `{"type":"inline_keyboard","payload":{"buttons":[[{"type":"callback","text":"...","payload":"..."}]]}}`
- Contact request: `{"type":"request_contact","text":"Поделиться"}`
- Attachments от юзеров: image (payload.url, payload.photos), audio (payload.url), file (payload.url, payload.filename), video (payload.url), contact, sticker, share
- Ответ на callback: `POST /answers` body: `{"callback_id":"..."}`
- Webhook подписка: `POST /subscriptions` body: `{"url":"...","update_types":["message_created","message_callback","bot_started"]}`
- Лимит: 4000 символов на сообщение, 30 rps

## 7. СТИЛЬ РАБОТЫ С ПОЛЬЗОВАТЕЛЕМ

- Александр Герастовский, CEO Moonvit, vibe-coder
- Голосовой ввод через Handy — опечатки это артефакты STT, не переспрашивай
- Короткие ответы, без воды, делай сразу
- Всегда деплой после изменений
- Dev-сервер админки держать запущенным (preview_start nutribot-admin)
- Предпочитает новейшие модели OpenAI (gpt-4.1, gpt-4.1-mini)

## 8. НАЧНИ С

1. Подними dev-сервер: `preview_start nutribot-admin`
2. **Добавь обработку голосовых сообщений** (audio → Whisper → текст → intent/chat)
3. **Добавь обработку файлов/документов** (file → lab-results или отказ)
4. Попробуй 21st.dev (если ключ невалиден — попроси новый)
5. Деплой после каждого изменения

---
