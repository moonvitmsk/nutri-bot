# NutriBot — HANDOFF Чат 6 (05.04.2026)

## Саммари сессии

Сессия была посвящена двум направлениям: конкурентный аудит NutriBot MAX и реализация P0-задачи — фото-логирование в мини-приложении.

---

## 1. Конкурентный аудит (завершён)

Принят и сохранён полный конкурентный анализ NutriBot vs международные трекеры.
- **Документ**: `docs/nutribot-competitive-audit-2026-04-05.md`
- **Память**: `project_nutribot_competitive_audit.md`
- Ключевые конкуренты: FatSecret (643K в РФ), CalPal.Pro (TG), Cronometer, Noom
- Roadmap P0-P3 утверждён

---

## 2. Фото-логирование в мини-приложении (P0 #1) — РЕАЛИЗОВАНО

### Что сделано:

**Бэкенд** (`api/miniapp-add-food.ts`):
- Объединён текстовый и фото-анализ в один эндпоинт (лимит 12 serverless на Hobby)
- Три режима: `{ text }` → text AI, `{ imageBase64 }` → Vision AI (unconfirmed), `{ confirmLogId }` → подтверждение
- Фото сохраняется как `confirmed: false`, пользователь подтверждает в UI
- GPT-4.1 Vision для анализа фото, GPT-4.1-mini для текста

**Фронтенд** (`miniapp/src/components/AddFoodForm.tsx`):
- Полный flow: выбор режима → фото/текст → превью → анализ → результат с КБЖУ → подтверждение/отмена
- Клиент-сайд сжатие фото (`compress-image.ts`): Canvas API, 1280px, JPEG 0.85
- Экран результата: список блюд (название, вес, калории, БЖУ), итого, комментарий AI
- Кнопки "Записать" / "Отмена"
- Сканирующая линия при анализе
- Ошибки отображаются красной плашкой

**Инфраструктура**:
- Vercel rewrite proxy: `/api/*` → `nutri-bot-smoky.vercel.app`
- Фото отправляется напрямую на `nutri-bot-smoky.vercel.app` (минуя proxy, для больших payload)
- CORS: `Access-Control-Allow-Origin: *` на боте

### Баги найденные и исправленные:

| # | Баг | Причина | Фикс |
|---|-----|---------|------|
| 1 | API вызовы из miniapp возвращали HTML | Не было proxy — запросы шли на домен miniapp | Добавлен rewrite `/api/*` → бот в `vercel.json` |
| 2 | 13-я serverless функция не влезла в Hobby лимит | Отдельный `miniapp-add-photo.ts` | Объединён в `miniapp-add-food.ts` |
| 3 | `file.type` пустой в MAX WebView | MAX не ставит MIME при съёмке камерой | `if (file.type && !file.type.startsWith('image/'))` |
| 4 | Модал закрывался при выборе фото | Программный `.click()` на input всплывал к backdrop | `onClick={e => e.stopPropagation()}` на hidden input |
| 5 | Ошибки API глотались молча | catch без UI-отображения | Добавлен `addFoodError` state + красная плашка |
| 6 | Vercel деплоил из кэша | Vercel build cache | `vercel build --prod` + `--prebuilt` |

### Чистка кода:

- Удалён `SpaceBackground.tsx` (350 строк canvas-анимации, не импортировался)
- Удалён `AchievementGrid.tsx` (не импортировался)
- Убраны 11 неиспользуемых `@keyframes` из CSS
- Убраны все inline `animation` и `animationDelay` из 8 компонентов
- CSS: 7.29 КБ → 4.72 КБ (−35%)

---

## 3. Нерешённые задачи (перенос в следующий чат)

### P0 — немедленно:

- [ ] **Фото-анализ: показывать вес порций** — AI уже определяет `portion_g`, нужно выводить в UI результата и позволять пользователю вручную корректировать вес каждого элемента (input number)
- [ ] **Вода: определять объём по фото** — если на фото стакан/бутылка воды, показывать объём (мл) вместо КБЖУ
- [ ] **Трекер веса с графиком тренда** (P0 #2 из roadmap)
- [ ] **Увеличить бесплатный лимит фото** — с 10 за всё время на 5/день

### P1 — краткосрочно (1-2 месяца):

- [ ] Сканер штрихкодов (VK Bridge + Open Food Facts)
- [ ] Быстрые кнопки: избранное, частое, повтор приёма
- [ ] Шаблоны приёмов пищи (сохранить/повторить)
- [ ] Еженедельные отчёты с витаминными рекомендациями Moonvit
- [ ] Система бейджей + промокоды за стрики
- [ ] Streak freeze (заморозка серии)

### P2 — среднесрочно (2-4 месяца):

- [ ] Доступ к рецептам/планам питания в мини-приложении
- [ ] Интерактивные графики за месяц (Recharts)
- [ ] Трекер настроения (3 эмодзи после приёма)
- [ ] Шеринг-карточки достижений для историй
- [ ] Персонализированные AI-инсайты ("Вы превышаете углеводы по пятницам")
- [ ] Фото-галерея еды (визуальный таймлайн)

### P3 — долгосрочно (4-6 месяцев):

- [ ] Социальные челленджи и таблица лидеров
- [ ] Расширенный онбординг с AI-демо до пейволла
- [ ] Оффлайн-кэш (IndexedDB + Service Worker)
- [ ] Интеграция с фитнес-трекерами (Fitbit, Garmin)

### Известные баги (из предыдущих сессий, актуальные):

- [MED] GIF-отчёты не генерируются
- [MED] Админка на старом Supabase (нужно переключить env)
- [HIGH] prompt_greeting_ai есть в UI, но бот его НЕ читает из БД
- [CHECK] nutri_nutrient_db — таблица может быть пустой

---

## Деплой-статус

| Проект | URL | Статус |
|--------|-----|--------|
| nutri-bot (бот) | nutri-bot-smoky.vercel.app | READY, 12 lambda |
| miniapp | miniapp-chi-vert.vercel.app | READY, с фото-логированием |
| admin | admin-seven-navy-91.vercel.app | НЕ переключена на moonvit-hub |

## Первая задача для следующего чата

**Редактирование веса порций после фото-анализа:**
- В экране результата ("Распознано") каждый элемент имеет `weight_g` (AI-оценка)
- Нужно: сделать вес кликабельным/редактируемым (input number)
- При изменении веса — пересчитывать КБЖУ пропорционально
- Для воды/напитков — показывать объём в мл
- AI уже пишет `portion_g` для каждого item — данные есть, нужен только UI

## Файлы изменённые в этой сессии

```
СОЗДАНО:
  miniapp/src/lib/compress-image.ts     — клиент-сайд сжатие фото
  docs/nutribot-competitive-audit-2026-04-05.md

ИЗМЕНЕНО:
  api/miniapp-add-food.ts               — объединён text+photo+confirm
  miniapp/src/App.tsx                    — handleAddFoodPhoto, handleConfirmPhoto, handleCancelPhoto
  miniapp/src/components/AddFoodForm.tsx — полная переработка: 5 режимов, фото flow, ошибки
  miniapp/src/components/DailyProgress.tsx — иконка камеры на кнопке
  miniapp/src/lib/api.ts                — addFoodPhoto (direct URL), confirmFood
  miniapp/src/styles/globals.css        — чистка анимаций (−35%)
  miniapp/vercel.json                   — rewrite proxy /api/* → бот

  Чистка анимаций:
  miniapp/src/components/WeeklyReport.tsx
  miniapp/src/components/FoodDiary.tsx
  miniapp/src/components/ProfileCard.tsx
  miniapp/src/components/VitaminChart.tsx
  miniapp/src/components/VitaminsPage.tsx
  miniapp/src/components/Recommendations.tsx

УДАЛЕНО:
  miniapp/src/components/SpaceBackground.tsx
  miniapp/src/components/AchievementGrid.tsx
  api/miniapp-add-photo.ts (объединён)
```
