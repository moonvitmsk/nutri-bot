# Persona 12: Алексей (Марафонец)

## Profile
- Age: 27 / Sex: male / Height: 182 cm / Weight: 78 kg / Goal: sport
- User ID: 990000012
- DB UUID: 282f5777-7d10-434d-b385-249b89c68f98
- Personality: Marathon runner, 50+ km/week, carb-loader, nutrient-focused

## Simulation Summary
- Days simulated: 7
- Total events sent: ~100
- Webhook responses: all HTTP 200 `{"ok":true,"processed":1}`
- Errors encountered: 3 critical bugs

## Bugs Found

### 1. [CRITICAL] Onboarding profile fields not persisted (sex, age, height, weight)
- Sent sex_male callback → step advanced, but `sex` remained `null` in DB
- Sent "27" (age), "182" (height), "78" (weight) as text → `age`, `height_cm`, `weight_kg` all `null` in DB
- Goal resolved as `"gain"` instead of `"sport"` (goal_sport callback sent, wrong value stored)
- `onboarding_step` reached 8 and `onboarding_completed: true`, but profile is effectively empty
- Impact: all AI-driven recommendations (calories, vitamins, meal plans) are based on null/wrong profile

### 2. [CRITICAL] Food logs not persisted for this user
- 12+ /addfood commands sent across 7 days, all returned HTTP 200
- confirm_food callback sent after each — all HTTP 200
- `nutri_food_logs` for DB UUID is empty (0 rows)
- `daily_calories: 2883` appears in user record (from onboarding defaults, not actual food)
- Photo food log (pasta image) also not saved
- Root cause likely tied to MAX API "Chat not found" error preventing confirm flow from completing

### 3. [HIGH] MAX API "Chat not found" errors on every send attempt
- All bot responses fail silently: `MAX API /messages?chat_id=990000012: 404 {"code":"chat.not.found"}`
- Webhook returns 200 to simulation, but the bot cannot send any message back to the user
- This means the entire UX is silent — onboarding questions never reach user, food confirmations never shown
- Error logged in `nutri_error_log` as `error_type: "webhook"`, `resolved: false`
- All sim personas (990000008–990000030) trigger this same error — expected for stress test environment, but confirm flow depends on the reply cycle

### 4. [MEDIUM] Name stored as garbled characters
- Name "Алексей" stored as `"�������"` (UTF-8 encoding issue in DB storage or retrieval)
- Likely a character encoding mismatch between the webhook payload and Supabase storage layer

### 5. [MEDIUM] context_state stuck on "editing_goal_text" after Day 6
- After /editprofile → edit_goal_text flow, `context_state` remained `"editing_goal_text"` in final check
- User cannot use other commands normally until state is cleared
- No automatic timeout or escape from editing state observed

### 6. [LOW] Water counter shows only 5 glasses despite 14 /water commands sent (8 on Day 2, 6 on Day 5)
- `water_glasses: 5` in final user record
- Water tracking may reset daily, but 5 is inconsistent even for a single day's 8 glasses
- Or water counter is not incrementing reliably when MAX API reply fails

### 7. [LOW] Wrong table name in SIM_GUIDE.md
- Guide instructs `check_errors` to query `nutri_error_logs` (plural)
- Actual table is `nutri_error_log` (singular) — returns PGRST205 schema error
- Same issue: `nutri_water_logs` table does not exist (water stored in user record field)

## Engagement Notes

- **Features most used**: /addfood (12x), /water (14x), /today, /week, /vitamins, /stats, /mealplan, /recipes
- **Carb-focus is natural for persona**: pasta, rice, oatmeal, banana combos all fit marathon runner profile well
- **Deep check + vitamins flow**: sent /deepcheck → deep_vitamins callback — worked at HTTP level; question about magnesium ("нужен ли мне магний при частых тренировках?") processed successfully
- **Intent detection**: "покажи неделю" sent as free text on Day 6 — should trigger /week intent, outcome unverifiable due to silent reply failure
- **AI memory weight update**: "я вешу 77" sent on Day 6 — context_state suggests it was processed but weight in DB still shows null (original onboarding bug)
- **Video decline**: sent video attachment — expected polite decline, HTTP 200, actual reply unverifiable
- **/invite, /subscribe, /allergy (no args)**: all returned HTTP 200, no errors at webhook level
- **UX friction**: marathon runner persona expects precise nutrient tracking (carbs/protein split); with food logs empty and profile null, bot cannot deliver meaningful nutrition analysis for race preparation

## State at End of Simulation

```json
{
  "max_user_id": 990000012,
  "name": "garbled (encoding bug)",
  "sex": null,
  "age": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": "gain",
  "onboarding_completed": true,
  "onboarding_step": 8,
  "context_state": "editing_goal_text",
  "water_glasses": 5,
  "streak_days": 0,
  "subscription_type": "trial",
  "daily_calories": 2883
}
```

## Raw Errors (from nutri_error_log)

All errors follow the same pattern — MAX API chat.not.found for sim user IDs:
```
routeUpdate error: MAX API /messages?chat_id=990000012: 404
{"code":"chat.not.found","message":"Chat 990000012 not found"}
```
Source: `src/handlers/router.ts:30` → `trackError` at `src/services/error-tracker.ts:16`

This error is systemic across all sim personas (990000008–990000030) and is expected in stress-test environment where chat IDs are synthetic and not registered in MAX. However, the confirm_food flow appears to depend on the reply cycle — when replies fail, food is not committed to the DB.

## Recommendations

1. **Decouple food confirmation from MAX reply** — confirm_food should persist to DB regardless of whether the reply message succeeds
2. **Fix onboarding field persistence** — sex/age/height/weight callbacks and text inputs are not being saved to DB
3. **Fix name encoding** — Cyrillic names corrupted in DB; check charset in webhook JSON parsing or Supabase insert
4. **Clear context_state after timeout or on next command** — editing states should not block future interactions indefinitely
5. **Fix SIM_GUIDE.md table name** — `nutri_error_logs` → `nutri_error_log` (singular)
