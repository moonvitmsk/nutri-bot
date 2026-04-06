# NutriBot MAX — Full Project Specification
> AI-нутрициолог для мессенджера MAX (VK), бренд Moonvit
> Дата: 2026-04-05 | Версия: 2.0

---

## 1. СРЕДА РАЗМЕЩЕНИЯ

### 1.1 Инфраструктура

```
               ┌─────────────────────────────────────────────────┐
               │                    INTERNET                      │
               └──────────┬────────────────────┬─────────────────┘
                          │                    │
                  ┌───────▼───────┐    ┌───────▼───────┐
                  │  MAX Platform │    │   Пользователь │
                  │ platform-api  │    │   (MAX App)    │
                  │   .max.ru     │    │                │
                  └───────┬───────┘    └───────┬────────┘
                          │                    │
         webhook POST     │      Mini App      │ (WebView)
         /api/webhook     │      HTML/JS       │
                          │                    │
               ┌──────────▼────────────────────▼─────────────────┐
               │              Vercel (fra1)                        │
               │                                                   │
               │  ┌──────────────┐  ┌──────────────┐              │
               │  │ api/webhook  │  │ miniapp/     │  Static      │
               │  │ (Serverless) │  │ (Vite SPA)   │  Deploy      │
               │  └──────┬───────┘  └──────┬───────┘              │
               │         │                 │                       │
               │  ┌──────▼───────┐  ┌──────▼───────┐              │
               │  │ api/cron-*   │  │ api/miniapp-*│              │
               │  │ (4 cron jobs)│  │ (4 endpoints)│              │
               │  └──────┬───────┘  └──────┬───────┘              │
               │         │                 │                       │
               │  ┌──────▼─────────────────▼───────┐              │
               │  │          src/ (shared)          │              │
               │  │  handlers, db, ai, services     │              │
               │  └──────────────┬──────────────────┘              │
               └─────────────────┼─────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Supabase (moonvit-hub)│
                    │   PostgreSQL + Auth     │
                    │   Project: zcqkyuumop.. │
                    │   Plan: PRO             │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     OpenAI API          │
                    │  GPT-4.1 (Vision)       │
                    │  GPT-4.1-mini (Chat)    │
                    │  Whisper (Voice)        │
                    └─────────────────────────┘
```

### 1.2 Vercel Deployments (3 проекта)

| Проект | URL | Назначение |
|--------|-----|-----------|
| **nutri-bot** | nutri-bot-smoky.vercel.app | Бот (webhook + cron + miniapp API) |
| **admin** | admin-seven-navy-91.vercel.app | Админ-панель (React SPA) |
| **miniapp** | miniapp-chi-vert.vercel.app | Мини-приложение (React SPA) |

### 1.3 Vercel Serverless Functions

| Endpoint | Метод | Описание | MaxDuration |
|----------|-------|----------|-------------|
| `/api/webhook` | POST | Главный webhook MAX | 60s |
| `/api/health` | GET | Health check | 60s |
| `/api/privacy` | GET | Политика конфиденциальности | 60s |
| `/api/cron-reminders` | GET | Утренние напоминания (6:00 UTC) | 60s |
| `/api/cron-evening` | GET | Вечерний итог дня | 60s |
| `/api/cron-broadcast` | GET | Рассылки контента | 60s |
| `/api/cron-reset` | GET | Сброс дневных счётчиков | 60s |
| `/api/miniapp-auth` | POST | Авторизация мини-приложения | 60s |
| `/api/miniapp-water` | POST | +/- стакан воды | 60s |
| `/api/miniapp-add-food` | POST | Добавить еду текстом (AI) | 60s |
| `/api/miniapp-delete-food` | POST | Удалить запись еды | 60s |

### 1.4 Environment Variables

| Переменная | Где используется | Описание |
|-----------|-----------------|----------|
| `MAX_BOT_TOKEN` | webhook, miniapp-auth | Токен бота MAX |
| `OPENAI_API_KEY` | ai/client.ts | Ключ OpenAI |
| `SUPABASE_URL` | db/supabase.ts | URL Supabase |
| `SUPABASE_SERVICE_KEY` | db/supabase.ts | Service role key |
| `SUPABASE_ANON_KEY` | miniapp, admin | Публичный ключ |
| `WEBHOOK_URL` | config.ts | URL для регистрации webhook |
| `ADMIN_PASSWORD` | config.ts | Пароль админки (moonvit2026) |
| `CRON_SECRET` | cron-*.ts | Bearer token для cron jobs |
| `FREE_TRIAL_DAYS` | subscriptions.ts | Дни триала (30) |

### 1.5 Стек технологий

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Runtime | Node.js (Vercel Serverless) | 20.x |
| Язык | TypeScript | 5.7+ |
| БД | Supabase PostgreSQL (PRO) | — |
| AI | OpenAI GPT-4.1 / GPT-4.1-mini / Whisper | — |
| Bot Platform | MAX (platform-api.max.ru) | — |
| Miniapp Frontend | React + Vite | 19 / 6 |
| Admin Frontend | React + Vite + Tailwind CSS | 18 / 6 / 3 |
| Image Processing | Sharp, @resvg/resvg-js, gifenc | — |
| QR | jsqr | 1.4 |
| PDF | pdf-parse | 1.1 |
| Tests | Vitest | 3.0 |

---

## 2. ПОЛНАЯ СХЕМА РАБОТЫ БОТА

### 2.1 Входная точка: webhook

```
MAX Platform → POST /api/webhook
  │
  ├── Payload validation (isValidUpdate)
  ├── Idempotency check (isDuplicateUpdate — LRU по update_id)
  ├── Rate limiting (isRateLimited — 30 req/min per user_id)
  │
  └── for each update:
        routeUpdate(update)
```

### 2.2 Router (src/handlers/router.ts) — главная логика маршрутизации

```
routeUpdate(update)
│
├── update_type === "bot_started"
│   ├── findUserByMaxId() || createUser() (upsert)
│   └── handleCommand(user, "/start", chatId)
│
├── update_type === "message_callback"
│   ├── findUserByMaxId() || createUser()
│   └── handleCallback(user, cb)
│
└── update_type === "message_created"
    ├── findUserByMaxId() || createUser()
    ├── updateUser(last_active_at)
    │
    ├── [ATTACHMENT: contact] → phone sharing
    │   ├── step 0 (onboarding) → handlePhoneFirst()
    │   └── completed + phone → activate trial
    │
    ├── [ATTACHMENT: audio] → handleVoice(user, chatId, audioUrl)
    │   └── Whisper transcription → handleChat()
    │
    ├── [ATTACHMENT: file]
    │   ├── .jpg/.png → food/lab photo handler
    │   └── .pdf → handleLabDocument()
    │
    ├── [ATTACHMENT: video] → "видео пока не поддерживаем"
    ├── [ATTACHMENT: sticker] → шутка
    ├── [ATTACHMENT: share] → игнор
    │
    ├── [ATTACHMENT: image]
    │   ├── context_state = awaiting_weight_correction → reset, food photo
    │   ├── context_state = awaiting_qr → handleQrPhoto()
    │   ├── context_state = awaiting_lab → handleLabPhoto()
    │   ├── context_state = awaiting_restaurant_menu → handleRestaurantMenu()
    │   ├── context_state = awaiting_recipe_photo → analyze + suggest recipes
    │   ├── onboarding step 0 → "сначала поделись телефоном"
    │   └── DEFAULT → handleFoodPhoto()
    │
    └── [TEXT]
        ├── starts with "/" → handleCommand()
        ├── context_state = awaiting_food_text → handleFoodText()
        ├── context_state = awaiting_mealplan_request → handleMealPlan()
        ├── context_state = awaiting_deepcheck_request → handleDeepConsultCustom()
        ├── context_state = awaiting_recipe_request → handleRecipesCustom()
        ├── context_state = awaiting_weight_correction → handleWeightCorrection()
        ├── context_state starts with "editing_" → handleProfileEdit()
        ├── onboarding not completed → handleOnboardingStep()
        ├── detectIntent(text) → route to matching command
        └── DEFAULT → handleChat() (AI чат)
```

### 2.3 Команды бота

| Команда | Описание | Доступ |
|---------|----------|--------|
| `/start` | Главное меню / запуск онбординга | Все |
| `/profile` | Профиль + дневные нормы КБЖУ | После онбординга |
| `/editprofile` | Редактирование профиля по полям | После онбординга |
| `/today` | Дневник за сегодня с прогресс-барами | После онбординга |
| `/week` | Недельная статистика + сравнение с прошлой | После онбординга |
| `/stats` | Личная статистика (streak, logs count) | После онбординга |
| `/water` | +1 стакан воды (атомарный RPC increment) | Все |
| `/vitamins` | Витаминный баланс за день | После онбординга |
| `/mealplan` | Генерация плана питания (AI) | Trial/Premium |
| `/recipes` | Рецепты под профиль (AI) | Trial/Premium |
| `/deepcheck` | 4-агентная глубокая консультация | Trial/Premium |
| `/lab` | Начать приём фото анализов крови | Trial/Premium |
| `/subscribe` | Статус подписки + как получить QR | Все |
| `/invite` | Реферальная ссылка | Все |
| `/help` | Список всех команд + disclaimer | Все |
| `/deletedata` | Удаление всех данных (152-ФЗ GDPR) | Все |
| `/reset` | Очистка истории сообщений | Все |

### 2.4 Callback payloads (inline-кнопки)

| Payload | Действие |
|---------|----------|
| `action_food` | Запрос фото еды |
| `action_today` | /today |
| `action_week` | /week |
| `action_water` | /water |
| `action_vitamins` | /vitamins |
| `action_recipes` | /recipes |
| `action_mealplan` | /mealplan |
| `action_deep` | /deepcheck → выбор типа |
| `action_lab` | /lab |
| `action_restaurant` | Фото меню ресторана |
| `action_profile` | /profile |
| `action_more` | Подменю "Ещё" |
| `action_menu` | Главное меню |
| `action_subscribe` | /subscribe |
| `action_promo` | Ввести промокод |
| `action_allergy` | Редактировать аллергии |
| `action_invite` | /invite |
| `action_reminders` | Настройки напоминаний |
| `action_qr` | Сканировать QR |
| `action_stats` | /stats |
| `action_help` | /help |
| `confirm_food` | Сохранить результат анализа фото |
| `cancel_food` | Отменить результат |
| `edit_weight_food` | Изменить вес порции |
| `confirm_delete` | Подтвердить удаление данных |
| `cancel_delete` | Отмена удаления |
| `deep_diet` / `deep_vitamins` / `deep_lab` / `deep_progress` / `deep_full` / `deep_custom` | Типы deepcheck |
| `sex_male` / `sex_female` | Пол (онбординг / редактирование) |
| `goal_lose` / `goal_maintain` / `goal_gain` / `goal_healthy` / `goal_sport` / `goal_custom` | Цель |
| `activity_sedentary` ... `activity_very_active` | Уровень активности |

### 2.5 Онбординг (Phone-First Flow)

```
Шаг 0: Приветствие (AI или из настроек) + welcome card
        → request_contact (кнопка "Поделиться номером")
        → Пользователь делится телефоном
        → handlePhoneFirst(): phone → DB, trial activated, step = 1

Шаг 1: Имя
        → Если MAX-профиль имеет имя → "Тебя зовут {name}?" (кнопки confirm/change)
        → Иначе → "Как тебя зовут?"

Шаг 2: Пол
        → Inline-кнопки: 👨 Мужской / 👩 Женский

Шаг 3: Возраст
        → Текстовый ввод (число или русское числительное "двадцать пять")
        → Валидация: 14-120

Шаг 4: Рост
        → Текстовый ввод (см)
        → Валидация: 100-250

Шаг 5: Вес
        → Текстовый ввод (кг)
        → Валидация: 30-250

Шаг 6: Цель
        → Inline-кнопки: 📉 Похудеть / ⚖️ Поддержать / 📈 Набрать
                          🥗 Здоровое питание / 💪 Спорт
                          ✍️ Написать свою

Шаг 7: finishOnboarding()
        → calculateMacros() (Mifflin-St Jeor + activity)
        → Сохранение daily_calories/protein/fat/carbs
        → onboarding_completed = true
        → context_state = "idle"
        → Сообщение с результатами + главное меню
```

### 2.6 Flow: Фото еды

```
Пользователь отправляет фото
  │
  ├── canUseFeature(user, 'photo')?
  │   ├── NO + needsPhoneSharing → "Бесплатные анализы закончились" + phone button
  │   └── NO → "Лимит исчерпан на сегодня"
  │
  ├── sendMessage("Анализирую...") — fire-and-forget
  │
  ├── analyzeFoodPhoto(imageUrl)
  │   └── visionAnalysis(FOOD_PROMPT, imageUrl, "gpt-4.1")
  │       → JSON: { items: [{name, portion_g, calories, protein, fat, carbs}],
  │                  total: {calories, protein, fat, carbs},
  │                  micronutrients: {...},
  │                  comment: "..." }
  │
  ├── Если нет micronutrients → lookupNutrients() из nutri_nutrient_db
  │
  ├── deleteUnconfirmedLogs(user.id) — удалить предыдущие неподтверждённые
  │
  ├── saveFoodLog(user.id, {..., confirmed: false})
  │
  ├── saveMessage(user.id, "assistant", msg, tokens)
  │
  ├── updateUser(photos_today++, free_analyses_used++)
  │
  └── sendMessage(result, confirmFood())
        │
        ├── [✅ Сохранить] → confirmFoodLog(id) → confirmed: true
        │   → updateStreak() → streak message if milestone
        │   → smartRepliesAfterFood() keyboard
        │
        ├── [⚖️ Изменить вес] → context_state = "awaiting_weight_correction"
        │   → Пользователь вводит "куриная грудка 300г"
        │   → AI пересчитывает → новый saveFoodLog
        │
        └── [❌ Отмена] → deleteFoodLog(id)
```

### 2.7 Flow: AI Chat

```
Текст (без команды/интента)
  │
  ├── canUseFeature(user, 'chat')?
  │   └── NO → "Лимит сообщений" + subscribe button
  │
  ├── getConversationContext(user.id, 10 messages)
  │
  ├── Build system prompt:
  │   - Base persona (Бендер + Лебедев стиль)
  │   - User profile (age, sex, goal, allergies, chronic)
  │   - Guard rails (РПП, <18, медицинские)
  │   - Today's food diary summary
  │   - Moonvit product mentions (every 5th message)
  │
  ├── chatCompletion(messages, "gpt-4.1-mini")
  │
  ├── saveMessage(user, 'user', text)
  │   saveMessage(user, 'assistant', response)
  │
  ├── incrementMessagesToday(user.id)
  │
  └── sendMessage(response, mainMenu())
```

### 2.8 Flow: Deepcheck (4 AI-агента)

```
/deepcheck или action_deep
  │
  ├── Выбор типа: diet / vitamins / lab / progress / full / custom
  │
  ├── Сбор данных:
  │   - Profile (age, sex, goal, weight, height, allergies, chronic)
  │   - Last 7 days food logs
  │   - Lab results (if any)
  │   - Today's vitamin totals
  │
  ├── Agent 1: Диетолог-аналитик
  │   → Анализ баланса КБЖУ, пищевые привычки
  │
  ├── Agent 2: Нутрициолог
  │   → Витамины, минералы, дефициты, рекомендации продуктов Moonvit
  │
  ├── Agent 3: Врач-терапевт
  │   → Интерпретация лаб. анализов, противопоказания
  │
  ├── Agent 4: Фитнес-коуч
  │   → Прогресс к цели, рекомендации по активности
  │
  ├── Final synthesis: объединение 4 отчётов
  │
  ├── saveDeepConsult(user.id, agents_input, agents_output, final_report)
  │
  └── sendMessage(final_report, mainMenu())
      (разбит на части если > 3800 символов)
```

---

## 3. БАЗА ДАННЫХ (Supabase PostgreSQL)

### 3.1 Схема таблиц

#### nutri_users (главная таблица пользователей)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
max_user_id     bigint UNIQUE NOT NULL     -- MAX platform user ID
max_chat_id     bigint                      -- MAX chat ID
name            text
phone           text                        -- зашифрован (152-ФЗ)
age             integer
sex             text CHECK (sex IN ('male', 'female'))
height_cm       integer
weight_kg       numeric
goal            text                        -- lose/maintain/gain/healthy/sport/custom
goal_text       text                        -- свободный текст цели
activity_level  text                        -- sedentary/light/moderate/active/very_active
allergies       text[] DEFAULT '{}'
chronic         text[] DEFAULT '{}'
diet_pref       text
daily_calories  integer
daily_protein   integer
daily_fat       integer
daily_carbs     integer
onboarding_step integer DEFAULT 0
onboarding_completed boolean DEFAULT false
context_state   text DEFAULT 'idle'         -- FSM state machine
subscription_type text DEFAULT 'free'       -- free/trial/premium
trial_started_at timestamptz
premium_until   timestamptz
messages_today  integer DEFAULT 0
photos_today    integer DEFAULT 0
free_analyses_used integer DEFAULT 0        -- total free photo analyses
water_glasses   integer DEFAULT 0
water_norm      integer DEFAULT 8
streak_days     integer DEFAULT 0
last_food_date  date
last_active_at  timestamptz DEFAULT now()
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### nutri_food_logs (дневник еды)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES nutri_users(id)
photo_url       text                        -- URL фото в MAX CDN
description     text                        -- "Овсянка с ягодами"
calories        integer
protein         integer
fat             integer
carbs           integer
ai_analysis     jsonb                       -- полный ответ AI:
  -- {
  --   items: [{name, portion_g, calories, protein, fat, carbs}],
  --   total: {calories, protein, fat, carbs},
  --   micronutrients: {vitamin_a: 300, iron: 2.5, ...},
  --   comment: "Отличный завтрак!"
  -- }
confirmed       boolean DEFAULT false       -- подтверждён пользователем
created_at      timestamptz DEFAULT now()
```

#### nutri_messages (история AI-чата)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES nutri_users(id)
role            text NOT NULL               -- user/assistant/system
content         text NOT NULL
tokens_used     integer
created_at      timestamptz DEFAULT now()
```

#### nutri_lab_results (анализы крови)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES nutri_users(id)
photo_url       text
parsed_data     jsonb                       -- распознанные показатели
ai_interpretation text                      -- AI интерпретация
deficiencies    text[] DEFAULT '{}'         -- найденные дефициты
recommendations jsonb                       -- рекомендации + Moonvit products
created_at      timestamptz DEFAULT now()
```

#### nutri_deep_consults (глубокие консультации)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES nutri_users(id)
agents_input    jsonb                       -- входные данные для агентов
agents_output   jsonb                       -- выходы 4 агентов
final_report    text                        -- итоговый отчёт
created_at      timestamptz DEFAULT now()
```

#### nutri_qr_codes (QR-коды Moonvit)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
code            text UNIQUE NOT NULL        -- MV-MENS-MULTI-ABC12345
sku             text NOT NULL               -- продукт moonvit
activated_by    uuid REFERENCES nutri_users(id)
activated_at    timestamptz
batch_id        text
created_at      timestamptz DEFAULT now()
```

#### nutri_promo_codes (промокоды)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
code            text UNIQUE NOT NULL
days            integer DEFAULT 7           -- дней premium
max_uses        integer DEFAULT 1
used_count      integer DEFAULT 0
expires_at      timestamptz
created_at      timestamptz DEFAULT now()
```

#### nutri_settings (глобальные настройки)
```sql
key             text PRIMARY KEY
value           text
description     text
updated_at      timestamptz DEFAULT now()
```

Ключи настроек:
- `ai_model_chat` — модель для чата (gpt-4.1-mini)
- `ai_model_vision` — модель для фото (gpt-4.1)
- `config_ai_temperature` — температура (0.7)
- `config_ai_max_completion_tokens` — макс токенов (2048)
- `config_ai_top_p` — top_p (1.0)
- `config_ai_frequency_penalty` — frequency penalty (0.0)
- `config_ai_presence_penalty` — presence penalty (0.0)
- `prompt_greeting` — кастомное приветствие
- `prompt_greeting_ai` — промпт для генерации приветствия
- `prompt_system_chat` — системный промпт чата
- `bot_menu_config` — JSON конфигурация меню
- `config_welcome_image_url` — URL картинки приветствия

#### nutri_products (продукты Moonvit)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug            text UNIQUE NOT NULL        -- mens-multi, womens-complex, etc
name            text NOT NULL
description_md  text
composition     jsonb                       -- состав
talking_points_md text                      -- рекламные тезисы
key_ingredients text[] DEFAULT '{}'
targets         text[] DEFAULT '{}'         -- целевые дефициты
usps            text[] DEFAULT '{}'         -- уникальные преимущества
audiences       text[] DEFAULT '{}'         -- целевые аудитории
active          boolean DEFAULT true
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### Прочие таблицы

| Таблица | Описание |
|---------|----------|
| `nutri_funnel_events` | Воронка: onboarding_start, phone_shared, first_photo, etc |
| `nutri_referrals` | Реферальная система (referrer_id → referred_id) |
| `nutri_ai_metrics` | AI метрики: model, operation, tokens_in/out, response_time |
| `nutri_nutrient_db` | База нутриентов (41 продукт, витамины + минералы) |
| `nutri_deficiency_map` | Маппинг дефицит → Moonvit SKU (14 записей) |
| `nutri_user_preferences` | Настройки напоминаний (morning_time, evening_time, enabled) |
| `nutri_deletion_log` | Лог GDPR-удалений (без ПД) |
| `nutri_error_log` | Лог ошибок (context, message, metadata) |
| `nutri_ab_tests` | A/B тесты |

### 3.2 RPC Functions (PostgreSQL)

```sql
-- Атомарный инкремент воды (решает race condition)
increment_water(user_uuid uuid) → integer
  -- UPDATE nutri_users SET water_glasses = water_glasses + 1
  --   WHERE id = user_uuid RETURNING water_glasses

-- Атомарный инкремент любого поля
increment_field(user_uuid uuid, field_name text) → void
```

### 3.3 Логика сохранения данных

**Создание пользователя:**
```
MAX webhook → findUserByMaxId(max_user_id)
  → НЕТ → createUser() — UPSERT с onConflict: 'max_user_id'
  → ДА → возвращает существующего
```

**Запись еды (из бота):**
```
Фото → AI анализ → saveFoodLog(confirmed: FALSE)
  → Пользователь нажимает ✅ → confirmFoodLog(id) → confirmed: TRUE
  → Пользователь нажимает ❌ → deleteFoodLog(id)
  → При новом фото → deleteUnconfirmedLogs() (удалить старые неподтверждённые)
```

**Запись еды (из miniapp):**
```
Текст описания → AI анализ → saveFoodLog(confirmed: TRUE)
  — В miniapp нет этапа подтверждения
```

**Подписки:**
```
FREE → 10 фото total, 10 сообщений/день
TRIAL → 3 фото/день, безлимит чат, deepcheck (30 дней после phone share)
PREMIUM → 20 фото/день, безлимит, lab, deepcheck (QR или промокод, 30 дней)

Переходы:
  free → trial: phone sharing (onboarding step 0)
  free → premium: QR-код или промокод
  trial → premium: QR-код или промокод
  premium → free: premium_until expired
  trial → free: 30 дней прошло
```

**Ежедневный сброс (cron-reset):**
```
UPDATE nutri_users SET messages_today = 0, photos_today = 0, water_glasses = 0
  WHERE messages_today > 0 OR photos_today > 0 OR water_glasses > 0
```

**Streak:**
```
При confirmFoodLog:
  last_food_date === today → ничего
  last_food_date === yesterday → streak + 1
  иначе → streak = 1

  Milestone сообщения: 3, 7, 14, 30 дней, каждые 10
```

---

## 4. МИНИ-ПРИЛОЖЕНИЕ (miniapp)

### 4.1 Архитектура

```
miniapp-chi-vert.vercel.app
  │
  ├── index.html (загружает max-web-app.js SDK)
  ├── React SPA (Vite build)
  │
  ├── useMAXBridge() hook
  │   └── window.WebApp (MAX WebApp Bridge)
  │       - initData (подписанные данные пользователя)
  │       - HapticFeedback
  │       - BackButton
  │       - ready() / close() / expand()
  │
  ├── При запуске:
  │   ├── bridge.initData есть? → authenticate(initData)
  │   │   └── POST /api/miniapp-auth
  │   │       → HMAC validation
  │   │       → Return: user + logs + vitamins + week + norms + lab_results
  │   │
  │   └── Нет bridge? → MOCK данные (dev mode)
  │
  └── 5 табов:
      ├── Сегодня (DailyProgress + VitaminChart + Recommendations)
      ├── Дневник (FoodDiary + MealDetail modal + AddFoodForm)
      ├── Неделя (WeeklyReport)
      ├── Витамины (VitaminsPage)
      └── Профиль (ProfileCard)
```

### 4.2 Компоненты

| Компонент | Описание | Данные |
|-----------|----------|--------|
| `App.tsx` | Root: auth, routing, state management | AuthResponse |
| `DailyProgress` | Солнечная система КБЖУ + вода + streak | logs, target, water |
| `SolarSystem` | SVG анимация орбит (ккал/Б/Ж/У кольца) | calories, protein, fat, carbs |
| `VitaminChart` | Горизонтальные бары витаминов (% от нормы) | VitaminData[] |
| `VitaminsPage` | Полная страница витаминов + лаб. результаты | vitamins, norms, lab_results |
| `FoodDiary` | Список приёмов пищи по дням | logs[] |
| `MealDetail` | Модалка: состав блюда, микронутриенты | FoodLog |
| `AddFoodForm` | Ввод еды текстом (отправка в AI) | — |
| `WeeklyReport` | 7-дневный график + средние | WeekDay[] |
| `ProfileCard` | Имя, возраст, цель, нормы | UserProfile |
| `Recommendations` | AI-рекомендации по дефицитам | vitamins, norms |
| `LoadingScreen` | Лоадинг при авторизации | — |

### 4.3 API мини-приложения

**Авторизация:**
```
POST /api/miniapp-auth
Body: { initData: "query_id=...&user=...&auth_date=...&hash=..." }

→ HMAC validation (secret = SHA256("WebAppData" + bot_token))
→ Extract user_id from initData
→ Find user in DB
→ Return:
  {
    ok: true,
    user: { id, name, sex, age, ... , water_glasses, streak_days },
    logs: [{ id, description, calories, protein, fat, carbs, photo_url, micronutrients, items, comment }],
    today_vitamins: { vitamin_a: 300, iron: 8, ... },
    week: [{ date, calories, protein, fat, carbs, logged }],
    norms: { vitamin_a: { name, unit, daily }, ... },
    lab_results: [{ id, deficiencies, ai_interpretation }]
  }
```

**Вода (+/-):**
```
POST /api/miniapp-water
Body: { initData, delta: 1 | -1 }
→ Optimistic update в UI
→ Response: { ok, water_glasses, water_norm }
```

**Добавить еду текстом:**
```
POST /api/miniapp-add-food
Body: { initData, text: "Овсянка с бананом" }
→ AI анализ (gpt-4.1-mini) → JSON с items + total + micronutrients
→ saveFoodLog(confirmed: true)
→ Response: { ok, log: { id, description, calories, ... , micronutrients, items, comment } }
```

**Удалить еду:**
```
POST /api/miniapp-delete-food
Body: { initData, logId: "uuid" }
→ DELETE FROM nutri_food_logs WHERE id = logId AND user_id = user.id
→ Response: { ok }
```

### 4.4 Авторизация miniapp

```
MAX WebApp SDK → window.WebApp.initData
  │
  ├── Формат: query_id=...&user={json}&auth_date=...&hash=...
  │
  └── Валидация на сервере:
      1. Парсим URL params из initData
      2. Сортируем все параметры кроме hash
      3. Собираем data_check_string = "param1=value1\nparam2=value2\n..."
      4. secret_key = HMAC-SHA256("WebAppData", bot_token)
      5. Проверяем: HMAC-SHA256(secret_key, data_check_string) === hash
      6. Проверяем auth_date не старше 24 часов
```

### 4.5 State management (miniapp)

```
App.tsx:
  state: 'loading' | 'ready' | 'error'
  data: AuthResponse | null          — все данные с сервера
  page: 'today' | 'diary' | 'week' | 'vitamins' | 'profile'
  selectedLog: FoodLog | null        — для MealDetail модалки
  showAddFood: boolean               — для AddFoodForm модалки

Мутации (optimistic updates):
  handleWaterChange(delta) → instant UI update → POST /api/miniapp-water
  handleDeleteFood(logId)  → instant remove from UI → POST /api/miniapp-delete-food
  handleAddFood(text)      → loading → POST /api/miniapp-add-food → add to logs
```

---

## 5. MAX PLATFORM API

### 5.1 Endpoints используемые ботом

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/messages?chat_id={id}` | Отправить сообщение |
| POST | `/answers` | Ответить на callback (inline button) |
| POST | `/subscriptions` | Зарегистрировать webhook |
| POST | `/uploads?type=image` | Запросить URL для загрузки |
| PATCH | `/me` | Обновить commands бота |

### 5.2 Формат отправки сообщений

```json
{
  "text": "Текст сообщения (markdown)",
  "format": "markdown",
  "attachments": [
    {
      "type": "inline_keyboard",
      "payload": {
        "buttons": [
          [
            { "type": "callback", "text": "Кнопка", "payload": "action_food" }
          ]
        ]
      }
    }
  ]
}
```

### 5.3 Загрузка изображений (3 шага)

```
1. POST /uploads?type=image → { url, token }
2. POST {url} (multipart/form-data, file in 'data' field) → { photos: { [key]: { token } } }
3. Pause 500ms (MAX needs processing time)
4. Attach: { type: "image", payload: { token } }
```

### 5.4 Запрос контакта (телефон)

```json
{
  "text": "Поделись номером...",
  "attachments": [{
    "type": "inline_keyboard",
    "payload": {
      "buttons": [[
        { "type": "request_contact", "text": "Поделиться номером телефона" }
      ]]
    }
  }]
}
```

Ответ приходит как `message_created` с `attachment.type = "contact"`:
```
payload.vcfPhone || payload.tampiPhone || payload.vcf_info.phone || payload.phone
```

---

## 6. AI МОДЕЛИ И ПРОМПТЫ

### 6.1 Модели

| Задача | Модель | Temperature | Max Tokens |
|--------|--------|-------------|------------|
| Фото еды | gpt-4.1 (Vision) | 0.3 | 2000 |
| AI-чат | gpt-4.1-mini | 0.7 (настраиваемая) | 2048 (настраиваемый) |
| Deepcheck (4 агента) | gpt-4.1 | 0.7 | 2048 |
| Голосовые | Whisper → gpt-4.1-mini | — | — |
| Добавление еды текстом (miniapp) | gpt-4.1-mini | 0.7 | 2048 |

### 6.2 AI Metrics Tracking

Каждый вызов AI записывается в `nutri_ai_metrics`:
```
{ userId, model, operation, tokensIn, tokensOut, responseTimeMs }
```

### 6.3 Guard Rails

- **Возраст < 18**: смягчённый тон, без акцента на калориях
- **РПП (eating disorder)**: фокус на нутриентах, бережный тон
- **Медицинские**: не даёт диагнозов, рекомендует врача
- **Лимит символов**: текст обрезается до 3800 (MAX API limit)

---

## 7. ПОДПИСКИ И МОНЕТИЗАЦИЯ

### 7.1 Тарифная сетка

| Тариф | Фото/день | Чат/день | Deepcheck | Lab | Как получить |
|-------|-----------|----------|-----------|-----|-------------|
| Free | 10 total | 10 msg | Нет | Нет | По умолчанию |
| Trial | 3/day | Безлимит | Да (30 дн) | Нет | Phone sharing |
| Premium | 20/day | Безлимит | Да (14-day cd) | Да | QR-код / промокод |

### 7.2 QR-активация

```
Формат: MV-{SKU}-{SERIAL}  (например MV-MENS-MULTI-ABC12345)

Flow:
1. Пользователь нажимает "QR-код" → context_state = "awaiting_qr"
2. Отправляет фото → handleQrPhoto():
   - jsqr декодирует QR → извлекает код
   - Проверка в nutri_qr_codes: существует? не использован?
   - activateQrCode(): premium_until = now + 30 days
   - Маркируем QR: activated_by, activated_at
```

### 7.3 Продукты Moonvit (6 SKU)

Хранятся в `nutri_products`, привязаны к дефицитам через `nutri_deficiency_map`:
- При deepcheck/lab: найден дефицит → рекомендация продукта
- В чате: каждое 5-е сообщение содержит mention Moonvit
- В витаминном отчёте: подсветка дефицитов + ссылки на продукты

---

## 8. CRON JOBS

| Job | Расписание | Описание |
|-----|-----------|----------|
| `cron-reminders` | 6:00 UTC | Персонализированные утренние напоминания |
| `cron-evening` | 20:00 UTC | Вечерний итог дня (прогресс-бары КБЖУ) |
| `cron-broadcast` | 3x/week | Рассылки полезного контента (28 шаблонов) |
| `cron-reset` | 0:00 UTC | Сброс daily counters (messages, photos, water) |

Авторизация: `Authorization: Bearer {CRON_SECRET}` header.

---

## 9. CONTEXT_STATE FSM (Finite State Machine)

Поле `context_state` в `nutri_users` управляет поведением роутера:

```
idle (по умолчанию)
  │
  ├── "awaiting_qr"                 → следующее фото = QR
  ├── "awaiting_lab"                → следующее фото = анализы
  ├── "awaiting_restaurant_menu"    → следующее фото = меню ресторана
  ├── "awaiting_recipe_photo"       → следующее фото = продукты для рецепта
  ├── "awaiting_food_text"          → следующий текст = описание еды
  ├── "awaiting_mealplan_request"   → следующий текст = запрос на план
  ├── "awaiting_deepcheck_request"  → следующий текст = кастомный deepcheck
  ├── "awaiting_recipe_request"     → следующий текст = кастомный рецепт
  ├── "awaiting_weight_correction"  → следующий текст = коррекция веса порции
  ├── "editing_name"                → следующий текст = новое имя
  ├── "editing_age"                 → следующий текст = новый возраст
  ├── "editing_height"              → следующий текст = новый рост
  ├── "editing_weight"              → следующий текст = новый вес
  ├── "editing_sex"                 → следующий callback = пол
  ├── "editing_goal"                → следующий callback = цель
  ├── "editing_allergies"           → следующий текст = аллергии
  └── "editing_chronic"             → следующий текст = хронические
```

---

## 10. БЕЗОПАСНОСТЬ

| Мера | Реализация |
|------|-----------|
| Rate limiting | 30 req/min per user_id (LRU map) |
| Idempotency | Дедупликация update_id (LRU 5000) |
| Input sanitization | sanitizeUserInput, sanitizePhone, sanitizeDisplayName |
| 152-ФЗ | Шифрование ПД, /deletedata, deletion log |
| HMAC validation | miniapp initData validation |
| Security headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection |
| Path traversal | sanitizeFilePath |
| Secrets | Все в env vars, ноль hardcoded |
| CORS | miniapp endpoints: Access-Control-Allow-Origin: * |

---

## 11. ADMIN PANEL

URL: `admin-seven-navy-91.vercel.app` (пароль: moonvit2026)

### Страницы:

| Страница | Функции |
|----------|---------|
| Dashboard | Обзор: юзеры, сообщения, конверсии, DAU |
| Users | Список пользователей, фильтр по подписке |
| Analytics | DAU/MAU, AI метрики, retention когорты |
| Settings | AI модели, температура, промпты, приветствие, welcome image |
| Prompts | Редактирование системных промптов |
| Vitamins | CRUD продуктов Moonvit |
| QR Codes | Генерация и управление QR-кодами |
| Broadcasts | Ручные рассылки контента |
| BotMenu | Настройка inline-клавиатуры бота |
| Logs | Логи вебхуков и ошибок |
| Error Logs | Отфильтрованные ошибки |

---

## 12. ИЗВЕСТНЫЕ ПРОБЛЕМЫ И NEXT STEPS

### Пофикшенные баги (из 30-агентной симуляции):
- ROOT-A: User duplication → upsert + maybeSingle
- ROOT-B: sendMessage before DB → fire-and-forget для "thinking"
- ROOT-C: /water race condition → atomic RPC
- BUG-D: context_state stuck → reset в finishOnboarding
- BUG-E: Возраст словом → словарь числительных
- BUG-F: Weight 300kg → лимит 250
- BUG-G: editprofile collision → strip onboarding_step

### Открытые задачи (P0-P2):
- P0: Голосовой ввод (voice.ts скрыт), activity level в онбординге, adaptive tone по возрасту
- P1: Weight tracker, "срыв recovery", shareable cards
- P2: Diet type, streak gamification (3+ блюд → промокод)
- Admin env: обновить на moonvit-hub Supabase
