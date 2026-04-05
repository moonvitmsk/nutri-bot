# План реализации на основе симуляции персон

## Критические фичи (реализуем в Блоке 3) — запросили 10+ персон

### 1. Emoji прогресс-бар в итогах дня — 14/15 персон — S
- Файлы: `src/utils/formatter.ts`, `src/handlers/daily-summary.ts`, `src/handlers/commands.ts`
- Добавить функцию `formatProgressBar(current, target)` → emoji-полоску
- Встроить в /today и вечерний итог
- Тесты: `tests/formatter.test.ts`

### 2. Ссылки на покупку moonvit — 12/15 персон — S
- Файлы: `src/config/moonvit-deficiency-map.ts`
- Добавить `purchase_url` к каждому SKU (WB deeplink)
- В `src/services/vitamin-tracker.ts` добавить ссылку в рекомендации
- Тесты: обновить существующие

### 3. Smart replies после анализа фото — 11/15 персон — S
- Файлы: `src/handlers/food-photo.ts`, `src/max/keyboard.ts`
- После сохранения записи — показать 3 inline-кнопки: «Итог дня», «Рецепт», «Выпить воды»
- Тесты: `tests/food-photo.test.ts`

### 4. Персонализация напоминаний — 12/15 персон — M
- Файлы: `src/handlers/daily-summary.ts` (или новый `src/handlers/reminders.ts`)
- Утренние: имя + мотивация по дню недели + напоминание по вчерашнему дефициту
- Вечерние: имя + emoji-итог + персональный совет

### 5. Реферальная система H-3 — 10/15 персон — M
- Новая таблица: `nutri_referrals`
- Файлы: `src/handlers/commands.ts` (команда /invite), `src/handlers/router.ts` (обработка refcode)
- Миграция: `supabase/migrations/003_nightshift_referrals.sql`
- Награда: +7 дней Premium обоим

### 6. GDPR полное удаление L-5 — 6/15 персон + закон — M
- Файлы: `src/db/users.ts` (расширить deleteUserData), `src/handlers/callbacks.ts`
- Новая таблица: `nutri_deletion_log`
- Миграция: `supabase/migrations/004_nightshift_deletion_log.sql`
- Удаление из ВСЕХ таблиц + лог

### 7. Команда /stats — 10/15 персон — S
- Файлы: `src/handlers/commands.ts`
- Личная статистика: дней активности, фото отправлено, средние КБЖУ, streak рекорд

## Важные фичи (Блок 4-5) — запросили 5-9 персон

### 8. E2E тесты K-5 — M
- Файлы: `tests/e2e/onboarding.test.ts`, `tests/e2e/food-photo.test.ts`, `tests/e2e/voice.test.ts`
- Эмуляция MAX webhook → полный цикл

### 9. Документация K-6 — M
- Файлы: `docs/ARCHITECTURE.md`, `docs/API.md`
- Схема модулей, все endpoints, JSDoc

### 10. AI метрики J-3 — M
- Новая таблица: `nutri_ai_metrics`
- Файлы: `src/ai/client.ts` — обёртка трекинга
- Миграция: `supabase/migrations/005_nightshift_ai_metrics.sql`

### 11. DAU/MAU/Messages графики E-4/J-4 — M
- Файлы: `admin/src/pages/Analytics.tsx`
- Добавить: DAU/WAU/MAU LineChart, Messages per day BarChart, Top intents PieChart

### 12. Guard rails промптов (РПП + возраст) — S
- Файлы: `src/ai/prompts.ts`
- Добавить проверку возраста (<18) → смягчённый тон, без калорий без контекста
- Добавить ED-safe mode: не акцентировать калории, фокус на нутриентах

### 13. Кеширование M-1 — S
- Файлы: новый `src/services/cache.ts`
- In-memory LRU с TTL (1ч для нутриентов, 5 мин для настроек)

### 14. A/B тесты приветствий I-5 — M
- Новая таблица: `nutri_ab_tests`
- 3 варианта в `nutri_settings`
- Рандомное назначение при bot_started

## Отложенные (нужны внешние ресурсы)

### 15. Shareable карточка недели — L — нужен canvas/image generation
### 16. Mini App F-3 — L — нужен фронтенд-ресурс
### 17. Партнёрские интеграции H-4 — M — нужны договоры с партнёрами
### 18. Экспорт CSV/PDF — M — нужна библиотека генерации PDF
