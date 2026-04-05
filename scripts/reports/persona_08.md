# Persona 08: Максим (Бизнесмен)

## Profile
- Age: 40, Sex: male, Height: 178 cm, Weight: 95 kg, Goal: lose
- User ID: 990000008
- DB UUID: 4b34e8ad-2893-4ce2-ad66-15709a6a9d3c
- Personality: Бизнесмен, бизнес-ланчи, рестораны, мало времени

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- HTTP 200 responses: all (100%)
- Errors encountered: 4 logged in nutri_error_log (all MAX API 404)
- Food logs saved: 0
- Onboarding completed: false (stuck at step 2)

## Bugs Found

### 1. [CRITICAL] bot_started без поля `chat` не создаёт пользователя
- **Что произошло**: 4 попытки отправить `bot_started` по шаблону из SIM_GUIDE вернули HTTP 200 `{"ok":true}`, но пользователь не создался в nutri_users. user_id=990000008 отсутствовал в базе после каждого вызова.
- **Причина**: SIM_GUIDE шаблон для `bot_started` не включает поле `chat`. При добавлении `"chat":{"chat_id":$UID,"type":"dialog"}` пользователь успешно создался.
- **Ожидалось**: Пользователь создаётся по `user_id` из `update.user.user_id`, независимо от поля `chat`.
- **Версия из SIM_GUIDE**: `{"updates":[{"update_type":"bot_started","timestamp":TS,"user":{"user_id":UID,"name":"NAME"},"chat_id":UID}]}`
- **Работающая версия**: добавить `"chat":{"chat_id":UID,"type":"dialog"}` в тело события.

### 2. [CRITICAL] Онбординг не продвигается дальше step 2 — MAX API 404 блокирует state transitions
- **Что произошло**: После создания пользователя через `bot_started` (с полем `chat`) и отправки контакта пользователь перешёл на шаг 2. Все последующие callbacks (`profile_short`, `sex_male`, `goal_lose`) и текстовые ответы (age=40) вернули HTTP 200, но step остался на 2, sex/age/goal — null.
- **Причина**: Бот пытается отправить ответ через MAX API `/messages?chat_id=990000008` до или вместо сохранения состояния. Получив 404, бот выбрасывает исключение, которое откатывает изменение шага онбординга.
- **Ожидалось**: State должен сохраняться до отправки reply. Ошибка доставки сообщения не должна отменять изменение состояния пользователя.

### 3. [CRITICAL] /addfood не создаёт записи в nutri_food_logs при неполном онбординге
- **Что произошло**: Отправлено 10+ команд `/addfood` с разнообразной едой (стейк, борщ, суши, пицца, лазанья, сырники и т.д.) + `confirm_food` callbacks. Таблица `nutri_food_logs` для этого пользователя осталась пустой.
- **Ожидалось**: Если бот принимает команду и отвечает HTTP 200, еда должна фиксироваться в логах. Либо бот должен явно отказывать в обработке пока онбординг не завершён.
- **Связь с багом #2**: Бот не может сохранить еду, т.к. MAX API 404 прерывает всю цепочку.

### 4. [HIGH] /editprofile + edit_weight/edit_height не сохраняют данные
- **Что произошло**: Отправлены последовательности `/editprofile` → `edit_weight` callback → "95" и `/editprofile` → `edit_height` callback → "178". В итоге: `height_cm: null`, `weight_kg: null`.
- **Ожидалось**: Ручное редактирование профиля должно работать независимо от онбординга.

### 5. [MEDIUM] Дублирующийся silent 200 при bot_started без chat — нет ни ответа пользователю, ни ошибки в лог
- **Что произошло**: `bot_started` без поля `chat` возвращает `{"ok":true,"processed":1}` но ничего не делает — ни запись в nutri_users, ни запись в nutri_error_log.
- **Ожидалось**: Либо создать пользователя, либо вернуть ошибку валидации. Тихое игнорирование сбивает с толку при симуляции.

### 6. [MEDIUM] SIM_GUIDE шаблон bot_started неверный (не включает поле chat)
- **Что произошло**: Документация в SIM_GUIDE.md задаёт шаблон без поля `chat`, который не работает.
- **Исправление**: Добавить в шаблон `"chat":{"chat_id":USER_ID,"type":"dialog"}`.

### 7. [LOW] water_glasses инкрементируется (=1) при незавершённом онбординге
- **Наблюдение**: `/water` сработал один раз — `water_glasses = 1` в базе, хотя онбординг не завершён и остальные команды не работают. Непоследовательное поведение — `/addfood` блокируется, `/water` — нет.

## Engagement Notes
- Персонаж-бизнесмен вводит реалистичную ресторанную еду: бизнес-ланч, суши, стейк, пицца, лазанья — хорошо для тестирования AI парсинга.
- `/addfood` с составными блюдами (бизнес-ланч: борщ, котлета по-киевски, рис, компот) — типичный паттерн для ресторанного пользователя.
- Отправка фото еды из ресторана через image URL — тест распознавания блюд по фото.
- `action_restaurant` callback перед фото — тестирование специального режима.
- Free text запросы "как похудеть не отказываясь от ресторанов?" — AI intent.
- `/deletedata` + `cancel_delete` — тест cancel flow пройден (HTTP 200).
- `/promo MOONVIT` — невалидный промокод (HTTP 200, результат неизвестен из-за MAX 404).
- Весь цикл из 7 дней отправлен без сбоев HTTP, но функционально заблокирован на уровне state machine.

## UX Friction Points
- Онбординг через `profile_short` (быстрый) не работает в симуляции из-за MAX API 404 — пользователь навсегда застрял на step 2.
- Реальный бизнесмен с мало времени получит broken experience: отправил еду — ничего не сохранилось, профиль не заполнен.
- Сценарий "позже укажу вес и рост через /editprofile" (характерно для короткого онбординга) полностью сломан.

## Raw Errors (from nutri_error_log)

```
routeUpdate error: MAX API /messages?chat_id=990000008: 404 {"code":"chat.not.found","message":"Chat 990000008 not found"}
— context: {update_type: message_callback}   [x4 entries]

(additional errors from concurrent sim users 990000001-990000030 share same pattern)
```

## Final DB State (end of Day 7)

| Field | Value |
|---|---|
| max_user_id | 990000008 |
| name | Maksim Busines |
| sex | null |
| age | null |
| height_cm | null |
| weight_kg | null |
| goal | null |
| onboarding_step | 2 |
| onboarding_completed | false |
| context_state | idle |
| water_glasses | 1 |
| streak_days | 0 |
| food_logs count | 0 |
| messages count | 0 |
| subscription_type | trial |

## Key Technical Note

Пользователь создаётся только если `bot_started` содержит поле `chat`:
```json
{
  "updates": [{
    "update_type": "bot_started",
    "user": {"user_id": 990000008, "name": "Maksim"},
    "chat_id": 990000008,
    "chat": {"chat_id": 990000008, "type": "dialog"}
  }]
}
```
Без поля `chat` — silent failure (HTTP 200, пользователь не создаётся, ошибка не логируется).
