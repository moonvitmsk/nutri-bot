# Persona 23: Дарья

## Profile
- Age: 27, Sex: female, Height: 174 cm, Weight: 66 kg (updated to 65 via editprofile), Goal: lose
- User ID: 990000023
- DB UUID: d5c9bd5a-30af-40c4-858a-756b1a27f503
- Phone: +79001000023

## Simulation Summary
- Days simulated: 7
- Total events sent: 47
- HTTP 200 responses: 47/47 (webhook accepts all events)
- Errors in nutri_error_log for this user: 15
- All errors: same type — MAX API "chat.not.found" (simulated chat IDs don't exist in the messaging platform)

---

## Bugs Found

### 1. [CRITICAL] Onboarding does not complete — profile data not saved
**What happened:** Full onboarding flow was sent: bot_started → contact → profile_full → name_confirm → sex_female → "27" → "174" → "66" → goal_lose. After all 9 events, DB state shows: age=null, sex=null, height_cm=null, weight_kg=null, goal=null, onboarding_step=1, onboarding_completed=false.
**Expected:** All profile fields populated, onboarding_step=8, onboarding_completed=true.
**Root cause hypothesis:** The bot tries to send a reply message at each step via MAX API, which returns 404 "chat.not.found". The error is thrown and the step state-machine may abort before saving the step's payload. Each callback/text triggers an error in routeUpdate before the user record is updated. The phone was saved (step 1 completed) but subsequent steps (sex, age, height, weight, goal) did not advance.

### 2. [CRITICAL] Food logs not saved — /addfood produces 0 DB entries
**What happened:** Sent 6 /addfood text commands and 2 photo attachments across Days 1–7, all followed by confirm_food callback. DB table nutri_food_logs shows 0 entries for this user.
**Expected:** Each confirmed food entry should produce a row in nutri_food_logs.
**Root cause hypothesis:** Same MAX API delivery failure as above — bot cannot send the AI analysis result back to the user, error aborts the flow before saving the food log entry. Or the food log save is gated on a successful message delivery.

### 3. [HIGH] Name stored as garbled bytes — UTF-8 encoding issue
**What happened:** Name field in DB is "������!" instead of "Дарья!". The Cyrillic name is corrupted.
**Expected:** Name should be stored as valid UTF-8 "Дарья".
**Note:** This could affect display everywhere the name is used (greetings, profile, reports).

### 4. [HIGH] Onboarding partially recovers state but inconsistently
**What happened:** After Day 5 edit_weight flow, weight_kg was updated to 65.0 and onboarding_step advanced to 2. Daily calories (2430 kcal), protein (104g), fat (68g), carbs (351g) were computed and stored. However, sex, age, goal remain null.
**Expected:** editprofile → edit_weight should update the weight without changing onboarding state. The fact that it advanced onboarding_step to 2 suggests editprofile flow is colliding with the onboarding state machine.

### 5. [MEDIUM] delfood_0 callback with empty food log — no graceful error
**What happened:** /delfood was called and then delfood_0 callback was sent, but no food had been actually saved (see Bug #2). The webhook returned 200 OK regardless. No user-facing error about empty list.
**Expected:** If no food entries exist, /delfood should display "Нет блюд для удаления" before showing an empty list.

### 6. [MEDIUM] SIM_GUIDE.md references wrong table name
**What happened:** SIM_GUIDE.md check_errors query uses `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular). Query returns PGRST205 error.
**Expected:** Documentation should match the actual schema.

### 7. [LOW] water_glasses counter works correctly
**What happened:** 7 /water commands sent across Days 2 and 4, water_glasses=7 in final state.
**Expected:** Correct. This confirms water tracking works even when MAX API message delivery fails — the counter is persisted before the reply attempt, or the reply failure is handled gracefully here (unlike food logs).

---

## Engagement Notes

### Features used
- /addfood (text): 6 times — 0 successful DB saves
- /addfood (photo): 2 times — 0 successful DB saves
- confirm_food: 8 times — all accepted, none persisted
- /water: 7 times — all persisted correctly
- /today, /week, /stats, /profile: accepted, no verifiable output
- /deepcheck → deep_diet: accepted
- /recipes → recipe_lunch: accepted
- /mealplan → mealplan_today: accepted
- /delfood → delfood_0: accepted
- /editprofile → edit_weight: partially worked (weight saved, step advanced)
- /editprofile → edit_goal_text: accepted, goal_text not verifiable in DB
- /invite, /subscribe, /help: accepted
- Free-text conversational UX (привет, что съесть, покажи что ела, вода): accepted

### UX friction points (from persona perspective — Дарья as a marketer evaluating UX)

1. **Onboarding broken in simulation mode** — the core new-user funnel is non-functional when the delivery channel is unavailable. From a real user's perspective this would be a complete drop-off: user sends phone → nothing happens → confused → leaves. The UX flow must be resilient to delivery failures and should at minimum save state before sending messages, not after.

2. **Food photo flow completely silent** — a marketeer who photographs food for Instagram would send a photo, see nothing, and assume the bot is broken. There is no indication the photo was received or processed. Zero feedback = zero trust.

3. **No feedback on water either** — water clicks are saved but from the UX side there is no confirmation message delivered. Users have no way to know the counter incremented.

4. **Conversational NLP inputs are black holes** — "что мне съесть на ужин?" and "покажи что я ела" produce 200 OK at the webhook but no verifiable AI chat response or intent routing is observable from the outside. If the AI chat handler is not connected or fails silently, free-text UX feels unresponsive.

5. **editprofile state collision** — editing weight from editprofile advances the onboarding_step counter, suggesting the bot may re-enter onboarding flow partially. This is confusing for a returning user.

6. **No daily_calories recalculation after goal_text edit** — macros (2430 kcal, etc.) were set when editprofile edit_weight ran. After edit_goal_text ("минус 5 кг к лету") the nutritional targets were not updated, and goal remains null in DB.

### What felt natural
- Command structure (/addfood, /water, /today) is clear and predictable
- Callback-based confirmation (confirm_food) is a sensible pattern
- deepcheck → deep_diet selection pattern is logical

### What felt unnatural
- No in-flow feedback at any stage during simulation
- Onboarding with 8 sequential steps is long for a messaging bot — users expect faster onboarding (profile_short/profile_skip exist but were not tested here)
- /delfood with no food entries should short-circuit to a friendly message, not silently do nothing

---

## Final DB State (Day 7)

| Field | Value |
|-------|-------|
| onboarding_step | 2 |
| onboarding_completed | false |
| age | null |
| sex | null |
| height_cm | null |
| weight_kg | 65.0 |
| goal | null |
| water_glasses | 7 |
| daily_calories | 2430 |
| streak_days | 0 |
| last_food_date | null |
| subscription_type | trial |
| free_analyses_used | 0 |

---

## Raw Errors (from nutri_error_log)

All 15 errors for chat_id=990000023 are identical in type:

```
routeUpdate error: MAX API /messages?chat_id=990000023: 404
{"code":"chat.not.found","message":"Chat 990000023 not found"}
```

Triggered by:
- bot_started (1 error)
- message_callback (14 errors — all callbacks: profile_full, name_confirm, sex_female, goal_lose, confirm_food x8, delfood_0, deep_diet, recipe_lunch, mealplan_today, edit_weight, edit_goal_text)

Text messages (/addfood, /water, /today etc.) do NOT appear in error logs — their errors may be swallowed silently or the message_created path has a different error handler that does not log to nutri_error_log.

**Note:** SIM_GUIDE.md documents the table as `nutri_error_logs` (plural). Actual table is `nutri_error_log` (singular). All SIM_GUIDE check_errors queries will fail with PGRST205 unless corrected.
