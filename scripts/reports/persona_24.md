# Persona 24: Владимир

## Profile
- Age: 52, Sex: male, Height: 170 cm, Weight: 92 kg, Goal: lose weight
- User ID: 990000024
- Phone: +79001000024
- Personality: Таксист, ест на ходу, фастфуд, нерегулярно. Не любит длинные инструкции.
- DB record ID: 0b3459e5-a086-4a02-8e4c-b7443ef54d61

## Simulation Summary
- Days simulated: 7
- Total events sent: 37
- HTTP 200 responses: 37/37 (webhook accepted all events)
- Food logs confirmed in DB: 0 (critical)
- Errors encountered: 3 critical bugs identified

---

## Bugs Found

### 1. [CRITICAL] Onboarding не сохраняет профиль при `profile_short`
- **Что произошло**: После полного онбординга (bot_started → contact → profile_short → sex_male → "52" → goal_lose) финальный `check_user` показал `onboarding_completed=false`, `onboarding_step=0`, `sex=null`, `age=null`, `goal=null`, `weight_kg=null`.
- **Ожидалось**: Профиль сохранён с sex=male, age=52, goal=lose, onboarding_completed=true.
- **Промежуточный check_user** (сразу после онбординга) показал другой `max_user_id=197609` — вероятно, был найден или создан другой пользователь (по внутреннему MAX user_id, а не по симуляционному). Финальный же запрос нашёл запись 990000024 без данных.
- **Вывод**: Либо `profile_short` flow не сохраняет данные в нужную запись, либо `max_user_id` маппинг некорректен при симуляции.

### 2. [CRITICAL] Food logs не сохраняются
- **Что произошло**: После 10+ вызовов `/addfood` + `confirm_food` за 7 дней — `check_food` для DB ID вернул пустой массив `[]`.
- **Ожидалось**: 10+ записей в `nutri_food_logs` с калориями, белками, жирами, углеводами.
- **Причина**: Возможно связано с багом #1 — еда привязывается к internal DB user_id, а не к симуляционному. Либо `confirm_food` без активной pending-записи молча игнорируется.

### 3. [MEDIUM] Неверное имя таблицы в `sim-send.sh` — функция `check_errors`
- **Что произошло**: `check_errors()` обращается к `nutri_error_logs` → ошибка 404/PGRST205: "Could not find the table 'public.nutri_error_logs'".
- **Ожидалось**: Должна использоваться таблица `nutri_error_log` (без 's').
- **Фикс**: в `/d/DX/nutri-bot/scripts/sim-send.sh` строку с `nutri_error_logs` заменить на `nutri_error_log`.

### 4. [LOW] Кириллические символы в имени отображаются как `?????` в Supabase
- **Что произошло**: Поле `name` возвращается как `"name":"�����"` или `"name":"��������"` — кодировка UTF-8 ломается при хранении или сериализации.
- **Ожидалось**: `"name":"Владимир"`.
- **Вывод**: Проблема в кодировке при вставке через webhook или хранении в Supabase.

### 5. [LOW] Глобальный паттерн ошибок — `chat.not.found` для всех симуляционных user_id
- **Что произошло**: Все записи в `nutri_error_log` содержат `MAX API /messages?chat_id=99000XXXX: 404 chat.not.found`. Это ожидаемо для stress-test (симуляционные ID не существуют в MAX), но webhook возвращает HTTP 200 вместо graceful degradation.
- **Ожидалось**: Либо skip отправки ответа для несуществующих чатов без записи в error_log (чтобы не засорять), либо отдельный флаг для sim-режима.

---

## Engagement Notes

- **Быстрый онбординг (`profile_short`)**: работает по flow на уровне webhook (200 OK), но данные не сохраняются — UX сломан для этого пути.
- **Команды `/today`, `/week`, `/stats`, `/vitamins`**: все принимаются (200), но ответы недоставимы (MAX chat not found). Нельзя проверить качество ответов без реального мессенджера.
- **Фото-ввод еды**: принят (200), подтверждение тоже. Но в DB logs пусто — AI-разбор фото либо не работает, либо не сохраняется.
- **Слэнг "чо есть?"**: принят, AI chat должен был ответить — не верифицировано из-за недоставимости ответа.
- **Стикер / видео**: приняты без ошибок — graceful degradation работает на уровне приёма.
- **`/reminders` → `reminders_off`**: принято без ошибок.
- **`/delfood`**: принято, но нет food logs для удаления — проверить что бот корректно сообщает об отсутствии записей.
- **`/editprofile` → `edit_weight` → "91"**: принято, но т.к. профиль не был сохранён изначально, weight update не имел базы.

### UX friction points (для персоны таксиста)
- Онбординг через `profile_short` — правильная стратегия для нетерпеливых пользователей, но он сломан.
- Не получив ни одного ответа от бота (MAX chat not found), реальный пользователь бросил бы на 1-м дне.
- `/addfood` + `confirm_food` — логичная двухшаговая схема, но без подтверждающих сообщений обратная связь нулевая.

---

## Raw Errors (from Supabase nutri_error_log, last 20)

Все 20 записей имеют один и тот же паттерн:
```
routeUpdate error: MAX API /messages?chat_id=99000XXXX: 404
{"code":"chat.not.found","message":"Chat 99000XXXX not found"}
```
Затронутые chat_id из других персон (не 24): 990000019, 990000020, 990000022, 990000023, 990000025, 990000027, 990000028, 990000029, 990000010, 990000008.

Ни одной записи специфичной для persona_24 в последних 20 строках — вероятно, события для 990000024 прошли ранее в логе или не вызвали ошибки (webhook принял, но ответ не отправлялся иначе).

### check_user итоговое состояние (день 7)
```json
{
  "id": "0b3459e5-a086-4a02-8e4c-b7443ef54d61",
  "max_user_id": 990000024,
  "name": "??????????",
  "sex": null,
  "age": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": null,
  "onboarding_step": 0,
  "onboarding_completed": false,
  "context_state": "idle",
  "water_glasses": 1,
  "streak_days": 0,
  "subscription_type": "trial",
  "daily_calories": null
}
```

### check_food итоговое состояние
```json
[]
```
(нет записей)

### Таблица nutri_error_log — имя корректное, в sim-send.sh — баг (nutri_error_logs)
