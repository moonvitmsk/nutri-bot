# NutriBot — Детальный баг-репорт с доказательствами от 30 агентов

## Общий анализ ситуации

Симуляция вскрыла **архитектурный антипаттерн** в боте: **write-after-send** — бот сначала пытается отправить ответ пользователю, и только потом записывает данные в БД. Если отправка сообщения падает (MAX API недоступен, timeout, rate limit), вся бизнес-логика обрывается. Это не просто баг — это **системная уязвимость к любому моргнёт MAX API**.

В production это проявится:
- При кратковременных outage MAX API (секунды) — еда не запишется
- При rate limiting (30 rps) — под нагрузкой данные теряются
- При network glitches — молчаливая потеря данных без ошибок в логах

Второй антипаттерн: **отсутствие UNIQUE constraint** на `max_user_id` + `.single()` без error handling. Под любой concurrent нагрузкой (2 быстрых сообщения от юзера) создаются дубликаты, и дальше всё ломается каскадно.

---

## ROOT-A [CRITICAL]: Дублирование user records

### Описание
`findUserByMaxId()` в `src/db/users.ts:4-11` использует `.single()` который:
- При 0 записей: возвращает `null` (корректно)
- При 1 записи: возвращает данные (корректно)
- При 2+ записях: возвращает **ошибку PGRST116**, но error не проверяется → `data = null`
- При timeout/сетевой ошибке: также `data = null`

Во всех error-случаях router считает юзера несуществующим и вызывает `createUser()` → ещё один дубликат.

### Доказательства по агентам

| Агент | Проявление | Детали |
|-------|-----------|--------|
| #02 Андрей | User ID collision | Данные записались в чужую запись max_user_id=197609 вместо 990000002. Реальная запись создана на 2 мин позже, пустая |
| #04 Дмитрий | Silent creation failure | Первый bot_started молча не создал юзера, второй сработал |
| #05 Ольга | Silent creation failure | bot_started вернул 200, юзер не создан. Весь онбординг потерян |
| #06 Сергей | goal_healthy "не работает" | Данные записались в дубликат, основная запись осталась пустой |
| #07 Анна | age/height/weight null | Онбординг прошёл, но данные в другой записи |
| #10 Иван | Onboarding stuck at goal | finishOnboarding записал в дубликат |
| #11 Светлана | Record replaced | Успешный онбординг перезаписан пустой записью (2 UUID для одного max_user_id) |
| #12 Алексей | Profile fields null | sex, age, height, weight — всё null при completed=true |
| #13 Татьяна | User not created | bot_started с кириллицей молча не создал юзера |
| #14 Павел | Age=88 вместо 33 | Вес (88) записался в поле age из-за race condition в step machine |
| #18 Николай | Age=100 вместо 48 | Вес (100) записался в age из-за rapid-fire inputs |
| #20 Роман | 2 попытки bot_started failed | Юзер создан только с 3-й попытки |
| #24 Владимир | Чужой max_user_id=197609 | Промежуточный check вернул чужую запись |
| #26 Фёдор | age=95, weight=190 | Рост (190) записался как вес, вес (95) как возраст |
| #29 Алиса | age=63 вместо 31 | Вес (63) записался в age |

### Корневая причина
```javascript
// users.ts:4-11 — ошибка проглатывается
const { data } = await supabase  // ← error ignored!
  .from('nutri_users').select('*')
  .eq('max_user_id', maxUserId)
  .single();  // ← PGRST116 при 2+ записях
return data;  // ← null и при ошибке, и при отсутствии
```

### Фикс
1. SQL: `ALTER TABLE nutri_users ADD CONSTRAINT unique_max_user_id UNIQUE (max_user_id);`
2. `createUser()` → `.upsert({...}, { onConflict: 'max_user_id' })`
3. `findUserByMaxId()` → `.maybeSingle()` + error handling + `.order('created_at', { ascending: false }).limit(1)`

---

## ROOT-B [CRITICAL]: sendMessage() до бизнес-логики

### Описание
В food-text.ts и food-photo.ts первой строкой стоит `await sendMessage(chatId, 'Считаю КБЖУ...')`. Если MAX API недоступен, вся функция падает — `saveFoodLog()`, `saveMessage()`, `confirmFoodLog()` никогда не вызываются.

### Доказательства по агентам

| Агент | Food logs | Описание |
|-------|-----------|----------|
| #01 Мария | 0 из 10+ | "Food logs not saved, last_food_date stays null" |
| #02 Андрей | 0 из 11+ | "Text-based /addfood flow appears to process but not persist" |
| #03 Екатерина | 0 из 10+ | "Food logs not persisted despite HTTP 200 on all /addfood" |
| #04 Дмитрий | 0 из 8+ | "Text-based /addfood does not write to nutri_food_logs" |
| #05 Ольга | 0 из 9 | "nutri_food_logs table has zero rows" |
| #06 Сергей | 0 из 10+ | "Food persistence is coupled to reply step" |
| #07 Анна | 0 из 10+ | "nutri_food_logs for this user is empty" |
| #08 Максим | 0 из 10+ | "nutri_food_logs пустые (0 записей)" |
| #09 Наталья | 0 из 10 | "nutri_food_logs for this user is empty" |
| #10 Иван | 0 из 8+ | "food never saved (sendMessage throws before AI call)" |
| #11 Светлана | 0 из 14+ | "nutri_food_logs table has zero rows" |
| #12 Алексей | 0 из 12+ | "nutri_food_logs is empty for this user" |
| #13 Татьяна | 0 из 8 | "Food logs not saved despite confirmed /addfood flow" |
| #14 Павел | 0 из 10+ | "nutri_food_logs stays empty" |
| #15 Юлия | 0 из 10+ | "no DB record created, no error message" |
| #16 Артём | 0 из 15+ | "food log persistence is coupled to MAX API reply delivery" |
| #17 Виктория | 0 из 8+ | "Food logs not saved — AI analysis never runs" |
| #18 Николай | 0 из 10+ | "food logging fully broken" |
| #19 Елена | 0 из 10+ | "food persistence is gated on reply delivery" |
| #20 Роман | 0 из 11 | "All /addfood silently dropped" |
| #21 Людмила | 0 из 10 | "All /addfood + confirm_food pairs resulted in zero rows" |
| #22 Кирилл | 0 из 8+ | "Food logs show empty" |
| #23 Дарья | 0 из 8 | "nutri_food_logs stays empty" |
| #24 Владимир | 0 из 10+ | "Нет food logs" |
| #25 Ирина | 0 из 8+ | "zero food logs, water counter stuck at 0" |
| #26 Фёдор | 0 из 42 | "42 intended food log entries, 0 saved" |
| #27 Полина | 0 из 10+ | "nutri_food_logs returns []" |
| #28 Григорий | 0 из 8+ | "nutri_food_logs has zero rows" |
| #29 Алиса | 0 из 8 | "zero rows in nutri_food_logs" |
| #30 Тимур | 0 из 8+ | "nutri_food_logs table has 0 entries" |

**ИТОГО: 0 food logs из ~300+ попыток у 30 агентов. 100% failure rate.**

### Код проблемы
```javascript
// food-text.ts:28-29
export async function handleFoodText(user, chatId, text) {
  await sendMessage(chatId, 'Считаю КБЖУ по описанию...');  // ← THROWS
  // ... saveFoodLog() на строке 58 НИКОГДА не вызывается

// food-photo.ts:26
  await sendMessage(chatId, await getMsg('msg_analyzing_photo'));  // ← THROWS
  // ... saveFoodLog() НИКОГДА не вызывается
```

### Фикс
```javascript
// Заменить await на fire-and-forget:
sendMessage(chatId, 'Считаю КБЖУ по описанию...').catch(() => {});
// Остальной код выполнится даже если сообщение не доставилось
```

---

## ROOT-C [MEDIUM]: Water race condition

### Описание
`/water` команда читает текущее значение `water_glasses` из объекта user (загруженного в начале запроса), инкрементирует на 1 и записывает абсолютное значение. При параллельных запросах (от разных пользователей через один serverless instance, или при быстрых нажатиях) значения перезаписывают друг друга.

### Доказательства по агентам

| Агент | Отправлено | Записано | % потерь |
|-------|-----------|----------|----------|
| #01 Мария | 9 | 3 | 67% |
| #02 Андрей | 18 (expected) | 13 | 28% |
| #06 Сергей | 8 | 3 | 63% |
| #07 Анна | 8+ | 8 | 0% (повезло) |
| #11 Светлана | 10+ | 3 | 70% |
| #12 Алексей | 14 | 5 | 64% |
| #13 Татьяна | - | 7 | OK |
| #14 Павел | - | OK | OK |
| #16 Артём | - | 8 | OK |
| #18 Николай | 12 | 1 | 92% |
| #19 Елена | 11 | 2 | 82% |
| #23 Дарья | 3 | 7 | OK (другие юзеры?) |
| #26 Фёдор | 14 | 14 | 0% |
| #27 Полина | 3 | 1 | 67% |
| #29 Алиса | 3 | 2 | 33% |
| #30 Тимур | 6 | 1 | 83% |

Средняя потеря: ~50%. Некоторые агенты не потеряли (запросы были разнесены по времени).

### Код проблемы
```javascript
// commands.ts:206-208
const glasses = (user as any).water_glasses || 0;  // ← stale read
const newGlasses = glasses + 1;
await updateUser(user.id, { water_glasses: newGlasses });  // ← absolute write
```

### Фикс
```sql
-- Supabase RPC для атомарного инкремента:
CREATE OR REPLACE FUNCTION increment_water(user_uuid UUID)
RETURNS integer AS $$
  UPDATE nutri_users SET water_glasses = water_glasses + 1, updated_at = NOW()
  WHERE id = user_uuid RETURNING water_glasses;
$$ LANGUAGE sql;
```

---

## BUG-D [HIGH]: context_state "onboarding_short" не сбрасывается

### Описание
При short onboarding ставится `context_state: 'onboarding_short'` (onboarding.ts:411). `finishOnboarding()` НЕ включает `context_state: 'idle'` в обновление.

### Подтверждено
- #02 Андрей: `context_state: "onboarding_short"` после completed=true
- Потенциально все пользователи short пути

### Фикс
В `finishOnboarding()` добавить `context_state: 'idle'` в updateUser.

---

## BUG-E [MEDIUM]: Возраст словом не парсится

### Описание
`parseInt("шестьдесят")` = NaN → молчаливый отказ. Для пожилых пользователей — dead end.

### Подтверждено
- #10 Иван: "шестьдесят" rejected silently, "60" worked

### Фикс
Добавить словарь числительных перед parseInt в onboarding step 3.

---

## BUG-F [LOW]: Weight 300 кг принимается

### Описание
Валидация `w > 300` пропускает 300.0 → daily_calories=6203

### Подтверждено
- #22 Кирилл: weight=300 accepted, daily_calories=6203

### Фикс
Изменить `w > 300` на `w > 250` (или `w >= 250`).

---

## BUG-G [LOW]: editprofile сдвигает onboarding_step

### Описание
`edit_weight` через `/editprofile` вызывает `updateProfileAndRecalc()`, который может затронуть `onboarding_step` через общий `updateUser()`.

### Подтверждено
- #23 Дарья: onboarding_step перепрыгнул с 1 на 2 после edit_weight

### Фикс
`updateProfileAndRecalc` не должен трогать `onboarding_step` — убрать из объекта updates.

---

## Не баги бота (артефакты симуляции)

| Проявление | Причина | Все 30 агентов |
|-----------|---------|----------------|
| Кириллица = `??????` в именах | curl на Windows не отправляет UTF-8 | Да |
| Intent detector не срабатывает | Кириллица garbled → regex не матчит | #04, #10 |
| /allergy не сохраняется | Кириллица в JSON garbled | #07 (но #15 с heredoc — ОК!) |
| Invalid JSON errors | `--data` флаг curl ломает Cyrillic | #15, #16 |
| error_log flooding (chat.not.found) | Симуляционные ID не существуют в MAX | Все |
| nutri_error_logs table not found | Опечатка в SIM_GUIDE.md (нужно без 's') | Все |
