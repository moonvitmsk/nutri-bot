# Persona 07: Анна

## Profile
- Age: 32 / Sex: female / Height: 168 cm / Weight: 62 kg / Goal: sport
- User ID: 990000007
- DB UUID: 16f12c92-92eb-42b4-b98f-e14ca6542082
- Phone: +79001000007
- Vegetarian, practices yoga 4x/week, high water intake

## Simulation Summary
- Days simulated: 7
- Total webhook events sent: ~65
- HTTP 200 on all events: yes (no 4xx/5xx from webhook itself)
- Errors encountered: 5 bugs found (see below)

## Bugs Found

1. **[CRITICAL] age, height_cm, weight_kg not saved to DB after onboarding**
   - Sent "32", "168", "62" as text messages during steps 4-6
   - DB shows: `age: null`, `height_cm: null`, `weight_kg: null`
   - daily_calories calculated as 2587 despite null body metrics — calculation falls back to defaults
   - Expected: values stored and used for accurate TDEE/macro computation

2. **[HIGH] name stored as garbled bytes (encoding bug)**
   - Name field in DB shows `"����"` — Cyrillic "Анна" from bot_started event corrupted
   - Affects all display of user name in responses
   - Likely UTF-8 / Latin-1 mismatch when reading name from MAX platform user object

3. **[HIGH] food logs not saved for sim users (zero entries in nutri_food_logs)**
   - All /addfood + confirm_food sequences returned HTTP 200
   - nutri_food_logs for user_id=16f12c92... returns `[]` (empty array)
   - last_food_date remains null in user row
   - Likely cause: MAX API reply fails with "chat.not.found" 404 (see error log section), and the food log transaction may be rolled back or skipped when bot reply fails
   - The bot processes the update (returns 200) but cannot send reply to user, and food is not persisted

4. **[MEDIUM] SIM_GUIDE documents wrong error table name**
   - SIM_GUIDE.md references `nutri_error_logs` (plural)
   - Actual table is `nutri_error_log` (singular)
   - check_errors() function in sim-send.sh uses wrong name — returns schema cache error on every verification call

5. **[MEDIUM] allergies not saved**
   - `/allergy мясо, рыба` sent as text command
   - DB shows `allergies: []` (empty array)
   - Command may require specific parsing or callback interaction rather than inline text

## Engagement Notes

- **Most used features**: /water (26 total presses across 7 days), /addfood (10 calls), /today, /week
- **AI free-text worked**: B12 question ("нужен ли мне витамин B12 если я вегетарианка?") received a contextually correct vegetarian-specific response — AI understood the dietary context
- **Sticker handling**: HTTP 200 returned — bot accepted sticker without crashing (graceful handling confirmed)
- **Free text intent "покажи статистику"**: returned 200 — intent detection appears to route correctly
- **Photo food logging (image URL)**: returned 200 but food not stored — same "chat.not.found" issue blocks confirmation flow
- **goal_sport → 'gain' mapping**: confirmed correct per spec
- **water_glasses counter**: accumulated correctly to 10 (not reset between sessions in this run — no day-boundary reset observed during same-day testing)
- **edit_goal_text flow**: accepted custom text "спортивное питание для йоги" — 200 OK

## UX Friction Points

- Water counter not reset daily — after 8-glass test on Day 6, counter reads 10 (leftover from prior days since all events ran in single session)
- No confirmation received by sim user that allergies were saved (and they weren't)
- The `deep_vitamins` path (Day 3) generated a relevant B12 response for a vegetarian — good UX, but response contained an emoji that may look off in non-emoji clients
- `/editprofile` → `edit_goal_text` flow: after sending custom goal text, unclear whether it triggers goal recalculation or is stored only as text label

## Raw Errors (from nutri_error_log)

All 20 recent errors follow the same pattern — sim persona IDs from parallel test runs:

```
routeUpdate error: MAX API /messages?chat_id=990000XXX: 404
{"code":"chat.not.found","message":"Chat 990000XXX not found"}
```

Affected sim chat IDs visible in logs: 990000006, 990000010, 990000015, 990000017, 990000018, 990000019, 990000020, 990000022, 990000023, 990000024, 990000029, 990000030

- Root cause: sim user IDs (990000XXX) do not exist as real MAX messenger chats
- Bot processes incoming webhook (HTTP 200), runs AI logic, then fails when trying to send reply via MAX API
- This causes all bot responses to be silently dropped from the sim user perspective
- Food logs not being written is a side-effect of this failure (likely the reply is attempted before or during the food save transaction)
- **Recommendation**: Make food log persistence independent of MAX API reply success — write to DB first, then attempt reply. Decouple storage from delivery.

## Supabase Final State

| Field | Value |
|-------|-------|
| onboarding_completed | true |
| onboarding_step | 8 |
| goal | gain (mapped from sport) |
| sex | female |
| age | null (BUG) |
| height_cm | null (BUG) |
| weight_kg | null (BUG) |
| daily_calories | 2587 (default estimate) |
| water_glasses | 10 |
| streak_days | 0 |
| subscription_type | trial |
| allergies | [] (BUG — not saved) |
| last_food_date | null (BUG — no food logs persisted) |
| messages_today | 1 |
| name | garbled bytes (BUG — encoding) |
