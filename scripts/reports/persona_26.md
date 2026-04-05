# Persona 26: Фёдор

## Profile
- Age: 29 / Sex: male / Height: 190 cm / Weight: 95 kg / Goal: sport (пловец)
- User ID: 990000026
- DB ID: 6b3feb99-00c0-4ac6-88e6-a362d43f6fbe
- Phone: +79001000026
- Expected daily calories: ~3500+ kcal (sport goal, high volume)
- Actual daily_calories stored: 4057 (based on corrupted profile: age=95, weight=190kg)

## Simulation Summary
- Days simulated: 7
- Total events sent: ~80+
- HTTP 200 responses: 100% (all webhook calls accepted)
- Food logs created: 0 (all 7 days — zero entries in nutri_food_logs)
- Water glasses logged: 14 (Days 2-3 combined, water logging works)
- Errors in nutri_error_log: 10+ for chat_id 990000026 (MAX API 404 — chat.not.found)

## Bugs Found

### 1. [CRITICAL] Food logging pipeline completely broken for simulated users
- **What happened**: Every /addfood attempt (20+ across 7 days) returned HTTP 200 but zero food entries were saved to `nutri_food_logs`
- **What was expected**: Each confirm_food should create a confirmed food log entry
- **Root cause**: When bot tries to send response via MAX API (`/messages?chat_id=990000026`), it gets `404 chat.not.found`. This exception propagates and prevents the food entry from being committed to DB — even unconfirmed entries are not stored
- **Impact**: High volume logging scenario (6 meals/day) completely untestable; no calorie data for the user
- **Error logged**: `routeUpdate error: MAX API /messages?chat_id=990000026: 404 {"code":"chat.not.found","message":"Chat 990000026 not found"}`
- **Reproduced consistently**: Every addfood attempt across all 7 days

### 2. [CRITICAL] Onboarding data corruption — inputs saved to wrong fields
- **What happened**: During onboarding, the value "95" (weight) was stored in the `age` field, and "190" (height) was stored in `weight_kg`
- **What was expected**: age=29, height_cm=190, weight_kg=95
- **What was stored**: age=95, height_cm=190, weight_kg=190.0
- **Root cause**: The bot processes multiple rapid input events and loses step state — when many inputs are sent in quick succession, steps can skip or mis-align. The "95" value (sent for weight at step 6) was interpreted as age (step 4) due to state de-sync from MAX API error propagation
- **Impact**: Profile is completely wrong; daily_calories=4057 calculated on a fictional 190kg/95yo man, not a 95kg/29yo swimmer

### 3. [HIGH] User creation not idempotent — first 2 bot_started calls for 990000026 silently failed
- **What happened**: First 2 `bot_started` webhook calls returned HTTP 200 but no user was created in Supabase. Only the 3rd attempt (with a different curl approach) succeeded
- **What was expected**: First bot_started creates the user record
- **Root cause**: Unknown — possibly timing or encoding issue with the JSON payload containing Cyrillic name. Other persona IDs (27, 28, 29, 30) were all created simultaneously while 26 was missing
- **Impact**: User creation is unreliable; stress test would show race conditions or silent failures

### 4. [HIGH] name_confirm callback does not advance onboarding step
- **What happened**: Sending `name_confirm` callback at onboarding_step=1 did not advance the step. Only sending text "Фёдор" advanced it to step 2
- **What was expected**: name_confirm callback at step 1 should confirm the name from bot_started and advance to sex selection
- **Root cause**: The bot at step 1 (after contact/phone) appears to expect free-text name input, not the name_confirm callback. The name was already set from bot_started but the flow still requires text confirmation
- **UX impact**: Users who tap "Подтвердить имя" button after sharing contact will be confused — button press does nothing; they must type their name again

### 5. [MEDIUM] Cyrillic name encoding broken in Supabase
- **What was stored**: `name: "Ը���"` (garbled encoding)
- **What was expected**: `name: "Фёдор"`
- **Root cause**: Likely UTF-8 encoding issue in how the bot stores the name from bot_started event vs what arrives from the Cyrillic text
- **Impact**: User names with Cyrillic characters (Russian users) are stored as garbage; affects all display and personalization

### 6. [MEDIUM] goal_sport callback not processed — goal saved as "maintain"
- **What happened**: Sending `goal_sport` callback multiple times resulted in `goal=maintain` stored in DB
- **What was expected**: `goal=sport`
- **Root cause**: The onboarding completed (step 8) before the goal_sport callback was processed; the default or previously-set goal "maintain" was used
- **Impact**: Swimmer's sport-specific calorie targets not applied; user gets wrong macros

### 7. [LOW] Water glasses persist across days (no daily reset visible)
- **What happened**: After Days 2 (8 glasses) + Day 3 (6 glasses), `water_glasses=14` total, not reset per day
- **What was expected**: Daily water counter should reset each day OR be stored per-date
- **Note**: May be by design if water_glasses is a cumulative field; needs clarification

### 8. [LOW] Error log table name mismatch in SIM_GUIDE
- **What happened**: SIM_GUIDE.md documents `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular)
- **Impact**: Any script or test using the guide's documented table name will fail with PGRST205

## Engagement Notes

### Features used
- Onboarding (full 8-step flow)
- /addfood + confirm_food (20+ attempts, all failed to save)
- /water (14x, works correctly)
- /today, /week, /stats (sent, HTTP 200, but no data to show)
- /vitamins, /deepcheck → deep_diet (sent)
- /mealplan → mealplan_custom + custom text (sent)
- /recipes → recipe_custom + custom text (sent)
- Food photo (image attachment, sent)
- /editprofile → edit_goal_text (sent)
- /delfood (sent, no food to delete)
- /allergy → text response (sent)
- /subscribe (sent)
- Sticker (sent)
- Free text "сколько калорий я должен есть?" (sent)

### What felt natural
- Water logging via /water is fast and reliable
- Sending food text after action_addfood is intuitive flow
- The 200 HTTP responses give no indication of backend failure — silent failures are invisible to user/simulator

### UX friction points
- Food logging silently fails with no error message back (since MAX API fails)
- Onboarding requires typing name even when bot already knows it from start event
- No recovery path when onboarding step state gets corrupted
- The swimmer persona (3500+ kcal, 6 meals/day) never gets any food logged — the most critical use case for this persona is entirely blocked

### High-volume logging assessment
- 6 meals/day × 7 days = 42 intended food log events
- Actual food logs created: 0
- Calorie accuracy for large portions: untestable (pipeline broken)
- The 3500+ kcal target is theoretically reachable given the portion sizes in prompts (steak 400g, rice 300g, pasta 300g etc.) but cannot be verified

## Raw Errors (from Supabase error_log)

All errors for this persona follow the same pattern:
```
routeUpdate error: MAX API /messages?chat_id=990000026: 404
{"code":"chat.not.found","message":"Chat 990000026 not found"}
```

Logged at: 2026-04-04T19:22 through 2026-04-04T19:35 (entire simulation window)
Count: 10+ entries visible in last-20 query (likely 40+ total across all food/command attempts)

Secondary error (system-wide, not persona-specific):
```
Table 'public.nutri_error_logs' not found — hint: Perhaps you meant 'nutri_error_log'
```
