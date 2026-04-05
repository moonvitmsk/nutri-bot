# Persona 21: Людмила

## Profile
- Age: 65 / Sex: female / Height: 162 cm / Weight: 70 kg / Goal: maintain
- User ID (max_user_id): 990000021
- DB UUID: 2bc8cb93-0eac-459d-9461-6844c57c4b49
- Phone: +79001000021
- Personality: Elderly grandmother, home-cooking style, non-tech-savvy, writes long and with errors

---

## Simulation Summary
- Days simulated: 7
- Total events sent: 37
- All webhook responses: HTTP 200 / `{"ok":true,"processed":1}`
- Errors encountered: 0 (webhook level) / Critical bugs at data layer
- Food logs confirmed in DB: 0 (all lost — critical)

---

## Bugs Found

### 1. [CRITICAL] Food logs not persisted for text-based /addfood
**What happened:** Every `/addfood` command followed by `confirm_food` callback returned HTTP 200, but `nutri_food_logs` table shows 0 records for this user.
**Expected:** Each confirmed food entry should create a row in `nutri_food_logs` with calories, macros, and `confirmed=true`.
**Impact:** The core food tracking feature is completely broken for this user. All 10 food entries across 7 days (манная каша, щи, кефир/булочка, курица/рис/морковь, борщ/пампушки, пирожки, рыба/пюре, оладьи, суп гороховый) were silently dropped.
**Root cause hypothesis:** The bot likely processes `/addfood` by sending a reply to the MAX API chat, but since `chat_id=990000021` is a simulated/non-existent chat, the MAX API returns `404 chat.not.found`. The food parsing may succeed but the confirm flow fails silently because the reply message can't be sent, preventing state transition.

### 2. [CRITICAL] sex and age not saved after profile_short onboarding
**What happened:** Sent `sex_female` callback and text `"65"` during `profile_short` flow. Onboarding completed (`onboarding_step=8, onboarding_completed=true`), but DB shows `sex=null, age=null`.
**Expected:** `sex='female'`, `age=65` in `nutri_users`.
**Impact:** Personalized calorie/macro targets cannot be calculated correctly. Daily calorie target shows generic value (`daily_calories=2507`) without accounting for age or sex.

### 3. [HIGH] Cyrillic text garbled in DB / AI chat receives corrupted input
**What happened:** Messages in Russian sent via webhook are stored as `"��� � ������� ���?"` (mojibake) in `nutri_messages`. The AI responded to the corrupted text with "Похоже, сообщение сломалось".
**Expected:** Russian UTF-8 text stored and processed correctly.
**Impact:** AI chat is entirely broken for Russian text input. Bot responds with confusion instead of intent parsing. For an elderly user who can only type free-form text, this means the primary interaction mode (natural language) doesn't work.
**Note:** The bot's fallback response ("Вижу только кракозябры") is somewhat graceful, but still a hard failure for non-technical users.

### 4. [HIGH] Multiline text not handled — sent as garbled bytes
**What happened:** Day 6 test with `"каша\nхлеб\nчай"` (newlines in JSON) stored as `"каша\nхлеб\nчай"` — when bash interpreted the string, it became corrupted bytes. Stored in DB as mojibake.
**Expected:** Multiline text (which elderly users often send) should be parsed as multiple food items or concatenated naturally.
**Impact:** A real grandmother typing on a phone may send multiple lines naturally — the bot cannot handle this.

### 5. [HIGH] MAX API chat.not.found errors flood error log
**What happened:** The `nutri_error_log` table contains continuous 404 errors from MAX API for all simulated user IDs (990000017-990000030): `"Chat 990000029 not found"`.
**Expected:** Bot should gracefully degrade when the messaging channel is unavailable — process the update but skip the reply, or log at a lower severity.
**Impact:** For every event processed, an error is thrown and logged. In production stress testing, this generates massive noise that hides real errors. The bot does not have a circuit breaker or silent-fail mode for non-existent chats.

### 6. [MEDIUM] water_glasses not incrementing
**What happened:** Sent `/water` three times (Day 3 x1, Day 5 x2). Final `check_user` shows `water_glasses=0`.
**Expected:** `water_glasses` should be 3 by end of simulation.
**Impact:** Same root cause as food: MAX API 404 prevents state update or reply, so water tracking silently fails.

### 7. [MEDIUM] sim_guide.sh uses `nutri_error_logs` but table is `nutri_error_log`
**What happened:** The `check_errors` function in `sim-send.sh` queries `nutri_error_logs` (with trailing `s`), which returns a 404 PGRST205 error from Supabase.
**Expected:** The helper script should reference the correct table name.
**Impact:** Anyone using the `check_errors()` function gets a Supabase schema error instead of error data.

### 8. [LOW] Name stored as "Lyudmila" not "Людмила"
**What happened:** The sim script used ASCII name `"Lyudmila"` (to avoid bash encoding issues). In a real scenario with Cyrillic names, name storage likely has the same UTF-8 encoding problem as messages.
**Expected:** Russian names (Людмила) should be stored correctly.

---

## UX Accessibility Notes for Elderly Users

### Positive observations
- Bot correctly returns HTTP 200 for all inputs — no crashes from confused inputs
- AI fallback message for corrupted text ("Вижу только кракозябры") is somewhat friendly, though not instructive enough for elderly users
- Onboarding reaches `completed=true` even when sex/age are dropped — prevents hard block
- The `profile_short` path reduces onboarding steps, which is good for elderly users

### UX friction points

1. **Phone sharing**: Elderly users who type "как пользоваться ботом?" instead of sharing phone get no guidance. The bot needs a clear, simple message: "Нажмите кнопку 'Поделиться номером' внизу". Text instructions for non-tech users should be very explicit with button names.

2. **Command-based interface unfamiliar**: A 65-year-old does not instinctively type `/addfood`. Free-text like "я ела кашу" should trigger food logging. The NLU intent routing must work for these phrases, but it cannot work if Russian text is corrupted.

3. **Confirmation callback flow**: After `/addfood`, the bot sends a message with a confirm button. Elderly users may not understand that they need to press the button. If the button doesn't display (due to MAX API failure), the food is never confirmed. There needs to be a timeout-based auto-confirm or a simpler one-step flow.

4. **No /help response for elderly**: `/help` was sent but since all replies fail silently via MAX API 404, the user gets nothing back. For elderly users, no response from a bot is deeply confusing ("is it broken? did it hear me?").

5. **Sticker handling**: Sticker sent on Day 6 — the bot should respond with a friendly message rather than silence. Something like "Хорошее настроение — это здорово! Напишите, что сегодня ели 😊".

6. **Weight loss question from 65-year-old**: "Как мне похудеть в моём возрасте?" sent as AI chat — this is a high-value interaction for elderly persona. Due to encoding bugs, the AI received garbage and couldn't respond helpfully. At this age, nutrition advice needs age-specific context (calcium, protein for muscle preservation).

7. **No reaction to `/allergy` with no args**: The command was accepted (HTTP 200) but with no visual feedback visible in messages table. Elderly users need explicit prompts: "Напишите, на что у вас аллергия, например: глютен, лактоза".

### Features that worked at the HTTP level (but failed silently at delivery)
- `/today`, `/week`, `/vitamins`, `/stats`, `/profile`, `/recipes`, `/reminders`, `/help` — all processed
- All food entries parsed by AI (inferred from processing success)
- Onboarding flow completed end-to-end

---

## Raw Errors (from nutri_error_log)

All errors follow the same pattern — MAX API returns `404 chat.not.found` for simulated user IDs:

```
routeUpdate error: MAX API /messages?chat_id=990000021: 404 {"code":"chat.not.found","message":"Chat 990000021 not found"}
```

This pattern repeats for every simulated persona (990000017 through 990000030). The error is logged with `user_id=null` and `resolved=false`. No errors specific to food processing, encoding, or profile saving were found — those failures happen silently without error logging.

**Total error log entries for simulation session:** 20+ entries, all `error_type: "webhook"`, none resolved.

---

## Recommendations (UX/Elderly Focus)

1. **Fix UTF-8 encoding pipeline** — Russian text must survive webhook → DB → AI round-trip intact. This is a P0 blocker for all Russian-speaking users.
2. **Silent-fail gracefully on MAX API 404** — In test/sim environments, skip reply but still persist data. Alternatively, add a mock reply mode for testing.
3. **Auto-confirm food after timeout** — If user doesn't press confirm within 30 min, auto-confirm. Elderly users forget or don't see the button.
4. **NLU for free-text food entry** — "Я ела кашу" should map to `/addfood`. Required for elderly UX.
5. **Simple onboarding prompts** — At each step, show explicit instructions. E.g., "Нажмите кнопку ниже 👇" with a visual indicator.
6. **Sticker and emoji responses** — Return friendly text when sticker received.
7. **Fix sim-send.sh `check_errors` function** — Change `nutri_error_logs` → `nutri_error_log`.
