# NutriBot — Финальный отчёт

## Статус: ГОТОВ К ЗАПУСКУ

### URL-ы
| Компонент | URL |
|-----------|-----|
| Бот webhook | https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app/api/webhook |
| Админка | https://admin-sashazdes-gmailcoms-projects.vercel.app |
| Supabase | https://supabase.com/dashboard/project/zfihygjekrheimvrpdtp |

### Что сделано

**Ядро бота (28 файлов TypeScript)**
- Webhook endpoint на Vercel serverless
- MAX Bot API обёртка (правильный формат inline_keyboard + query params)
- 9 хендлеров: router, onboarding, commands, callbacks, food-photo, lab-results, deep-consult, qr-code, chat
- OpenAI интеграция: gpt-4.1 (чат), gpt-4.1 (Vision для фото еды и анализов)
- 4-агентная глубокая консультация (диетолог, здоровье, лайфстайл, составитель)
- Система подписок: free → trial (30 дней) → premium (QR под крышкой)
- QR-код декодирование через jsQR
- Расчёт КБЖУ (Mifflin-St Jeor)
- Онбординг 12 шагов (включая сбор телефона через request_contact)
- Подсчёт воды (команда /water, кнопка в меню)
- Streak дней с записью еды

**Админка (12 файлов React + Tailwind)**
- 6 страниц: Дашборд, Пользователи, Промпты, Витамины, QR-коды, Логи
- Glassmorphism дизайн: gradient borders, animated background, hover animations
- Дашборд: 9 метрик + топ вопросов + расход токенов
- Логин с паролем (moonvit2026)
- Полностью на русском языке

**Supabase (9 таблиц + 3 миграции)**
- nutri_users (с полями phone, water_glasses, streak_days)
- nutri_messages, nutri_food_logs, nutri_lab_results, nutri_deep_consults
- nutri_qr_codes, nutri_settings (7 промптов), nutri_moonvit_products (6 SKU)
- nutri_deficiency_map (14 маппингов дефицитов)

**Тесты**
- 15 тестов (Vitest): nutrition.ts + qr-decoder.ts — все пройдены

**Деплой**
- 7 env vars на Vercel (MAX_BOT_TOKEN, OPENAI_API_KEY, SUPABASE_URL/ANON/SERVICE, WEBHOOK_URL, ADMIN_PASSWORD)
- Webhook зарегистрирован в MAX API (success: true)
- SSO protection отключена для обоих проектов

**Маркетинг (agent в работе)**
- FAQ, инструкция, соцсети, email-рассылка, описание для MAX, кейс-стади, видео-скрипт

**Мультиагентная оценка (agent в работе)**
- 7 экспертов: клиент, маркетолог, UX, data, PO, юрист, SEO

### Что нужно от тебя
1. Написать боту в MAX — протестировать онбординг
2. Проверить промпты в админке — при необходимости подкрутить
3. Сгенерировать QR-коды через админку (QR-коды → Generate)
4. Решить по доменному имени (nutri.moonvit.ru?)

### Scheduled Tasks (durable)
| Время | Задача |
|-------|--------|
| 04:00 | nutribot-design — редизайн (уже выполнен) |
| 05:00 | nutribot-agents-review — экспертная оценка |
| 06:00 | nutribot-marketing — маркетинг-контент |
| 07:00 | nutribot-bot-improve — улучшения бота |
| 08:00 | nutribot-tests-security — тесты + безопасность |
| 09:00 | nutribot-final-check — финальная проверка |

### Roadmap
120 задач в 13 блоках — см. docs/ROADMAP_100.md
