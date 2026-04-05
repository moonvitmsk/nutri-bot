# NutriBot — Архитектура

## Обзор

NutriBot — AI-бот-нутрициолог для мессенджера MAX (платформа VK), бренд moonvit.

**Стек:** Node.js/TypeScript, Vercel Serverless (fra1), OpenAI GPT-4.1, Supabase PostgreSQL

## Схема модулей

```
api/
├── webhook.ts          — точка входа MAX webhook (POST /api/webhook)
├── health.ts           — healthcheck endpoint
├── cron-reminders.ts   — утренние/вечерние напоминания (персонализированные)
├── cron-evening.ts     — вечерний итог дня
├── cron-broadcast.ts   — рассылки контента
├── cron-reset.ts       — сброс дневных счётчиков
├── privacy.ts          — политика конфиденциальности
└── test.ts             — тестовый endpoint

src/
├── handlers/           — обработка сообщений
│   ├── router.ts       — главный роутер: bot_started → callback → message
│   ├── commands.ts     — /start /profile /today /week /stats /invite /water /help etc
│   ├── callbacks.ts    — inline-кнопки (confirm_food, action_*, reminders)
│   ├── onboarding.ts   — wow-first онбординг (фото → профиль)
│   ├── food-photo.ts   — анализ фото еды (Vision API → КБЖУ)
│   ├── chat.ts         — AI-чат (GPT-4.1-mini)
│   ├── voice.ts        — голосовые (Whisper → текст → chat)
│   ├── lab-results.ts  — анализ результатов крови (Vision)
│   ├── daily-summary.ts — вечерний итог с прогресс-барами
│   ├── deep-consult.ts — deepcheck (4 AI-агента)
│   ├── meal-plan.ts    — генерация плана питания
│   ├── intent-detector.ts — keyword-based intent detection
│   ├── qr-code.ts      — сканирование QR Moonvit
│   ├── document.ts     — PDF анализы
│   └── supplement-scan.ts — сканирование этикеток
│
├── ai/                 — OpenAI интеграция
│   ├── client.ts       — chatCompletion + visionAnalysis (с AI metrics tracking)
│   ├── vision.ts       — analyzeFoodPhoto (JSON mode)
│   ├── prompts.ts      — системные промпты (с guard rails: РПП, возраст)
│   ├── agents.ts       — deepcheck агенты
│   └── context.ts      — контекст разговора
│
├── db/                 — Supabase операции
│   ├── supabase.ts     — клиент
│   ├── users.ts        — CRUD пользователей + GDPR deletion
│   ├── food-logs.ts    — дневник еды
│   ├── messages.ts     — история сообщений
│   ├── subscriptions.ts — freemium/trial/premium логика
│   ├── referrals.ts    — H-3: реферальная система
│   ├── analytics.ts    — J-1: funnel tracking
│   ├── ai-metrics.ts   — J-3: AI quality metrics
│   ├── settings.ts     — настройки из админки
│   └── products.ts     — продукты moonvit
│
├── services/           — бизнес-логика
│   ├── vitamin-tracker.ts — витаминный пайплайн (C-2)
│   ├── recipe-recommender.ts — рецепты с учётом аллергий
│   ├── quality-check.ts — проверка качества AI ответов
│   └── cache.ts        — M-1: LRU кеш с TTL
│
├── config/             — конфигурация
│   ├── moonvit-deficiency-map.ts — маппинг дефицитов → moonvit SKU + purchase URLs
│   ├── daily-norms-ru.ts — суточные нормы витаминов (РФ)
│   ├── ru-correction-factors.ts — коррекционные коэффициенты
│   └── broadcast-templates.ts — I-1: 28 шаблонов рассылок
│
├── max/                — MAX Platform API
│   ├── api.ts          — отправка сообщений, запрос контакта
│   ├── keyboard.ts     — inline-клавиатуры (main menu, smart replies, confirm)
│   └── types.ts        — типы MAX API
│
├── utils/              — утилиты
│   ├── nutrition.ts    — Mifflin-St Jeor, КБЖУ расчёт, прогресс-бары
│   ├── formatter.ts    — truncate, split, progress bar, disclaimer
│   ├── crypto.ts       — шифрование ПД
│   ├── logger.ts       — структурированный логгер
│   └── qr-decoder.ts   — декодирование QR
│
└── middleware/          — middleware
    └── rate-limit.ts   — rate limiting

admin/                  — React 18 + Vite + Tailwind CSS
├── src/pages/
│   ├── Dashboard.tsx   — обзор: юзеры, сообщения, конверсии
│   ├── Users.tsx       — управление пользователями
│   ├── Analytics.tsx   — DAU/MAU, AI метрики, retention когорты
│   ├── Prompts.tsx     — редактирование промптов
│   ├── Vitamins.tsx    — продукты moonvit
│   ├── QRCodes.tsx     — генерация QR-кодов
│   ├── Broadcasts.tsx  — рассылки
│   ├── Logs.tsx        — логи
│   └── BotMenu.tsx     — настройка меню бота
└── ...
```

## Таблицы Supabase

| Таблица | Описание |
|---------|----------|
| nutri_users | Профили пользователей (ПД зашифрованы) |
| nutri_food_logs | Дневник еды (фото, КБЖУ, микронутриенты) |
| nutri_messages | История AI-чата |
| nutri_lab_results | Результаты анализов крови |
| nutri_deep_consults | Глубокие консультации |
| nutri_funnel_events | J-1: Воронка онбординга |
| nutri_qr_codes | QR-коды под крышками moonvit |
| nutri_promo_codes | Промо-коды |
| nutri_referrals | H-3: Реферальная система |
| nutri_deletion_log | L-5: GDPR лог удалений |
| nutri_ai_metrics | J-3: Метрики AI вызовов |
| nutri_ab_tests | I-5: A/B тесты |
| nutri_nutrient_db | База нутриентов продуктов |
| nutri_user_preferences | Настройки напоминаний |
| nutri_settings | Глобальные настройки бота |
| nutri_products | Продукты moonvit |

## Подписки

| Тип | Лимиты | Как получить |
|-----|--------|-------------|
| Free | 10 фото, AI-чат с лимитом | По умолчанию |
| Trial | 30 дней безлимит | Шаринг телефона |
| Premium | Безлимит + lab + deepcheck | QR-код moonvit / промо / реферал |

## AI модели

| Задача | Модель | Токены |
|--------|--------|--------|
| Фото еды | gpt-4.1 (Vision) | ~2000 |
| AI-чат | gpt-4.1-mini | ~1500 |
| Deepcheck | gpt-4.1 (4 агента) | ~8000 |
| Онбординг (приветствие) | gpt-4.1-mini | ~500 |
| Голосовые | Whisper → gpt-4.1-mini | ~1500 |

## Guard Rails

- **Возраст < 18**: смягчённый тон, без акцента на калориях
- **РПП в анамнезе**: фокус на нутриентах, не на калориях, бережный тон
- **Медицинские**: не даёт диагнозов, рекомендует обратиться к врачу
- **Rate limiting**: по user_id и IP
- **152-ФЗ**: шифрование ПД, право на удаление (/deletedata)
