# Persona 05: Ольга

## Profile
- Age: 55, Sex: female, Height: 160 cm, Weight: 80 kg, Goal: lose
- User ID: 990000005
- Phone: +79001000005
- Persona: Диабет 2 типа, следит за сахаром, избегает быстрых углеводов

## Simulation Summary
- Days simulated: 7
- Total events sent: 57
- Webhook HTTP 200 responses: 57/57
- Errors logged in nutri_error_log for this user: 0 explicit
- Supabase DB ID: 892cce9f-3568-41a5-9adf-b9cd70dd6a39
- Onboarding completed in DB: false
- Profile fields saved in DB: none (all null)
- Food logs in DB: 0
- Water glasses in DB: 0

## Bugs Found

1. **[CRITICAL] Silent user creation failure on first bot_started**
   - First `bot_started` event returned HTTP 200 / `{"ok":true,"processed":1}` but user was NOT created in Supabase
   - No error was logged in `nutri_error_log` for user 990000005
   - Second `bot_started` retry (sent manually) finally created the user record
   - Root cause unknown — likely a race condition or silent DB constraint violation
   - Expected: user created on first `bot_started` or error logged

2. **[CRITICAL] Onboarding steps silently dropped when user does not yet exist**
   - All 7 onboarding steps (send_contact, name_confirm, sex_female, age, height, weight, goal_lose) returned HTTP 200 but had no effect
   - Because user wasn't in DB yet when these were sent, all onboarding state was lost
   - After the second bot_started created the user, it was at `onboarding_step: 0` with all fields null
   - Expected: steps should be re-processable or queued; at minimum, error should be logged
   - Impact: user stuck at step 0, unable to complete onboarding naturally

3. **[HIGH] Food logs not persisted despite HTTP 200 on all /addfood + confirm_food flows**
   - 9 food entries sent across Days 1–7 (творог, яйца, бульон, рыба, кефир, etc.) — all returned HTTP 200
   - `nutri_food_logs` table shows 0 records for this user
   - Likely because `onboarding_completed = false` blocks food logging (user stuck at step 0)
   - Expected: either food should be accepted regardless of onboarding state, or user should be redirected to complete onboarding

4. **[HIGH] Water counter not incremented despite 7x /water commands**
   - 7 `/water` events sent (4 on Day 2, 3 on Day 4) — all HTTP 200
   - DB shows `water_glasses: 0`
   - Same root cause: incomplete onboarding blocks all feature usage

5. **[MEDIUM] Onboarding step does not advance after name_confirm when user is in "idle" context_state**
   - After the second bot_started, user was in `context_state: idle`, `onboarding_step: 0`
   - Sending subsequent name_confirm, sex, age, etc. returned HTTP 200 but state stayed at step 0
   - The bot appears to silently ignore onboarding callbacks for users who already have a record but were created after the callbacks were sent
   - Expected: bot should prompt user to re-start onboarding if data is missing

6. **[MEDIUM] Table name mismatch in SIM_GUIDE.md**
   - Guide references `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular)
   - Returns `PGRST205: Could not find table 'public.nutri_error_logs'` with hint about correct name
   - Expected: guide should use correct table name

7. **[LOW] No error logged when bot_started silently fails user creation**
   - For user 990000005: first bot_started processed but no user created, no error in log
   - For other users (990000026 etc.) `Welcome card failed` IS logged
   - Inconsistent error tracking: some failures logged, this one not

## Engagement Notes

- **Features used**: /addfood (9x), /water (7x), /vitamins (3x), /deepcheck, /recipes, /mealplan, /profile, /stats, /allergy, /editprofile, /lab, /delfood, /help, /reminders, /week, /today, sticker, free text AI chat
- **Natural flows**: All commands sent at appropriate intervals; diabetic persona vocabulary consistent (no sugar, low-carb, whole grain)
- **UX friction**: The onboarding failure is the dominant blocker — a real 55-year-old diabetic user would be confused receiving no confirmations and unable to track food. Bot returned 200 to all events but sent no replies (MAX API 404 on all sim chat IDs), so from the user's perspective the bot appears completely unresponsive.
- **AI chat tested**: "какие витамины при диабете важны?" (Day 3), "сколько воды пить в день?" (Day 6), "покажи витамины" (intent), "у меня сахар 7.5" (lab edge case) — all returned HTTP 200; responses not verifiable since MAX API replies fail for sim IDs
- **Sticker handling**: sent on Day 6, returned HTTP 200 — no crash
- **/delfood with no confirmed food**: sent Day 6 with argument "1", returned HTTP 200 — no crash observed
- **/lab without photo**: sent command then text "у меня сахар 7.5" — both HTTP 200, no crash

## Raw Errors (from Supabase nutri_error_log)

All errors observed in the system are of the same type — MAX API chat not found for sim IDs:

```
routeUpdate error: MAX API /messages?chat_id=990000005: 404 {"code":"chat.not.found","message":"Chat 990000005 not found"}
```

No errors specific to user 990000005 were logged (first bot_started silently failed without logging).

Systemic error affecting all sim personas:
- Every outbound message attempt fails with MAX API 404
- `Welcome card failed` is logged for some users on bot_started (e.g. 990000026) but not for 990000005
- Error table is `nutri_error_log` (singular), not `nutri_error_logs` as documented

## Final DB State

```json
{
  "id": "892cce9f-3568-41a5-9adf-b9cd70dd6a39",
  "max_user_id": 990000005,
  "name": "Olga",
  "age": null,
  "sex": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": null,
  "onboarding_step": 0,
  "onboarding_completed": false,
  "context_state": "idle",
  "water_glasses": 0,
  "streak_days": 0,
  "food_logs": 0,
  "allergies": [],
  "subscription_type": "trial"
}
```
