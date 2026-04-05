# NutriBot — HANDOFF из чата 5 (симуляция + багфиксы + переезд)

## Что было сделано

### 30-агентная симуляция (Opus 4.6 + 30× Sonnet 4.6)
- 30 виртуальных персон (15Ж+15М, возраст 19-65, 6 целей) симулировали 7 дней использования бота
- ~1650 реальных webhook-вызовов к production-боту
- 30 отчётов: `scripts/reports/persona_01.md` ... `persona_30.md`
- Сводный баг-репорт: `scripts/reports/DETAILED_BUG_EVIDENCE.md`
- Сводный UX: `scripts/reports/UX_ENGAGEMENT_SUMMARY.md`

### 7 багов найдено и пофикшено

| Bug | Файл | Фикс |
|-----|------|------|
| ROOT-A: User duplication под нагрузкой | src/db/users.ts | .maybeSingle() + upsert + error handling |
| ROOT-B: sendMessage до saveFoodLog | src/handlers/food-text.ts:29, food-photo.ts:26 | fire-and-forget для "thinking" messages |
| ROOT-C: /water race condition | src/handlers/commands.ts:206 | atomic RPC increment_water() |
| BUG-D: context_state stuck | src/handlers/onboarding.ts | context_state: 'idle' в finishOnboarding |
| BUG-E: Возраст словом | src/handlers/onboarding.ts:166 | словарь русских числительных |
| BUG-F: Weight 300 кг | src/handlers/onboarding.ts:199 | лимит 250 |
| BUG-G: editprofile step collision | src/handlers/onboarding.ts:584 | strip onboarding_step из updates |

### UX-исследование (3 batch × 10 персон)
- Средний engagement: 5.5/10
- ICP: женщины/мужчины 25-35, фото еды + AI chat
- Топ фичи: фото→КБЖУ (93%), /today (87%), AI chat (83%), /water (73%), /vitamins (67%)
- #1 missing feature: голосовой ввод (есть в коде voice.ts, но скрыт от юзеров)
- Conversion triggers: /deepcheck, /lab → Premium
- Тон Бендер+Лебедев: идеален для 22-35, отталкивает 50+ (5/30 потеряны)
- DAU прогноз: 70% Day 7, 50-60% Day 30

### Переезд на moonvit-hub
- Старый Supabase: zfihygjekrheimvrpdtp (sashaZDES) → НЕ используется
- Новый Supabase: zcqkyuumopnchwwpgjwn (moonvitmsk, PRO) ← ТЕКУЩИЙ
- Данные мигрированы: 39 settings, 6 products, 14 deficiency maps, 41 nutrients, 28 users
- SQL миграция: UNIQUE constraint + 2 RPC functions
- Vercel env обновлён, бот задеплоен, health check green

## Текущая инфраструктура

```
MAX Bot → Vercel (nutri-bot-smoky.vercel.app) → Supabase moonvit-hub (zcqkyuumopnchwwpgjwn)
Админка: admin-seven-navy-91.vercel.app (пароль moonvit2026)
Mini App: miniapp-chi-vert.vercel.app
Локально: D:\DX\nutri-bot\
```

## Supabase ключи (moonvit-hub)
- Project ID: zcqkyuumopnchwwpgjwn
- URL: https://zcqkyuumopnchwwpgjwn.supabase.co
- Anon key: (см. Vercel env / Claude memory)
- MCP: подключён через moonvitmsk org (Claude Code Supabase MCP)

## Приоритеты на следующий чат

### P0 — Engagement (поднять с 5.5 до 7+)
1. Кнопка "🎙 Голосом" в mainMenu (voice.ts уже есть)
2. Activity level в онбординге (спортсмены получают -500 ккал)
3. Adaptive tone по возрасту (мягче для 45+)

### P1 — Retention
4. Weight tracker (/weight + история)
5. "Срыв recovery" (мягкие сообщения вместо красных цифр)
6. Shareable cards (daily/weekly summary для шеринга)

### P2 — Monetization
7. Diet type в профиле (веган/вегетарианец → контекст для AI)
8. Streak gamification (3+ блюд → промокод Moonvit)

### Известные проблемы
- Админка (admin-seven-navy-91) всё ещё на старом Supabase — нужно обновить env
- GitHub: коммиты НЕ запушены (secrets в старых коммитах)
- Vercel Hobby plan: лимит 12 functions (test.ts исключён)
