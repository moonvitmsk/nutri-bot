# NutriBot — HANDOFF Чат 7 (05.04.2026)

## Саммари сессии

Массовая реализация задач из roadmap P0-P1. Все 4 задачи P0 и 4 задачи P1 выполнены за одну сессию.

---

## 1. P0: Редактирование веса порций после фото-анализа — РЕАЛИЗОВАНО

**AddFoodForm.tsx** полностью переработан:
- Экран результата фото-анализа теперь содержит **редактируемые input-поля** для веса каждого элемента
- При изменении веса КБЖУ **пересчитываются пропорционально** (ratio к оригинальному весу AI)
- Обновлённые данные передаются в бэкенд при подтверждении (`confirmLogId` + `updatedItems` + `updatedTotals`)
- **miniapp-add-food.ts**: confirm mode теперь принимает `updatedItems` и `updatedTotals`, обновляет `nutri_food_logs` перед подтверждением
- Тип `EditableItem` хранит `_orig_*` для пропорционального пересчёта
- Подсказка "Нажми на вес, чтобы скорректировать порцию"

---

## 2. P0: Лимит фото 5/день — РЕАЛИЗОВАНО

**subscriptions.ts**:
- `FREE_PHOTO_LIMIT = 10` (lifetime) → `FREE_PHOTOS_PER_DAY = 5` (daily)
- `canUseFeature('photo')`: free → `photos_today < 5`, trial → `< 3`, premium → `< 20`
- `getFreeAnalysesRemaining()` → `getPhotosRemaining()` — считает оставшиеся на сегодня
- `needsPhoneSharing()` обновлена для daily лимита

**miniapp-add-food.ts**:
- Проверка `canUseFeature(user, 'photo')` **перед** анализом фото
- Инкремент `photos_today` **после** успешного анализа
- Ответ включает `photos_remaining` для UI
- Ошибка 429 `photo_limit` с человекочитаемым комментарием

**food-photo.ts** (бот):
- Обновлён импорт на `getPhotosRemaining`
- Показывает "Осталось X фото-анализов на сегодня" (при remaining ≤ 3)

---

## 3. P0: Вода по фото — РЕАЛИЗОВАНО

**food-analysis.ts промпт**:
- Добавлена секция "ВОДА И НАПИТКИ БЕЗ КАЛОРИЙ"
- AI возвращает `is_drink: true` и `volume_ml` для воды/чая/пустого кофе
- Для калорийных напитков — обычный анализ + `volume_ml`
- Объёмы: бутылка 0.5л = 500мл, стакан = 200-250мл, кружка = 250-300мл

**miniapp-add-food.ts**:
- Парсит `is_drink` из анализа, передаёт во фронтенд
- Items включают `is_drink` и `volume_ml`

**AddFoodForm.tsx**:
- Для drink-items: синий input для объёма в мл (вместо граммов)
- Итого для чистой воды: "250 мл" вместо "0 ккал"
- Кнопка "Записать воду" вместо "Записать"
- Заголовок "Напиток" вместо "Распознано"

---

## 4. P0: Трекер веса с графиком тренда — РЕАЛИЗОВАНО

**Supabase**:
- Создана таблица `nutri_weight_logs` (id uuid, user_id, weight_kg numeric(5,1), note, created_at)
- Индекс `idx_weight_logs_user_date` (user_id, created_at DESC)

**miniapp-water.ts** расширен (без нового эндпоинта!):
- `{ weight_kg }` → логирует вес, обновляет профиль, возвращает 90 дней истории
- `{ streakFreeze: true }` → использует заморозку стрика

**miniapp-auth.ts**:
- Возвращает `weight_history` (последние 90 дней) и `streak_freeze_available`
- Добавлены `photos_today`, `streak_freeze_available` в user response

**WeightTracker.tsx** — новый компонент:
- SVG-график с 30 точками, gradient fill, trend line (линейная регрессия)
- Показывает дельту (зелёный/красный)
- Кнопка "Записать вес" с inline input
- Min/max метки на графике
- Дата последней записи

**ProfileCard.tsx**: WeightTracker интегрирован выше параметров

---

## 5. P1: Быстрые кнопки — РЕАЛИЗОВАНО

**AddFoodForm.tsx**:
- В режиме `choose` отображаются частые блюда из истории (≥2 повторов)
- `getFrequentFoods()` в App.tsx: извлекает топ-8 блюд из `allLogs`
- Тап → переход в text mode с заполненным текстом

---

## 6. P1: Streak freeze — РЕАЛИЗОВАНО

**Supabase**: `nutri_users.streak_freeze_available` (integer, default 1)

**miniapp-water.ts**: `{ streakFreeze: true }` → декремент, возвращает остаток

**api.ts**: `useStreakFreeze()` функция

**ProfileCard.tsx**: карточка "Заморозка стрика" с кнопкой "Заморозить" и счётчиком доступных

---

## 7. P1: Система бейджей — РЕАЛИЗОВАНО

**BadgeList.tsx** — новый компонент:
- 8 бейджей: streak-3/7/30, meals-10/50, water-day, photo-first/10
- Вычисляются на клиенте из текущих данных пользователя
- Прогресс-бар для незавершённых
- Сетка 4x2, grayscale для locked
- Счётчик "X/8" в заголовке

**ProfileCard.tsx**: BadgeList интегрирован между WeightTracker и параметрами

---

## 8. P1: Еженедельные отчёты с витаминными рекомендациями — РЕАЛИЗОВАНО

**WeeklyReport.tsx**:
- Новый компонент `VitaminRecommendations` внизу отчёта
- Считает средние дневные витамины за залогированные дни
- При <60% нормы — показывает дефицит + рекомендацию продукта Moonvit
- Маппинг: vitamin_d → Moonvit D3, vitamin_c → Moonvit C, iron → Moonvit Iron, etc.
- При норме — показывает "Витамины в норме! Так держать!"
- Минимум 3 залогированных дня для отображения

---

## 9. BUG: prompt_greeting_ai — ЗАКРЫТ (не баг)

Проверено: `onboarding.ts:34` уже читает из `nutri_settings` через `getSetting('prompt_greeting_ai')`. Запись существует в БД. Если пустая — используется fallback. Работает корректно.

---

## Деплой-статус

| Проект | URL | Статус |
|--------|-----|--------|
| nutri-bot (бот) | nutri-bot-smoky.vercel.app | READY, 12 lambda |
| miniapp | miniapp-chi-vert.vercel.app | Build OK (200.7 KB JS) |
| admin | admin-seven-navy-91.vercel.app | НЕ переключена на moonvit-hub |

**ВАЖНО**: Не добавлено новых API-эндпоинтов (12 lambda лимит сохранён). Weight и streak freeze интегрированы в miniapp-water.ts.

---

## Нерешённые задачи (перенос)

### P1 — остаток:
- [ ] Сканер штрихкодов (VK Bridge + Open Food Facts) — требует VK Bridge SDK
- [ ] Шаблоны приёмов пищи (сохранить набор блюд → повторить одной кнопкой)

### P2 — среднесрочно:
- [ ] Доступ к рецептам/планам питания в мини-приложении
- [ ] Интерактивные графики за месяц (Recharts)
- [ ] Трекер настроения (3 эмодзи после приёма)
- [ ] Шеринг-карточки достижений
- [ ] Персонализированные AI-инсайты
- [ ] Фото-галерея еды

### P3 — долгосрочно:
- [ ] Социальные челленджи
- [ ] Расширенный онбординг с AI-демо до пейволла
- [ ] Оффлайн-кэш (IndexedDB + Service Worker)
- [ ] Интеграция с фитнес-трекерами

### Известные баги:
- [MED] GIF-отчёты не генерируются
- [MED] Админка на старом Supabase (нужно переключить env)
- [CHECK] nutri_nutrient_db — таблица может быть пустой

### Из предыдущих аудитов (не сделано):
1. [MED] Сервисные сообщения захардкожены
2. [MED] Онбординг-сообщения захардкожены
3. [LOW] Feature-lock сообщения захардкожены
4. [LOW] Промпт меню ресторана — нет настройки
5. [LOW] Формат рецепт-карточек захардкожен
6. [LATER] Геймификация промокодов за стрики (3+ блюд → Moonvit 10%)
7. [LATER] Планировщик условных сообщений

---

## Файлы изменённые в этой сессии

```
СОЗДАНО:
  miniapp/src/components/WeightTracker.tsx  — трекер веса с SVG-графиком
  miniapp/src/components/BadgeList.tsx      — система бейджей (8 достижений)
  docs/HANDOFF_CHAT7.md

SUPABASE:
  CREATE TABLE nutri_weight_logs           — таблица весовых записей
  ALTER TABLE nutri_users ADD streak_freeze_available

ИЗМЕНЕНО (бэкенд):
  src/prompts/food-analysis.ts             — секция "Вода и напитки", is_drink + volume_ml
  src/db/subscriptions.ts                  — 5/day free (было 10 lifetime), getPhotosRemaining()
  src/handlers/food-photo.ts               — обновлён на getPhotosRemaining
  api/miniapp-add-food.ts                  — photo limit check + increment + water items + confirm с updatedItems/Totals
  api/miniapp-water.ts                     — weight tracking + streak freeze (3 режима)
  api/miniapp-auth.ts                      — weight_history + streak_freeze_available + photos_today

ИЗМЕНЕНО (фронтенд):
  miniapp/src/types/index.ts               — WeightEntry, Badge, FoodItem.is_drink/volume_ml
  miniapp/src/lib/api.ts                   — logWeight, useStreakFreeze, ApiWeightEntry, updated types
  miniapp/src/components/AddFoodForm.tsx    — editable portions, water display, quick buttons, photo_limit error
  miniapp/src/components/ProfileCard.tsx    — WeightTracker + BadgeList + streak freeze
  miniapp/src/components/WeeklyReport.tsx   — VitaminRecommendations с Moonvit-маппингом
  miniapp/src/App.tsx                       — weight handlers, streak freeze, frequent foods, updated confirm
```
