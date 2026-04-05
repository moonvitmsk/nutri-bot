# NutriBot — HANDOFF из чата 2 (04.04.2026)

**Проект**: D:\DX\nutri-bot\
**Александр Герастовский** (CEO Moonvit, vibe-coder)
**Бот**: nutri-bot-smoky.vercel.app | **Админка**: admin-seven-navy-91.vercel.app
**Supabase**: zfihygjekrheimvrpdtp (moonvit) | **Vercel CLI**: sashazdes-8195

---

## ЧТО СДЕЛАНО В ЧАТЕ 2 (полный список)

### Блок 1: Конфигурируемые тексты бота
- `src/config/bot-messages.ts` — NEW: ~40 сообщений с дефолтами + `getMsg(key, vars?)`
- 10 handler-файлов обновлены — все захардкоженные строки заменены на `getMsg()`
- `featureLocked()` и `subscriptionExpired()` стали async
- Админка `Settings.tsx` — секция "Тексты бота" (5 групп, сворачиваемая, upsert)

### Блок 2: Онбординг — исправления
- **Цели**: 5 вариантов (lose/maintain/gain/healthy/sport) + "✍️ Написать свою цель" текстом
- **goal_healthy/sport маппинг**: в БД = maintain/gain + `goal_text` отдельной колонкой (try/catch)
- **Имя**: после телефона явно спрашивает/подтверждает. Валидация (не greeting, не число, не 1 буква)
- **Step 0**: если юзер пишет текст → "Я пока не могу ответить — нужен номер" (а не просто "нажми кнопку")
- **"Что я умею"**: расширено до 12 пунктов с командами + подсказка про AI-память

### Блок 3: Новые функции
- `/addfood` + `food-text.ts` — добавить еду текстом (AI считает КБЖУ + микронутриенты)
- `/delfood` — удаление записей из дневника (кнопки delfood_N или номер)
- План питания: диалог выбора периода (сегодня/неделя/месяц/своё)
- Deepcheck: 5 типов (рацион/витамины/анализы/прогресс/полный) + свой вопрос
- Рецепты: авто-определение приёма пищи по МСК + фото продуктов + текст ингредиентов
- AI-память: детектор в чате ("зови меня X", "вешу Y") → авто-обновление профиля + пересчёт макросов

### Блок 4: AI Vision + витамины
- Промпт `food-analysis.ts` расширен: 18 микронутриентов (vitamins A/C/D/E/B1-B12, iron, calcium, magnesium, zinc, potassium, sodium, phosphorus, selenium, folate, omega3, fiber)
- `food-text.ts` тоже запрашивает микронутриенты
- `/vitamins` теперь будет показывать данные (раньше зависело от пустой nutri_nutrient_db)

### Блок 5: Фото холодильника → рецепты
- `awaiting_recipe_photo` в роутере: фото → Vision распознаёт продукты → рецепты ТОЛЬКО из них
- Промпт рецептов: "используй ТОЛЬКО продукты пользователя, не добавляй своих"

### Блок 6: UX-улучшения
- Профиль: показывает goal_text + кнопка "✏️ Редактировать"
- /editprofile: добавлена "✍️ Цель текстом"
- Меню после записи: 7 кнопок (+ Витамины, + Ещё фото, + Главное меню)
- Призыв к свободному чату после записи еды

### Блок 7: Инфраструктура
- `console.error` добавлен в routeUpdate, recipe-card, welcome-card
- ErrorType: добавлен 'welcome_card'
- Supabase: колонка `goal_text TEXT` добавлена в nutri_users
- Миграция: `supabase/migrations/004_goal_text.sql`

---

## ИЗВЕСТНЫЕ БАГИ (НЕ ПОЧИНЕНЫ, ПРИОРИТЕТ)

### HIGH — ломает функционал
| # | Баг | Описание |
|---|-----|----------|
| B1 | **Инфографика не отправляется** | recipe-card.ts и welcome-card.ts генерируют SVG→PNG через sharp, но uploadImage возвращает пустой token или sharp падает на Vercel. Ошибки теперь логируются (console.error + error-tracker) — нужно проверить логи и починить |
| B2 | **Рецепты игнорируют ингредиенты пользователя** | Контекст передаётся в промпт, но AI иногда игнорирует. Нужно усилить промпт или добавить валидацию ответа |
| B3 | **Фото холодильника** — при `awaiting_recipe_photo` бот распознаёт продукты но может не дойти до рецептов (проверить по логам) |
| B4 | **Меню бота в админке** — некорректно отображается (нужно проверить BotMenu.tsx) |

### MED — улучшения
| # | Баг | Описание |
|---|-----|----------|
| B5 | GIF-отчёты не генерируются (та же проблема sharp) |
| B6 | Нет призыва к свободному чату в главном меню и при /start |
| B7 | Двойное сообщение при нажатии "📸 У меня есть продукты" + "✍️ Напишу что есть" одновременно |

---

## БЭКЛОГ (НЕ НАЧАТО)

### Функционал
| # | Задача | Приоритет |
|---|--------|-----------|
| F1 | Хранение документов пользователя (анализы, доки) в Supabase — таблица + storage | HIGH |
| F2 | Визуализация "Старт → Цель" после анкеты (юморная SVG-карточка) | MED |
| F3 | SMART-цели: "похудеть на X кг" → оценка → лайт/медиум/хард режим | IDEA |
| F4 | Интеграция заказа продуктов из рецептов (список покупок) | IDEA |
| F5 | Геймификация (3+ блюд → промокод Moonvit 10%) | LATER |
| F6 | Планировщик условных сообщений | LATER |

### Админка / настройки
| # | Задача | Приоритет |
|---|--------|-----------|
| A1 | Промпт меню ресторана — нет настройки в админке | LOW |
| A2 | Формат рецепт-карточек (цвета, шрифты) захардкожен | LOW |
| A3 | Формат GIF-отчётов захардкожен | LOW |
| A4 | Меню бота в админке — проверить отображение | MED |

### Инфраструктура
| # | Задача | Приоритет |
|---|--------|-----------|
| I1 | Git: коммиты НЕ запушены (secrets в старых коммитах) | BLOCKED |
| I2 | nutri_nutrient_db — таблица может быть пустой (теперь не критично, AI сам считает) | LOW |

---

## ИЗМЕНЁННЫЕ ФАЙЛЫ (чат 2, полный список)

### Бот — новые файлы
```
src/config/bot-messages.ts       — конфигурируемые тексты бота
src/handlers/food-text.ts        — добавление еды текстом (/addfood)
supabase/migrations/004_goal_text.sql
docs/CHANGELOG-PLAN.md
docs/HANDOFF_CHAT2.md
```

### Бот — изменённые файлы
```
src/handlers/onboarding.ts       — цели, имя, валидация, welcome-card logging, goal_text
src/handlers/callbacks.ts        — getMsg(), meal plan/deepcheck/recipe/delfood callbacks
src/handlers/commands.ts         — getMsg(), /delfood, /addfood, /editprofile, /profile, /help
src/handlers/food-photo.ts       — getMsg(), микронутриенты
src/handlers/router.ts           — getMsg(), awaiting_recipe_photo, food_text, mealplan, deepcheck, recipe states, console.error
src/handlers/chat.ts             — AI-память (detectProfileUpdate)
src/handlers/meal-plan.ts        — выбор периода (askMealPlanPeriod)
src/handlers/deep-consult.ts     — askDeepcheckType + handleDeepConsultCustom
src/handlers/voice.ts            — getMsg()
src/handlers/restaurant-menu.ts  — getMsg()
src/handlers/weight-correction.ts — getMsg()
src/services/recipe-recommender.ts — askRecipeOptions + context в промпт
src/services/error-tracker.ts    — ErrorType 'welcome_card'
src/utils/formatter.ts           — featureLocked async, getMsg()
src/utils/nutrition.ts           — goal: string, sport multiplier
src/config/bot-messages.ts       — NEW
src/max/keyboard.ts              — onboardingGoal 6 кнопок, smartRepliesAfterFood 7 кнопок
src/max/types.ts                 — goal union + goal_text
src/ai/vision.ts                 — FoodAnalysis + micronutrients
src/prompts/food-analysis.ts     — 18 микронутриентов в промпте
src/prompts/recipes.ts           — ингредиенты пользователя, разные приёмы пищи
src/db/food-logs.ts              — deleteFoodLog()
```

### Админка — изменённые файлы
```
admin/src/pages/Settings.tsx     — секция "Тексты бота" (BotMessagesSection)
```

---

## ДЕПЛОЙ
- Бот задеплоен на nutri-bot-smoky.vercel.app (последний деплой ~15:00 МСК 04.04)
- Админка НЕ деплоилась в чате 2 (изменения только в Settings.tsx)
- Git по-прежнему НЕ запушен

## НАЧНИ НОВЫЙ ЧАТ С:
1. Прочитай этот файл: `D:\DX\nutri-bot\docs\HANDOFF_CHAT2.md`
2. Прочитай план: `D:\DX\nutri-bot\docs\CHANGELOG-PLAN.md`
3. Проверь логи Vercel на ошибки sharp/инфографики
4. Приоритеты: B1 (инфографика), B2 (рецепты по ингредиентам), B4 (меню в админке)
