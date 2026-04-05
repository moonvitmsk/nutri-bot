# Persona 03: Екатерина

## Profile
- Age: 45, Sex: female, Height: 170 (default), Weight: 75 (declared, not stored)
- Goal: maintain (поддержать вес)
- User ID: 990000003
- DB UUID: 100d154e-5dd6-4808-9dda-ab88b06ace70
- Phone: +79001000003

## Simulation Summary
- Days simulated: 7
- Total events sent: ~50 (onboarding x6, food x14, water x5, commands x10, callbacks x10, edge cases x8)
- Errors encountered: 5 distinct bugs found
- All webhook calls returned HTTP 200 (events accepted)
- All bot responses failed with MAX API 404 (chat not found) — expected for simulated IDs

---

## Bugs Found

### 1. [HIGH] profile_short callback does not work as step 2 — onboarding gets stuck

**What happened:** After `send_contact` → `profile_short` callback, bot does not advance to sex selection. User remains at `onboarding_step=2` with all fields null and `onboarding_completed=false`.

**Expected:** `profile_short` should skip height/weight and send sex selection keyboard.

**Actual:** Step stays at 2. Sending `sex_female`, age `"45"`, and `goal_maintain` after `profile_short` are all ignored. Onboarding only completes after manually sending `name_confirm` → `sex_female` → age → goal.

**Evidence:** After first 6 onboarding events: `onboarding_step=2, onboarding_completed=false, sex=null, age=null`. After resending with `name_confirm` prefix: completes correctly.

---

### 2. [HIGH] Age not saved during profile_short onboarding flow

**What happened:** Sent text `"45"` as age at the correct onboarding step. After completion: `age=null` in DB.

**Expected:** `age=45` stored.

**Actual:** `age` remains `null`. Daily calorie targets were still calculated (`daily_calories=2250`) suggesting defaults or goal-based calculation without actual age.

---

### 3. [HIGH] Food logs not persisted — nutri_food_logs table is always empty

**What happened:** Sent 10+ `/addfood` commands with `confirm_food` callbacks across 7 days. All returned HTTP 200. `nutri_food_logs` table remains empty throughout.

**Expected:** Each confirmed food item saved to `nutri_food_logs`.

**Actual:** Zero rows in `nutri_food_logs` for this user. Bot processes the event (state machine advances to `awaiting_confirm`) but on `confirm_food` the response delivery fails (MAX API 404), and it appears the food record is either not committed or rolled back on delivery failure.

**Hypothesis:** Food save and message send may be coupled — if the MAX API response fails, the DB write is also aborted. This is a critical data persistence issue.

---

### 4. [CRITICAL] Food photo analysis broken — wrong OpenAI API parameter

**What happened:** Existing error in `nutri_error_log` predating this simulation:

```
Food photo error: 400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.
```

**File:** `/vercel/path0/src/handlers/food-photo.ts:89`

**Expected:** Photo sent → AI analyzes → food entry created.

**Actual:** Every food photo fails with OpenAI 400 error. The `max_tokens` parameter must be replaced with `max_completion_tokens` for the current model (likely `gpt-4o` or `o1` series).

---

### 5. [MEDIUM] Allergies not saved via /allergy command

**What happened:** Sent `/allergy глютен, лактоза`. Command accepted (HTTP 200).

**Expected:** `allergies=["глютен","лактоза"]` stored in user record.

**Actual:** `allergies=[]` — array remains empty in final DB check.

---

### 6. [MEDIUM] Name edit not persisted — /editprofile → edit_name → "Катя" ignored

**What happened:** Sent `/editprofile` → `edit_name` callback → text `"Катя"`.

**Expected:** User name updated to "Катя" in DB.

**Actual:** Name field in DB unchanged (still garbled UTF-8 from original registration).

---

### 7. [LOW] Name stored with broken UTF-8 encoding

**What happened:** Name "Екатерина" stored as `"���������"` in Supabase.

**Expected:** Proper Cyrillic name stored.

**Actual:** Mojibake — likely a charset encoding issue in the MAX API name field parsing or DB insert.

---

### 8. [LOW] Water counter undercount — 5 expected, 4 logged

**What happened:** Sent `/water` 5 times total (3x day 2, 2x day 4).

**Expected:** `water_glasses=5`

**Actual:** `water_glasses=4` — one `/water` event appears to have been dropped or deduplicated.

---

### 9. [INFO] SIM_GUIDE.md has wrong table name for error logs

**What happened:** SIM_GUIDE.md check_errors query uses `nutri_error_logs` (plural). Supabase returns `PGRST205: Could not find the table 'public.nutri_error_logs'`.

**Correct table name:** `nutri_error_log` (singular).

---

## Engagement Notes

- **Onboarding friction:** The `profile_short` flow is broken — real users with this persona type (busy mom, wants quick setup) would get stuck at step 2 forever unless they know to press name_confirm. Critical path issue.
- **Food tracking unusable in test env:** Because all food logs fail silently (HTTP 200 back to webhook, but nothing saved), users would see bot "processing" but no diary entries. Zero feedback loop.
- **AI chat (free text):** Commands like "что полезнее — гречка или рис?" and "посоветуй перекус до 200 калорий" are accepted. No way to verify response content due to MAX API 404, but no errors logged either — likely triggered AI handler.
- **Feature access:** `/recipes`, `/mealplan`, `/profile`, `/stats`, `/reminders`, `/week`, `/today`, `/vitamins` — all accepted without errors beyond MAX API delivery failure. Feature routing appears correct.
- **Edge cases accepted cleanly:** Video, sticker, "спасибо" — all HTTP 200, no crashes. Bot handles gracefully at event routing level.
- **streak_days=0** throughout — never increments, possibly tied to food log persistence bug.
- **messages_today=2** at end — suggests message counter works but is very low, possibly only counting AI chat turns.

---

## Final User State (Day 7)

```json
{
  "max_user_id": 990000003,
  "name": "��������� (garbled)",
  "sex": "female",
  "age": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": "maintain",
  "activity_level": "moderate",
  "daily_calories": 2250,
  "daily_protein": 112,
  "daily_fat": 63,
  "daily_carbs": 309,
  "onboarding_completed": true,
  "allergies": [],
  "water_glasses": 4,
  "streak_days": 0,
  "messages_today": 2,
  "context_state": "idle",
  "subscription_type": "trial"
}
```

---

## Raw Errors (from nutri_error_log)

**Systemic (all simulated users):**
```
routeUpdate error: MAX API /messages?chat_id=990000003: 404 {"code":"chat.not.found","message":"Chat 990000003 not found"}
```
This error fires on every outbound message attempt. All simulated chat IDs (990000XXX) are not registered in MAX messenger, so no response is ever delivered. This is expected behavior for stress testing but means no end-to-end flow can be verified via MAX.

**Pre-existing critical bug:**
```
Food photo error: 400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.
at handleFoodPhoto (/vercel/path0/src/handlers/food-photo.ts:89)
```

**SIM_GUIDE.md wrong table reference:**
```
PGRST205: Could not find the table 'public.nutri_error_logs' — perhaps you meant 'public.nutri_error_log'
```
