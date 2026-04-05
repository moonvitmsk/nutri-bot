# Persona 27: Полина

## Profile
- Age: 20 / Sex: female / Height: 169 cm / Weight: 52 kg / Goal: gain
- User ID: 990000027
- DB UUID: fc77213a-f192-4f54-ac62-bff97d07bbac
- Phone: +79001000027
- Personality: студентка, худенькая, хочет набрать, пишет с эмодзи, ест мало и нерегулярно

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- All webhook responses: HTTP 200 `{"ok":true,"processed":1}` (except 2 emoji encoding failures)
- Errors encountered: 3 categories of bugs found

---

## Bugs Found

### 1. [CRITICAL] Name stored as garbled bytes — encoding corruption
- **What happened**: name "Поля" sent during onboarding → stored in DB as `������`
- **Expected**: `name = "Поля"`
- **Actual**: `name = "������"` (UTF-8 mojibake)
- **Impact**: user's name will appear corrupted in all bot replies

### 2. [CRITICAL] age, height_cm, weight_kg not saved — all null after full onboarding
- **What happened**: user sent "20" (age), "169" (height), "52" (weight) during onboarding steps 4/5/6 → all fields remain `null`
- **Expected**: `age=20, height_cm=169, weight_kg=52`
- **Actual**: `age=null, height_cm=null, weight_kg=null`
- **Impact**: daily_calories calculated incorrectly (shows 2587 kcal, but BMR/TDEE cannot be properly computed without age/height/weight); personalized advice broken

### 3. [CRITICAL] Food logs not linked to user — nutri_food_logs always empty for this user
- **What happened**: 10+ food entries sent across 7 days, confirmed via callback → `nutri_food_logs?user_id=eq.<DB_UUID>` returns `[]`
- **Expected**: food entries stored with `user_id = fc77213a-...`
- **Actual**: empty; global food logs exist but belong to other users
- **Impact**: /today, /week, /stats commands have no data to show; core feature non-functional for sim users

### 4. [MEDIUM] water_glasses counter only 1 despite 3 /water events
- **What happened**: sent /water on Day 2 (1x) and Day 4 (2x) = 3 total
- **Expected**: `water_glasses >= 3`
- **Actual**: `water_glasses = 1`
- **Impact**: water tracking unreliable; streak/gamification affected

### 5. [MEDIUM] last_food_date stays null
- **What happened**: food added across multiple days, but `last_food_date` on user record never updated
- **Expected**: `last_food_date` = date of most recent food log
- **Actual**: `null`
- **Impact**: streak_days stays at 0; daily engagement tracking broken

### 6. [LOW] SIM_GUIDE.md documents wrong error log table name
- **What happened**: guide says `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular)
- **Response**: `PGRST205 - Could not find the table 'public.nutri_error_logs'`
- **Fix**: update SIM_GUIDE.md line 99

### 7. [LOW] sim-send.sh bash emoji encoding fails when using `\Uxxxxxx` escape sequences
- **What happened**: Day 6 free-text messages with emoji ("привет 😊", "спс за советы 💪") sent via `\U0001F60A` / `\U0001F4AA` bash escapes → webhook returned `{"ok":true,"error":"Invalid JSON"}`
- **Expected**: emoji processed normally
- **Actual**: JSON parse failure at webhook level
- **Workaround**: using `--data-raw` with literal UTF-8 emoji characters works correctly
- **Fix**: sim-send.sh send_text() should encode emoji via `printf` with native UTF-8, not `\U` escapes in double-quoted strings

---

## Engagement Notes

### Features used
- /addfood — primary feature, used every day (10+ calls) — responded ok but data lost
- /today, /week, /stats — summary commands responded ok
- /recipes + recipe_snack — button flow worked
- /mealplan + mealplan_today — worked
- /deepcheck + deep_diet — worked
- /vitamins — worked (generic, no personalization possible without weight/age)
- /editprofile + edit_weight — flow accepted "52.5" input
- /invite, /subscribe, /help, /allergy, /reminders + toggle_evening — all responded ok
- food photo (image attachment) — accepted ok
- sticker — accepted ok (graceful handling confirmed)
- free text "как набрать вес если не хочется есть?" — handled by AI

### Natural / unnatural UX
- Name change flow (name_change callback → send text) feels natural for a 20-year-old
- Emoji in messages is very natural for this persona; the encoding bug would confuse her
- Confirming food via button is natural but she'd expect to see a logged history
- Student eating pattern (skipping meals, convenience food) handled without errors

### UX friction points
- No feedback shown when profile fields fail to save — onboarding appears successful but data is silently lost
- /today with no food data likely shows empty or error — no test confirmation
- Water tracking reset or not accumulating creates frustration for engaged users
- Name corruption: if bot greets her as "������" she would be confused and likely churn

---

## Raw Errors (from Supabase nutri_error_log)

All 20 recent errors belong to **other personas** (990000014, 990000016, 990000018, 990000022, 990000026) — all same pattern:

```
routeUpdate error: MAX API /messages?chat_id=990000016: 404
{"code":"chat.not.found","message":"Chat 990000016 not found"}
```

This is a **systemic issue**: bot tries to send a MAX API reply message but the simulated chat IDs do not exist in MAX messenger → every outbound message fails with 404 → error logged but webhook returns 200.

This means **all bot responses are silently dropped** for all sim personas — the bot processes input correctly but cannot deliver output. This also explains why food logs may be partially written (input side works) but the confirmation UX is invisible to the user.

**No errors specific to persona 27 found** in the last 20 error log entries — her errors likely happened earlier and scrolled out of the 20-entry window, or were suppressed by the MAX 404 pattern.

---

## Final DB State (verified)

| Field | Expected | Actual |
|---|---|---|
| name | Поля | ������ (corrupted) |
| sex | female | female ✓ |
| age | 20 | null ✗ |
| height_cm | 169 | null ✗ |
| weight_kg | 52 | null ✗ |
| goal | gain | gain ✓ |
| onboarding_completed | true | true ✓ |
| onboarding_step | 8 | 8 ✓ |
| water_glasses | 3+ | 1 ✗ |
| streak_days | 7 | 0 ✗ |
| last_food_date | 2026-04-04 | null ✗ |
| food_logs count | 10+ | 0 ✗ |
| subscription_type | trial | trial ✓ |
