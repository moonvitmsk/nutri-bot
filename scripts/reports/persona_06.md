# Persona 06: Сергей

## Profile
- Age: 30, Sex: male, Height: 185 cm, Weight: 85 kg, Goal: healthy (mapped to maintain)
- User ID: 990000006
- DB ID: 61f11308-7ca0-41ac-a0d6-11d2d1764269
- Phone: +79001000006
- Persona: IT-шник, работает из дома, доставка еды, хочет healthier eating без фанатизма

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- Webhook HTTP 200 responses: 55/55 (all OK)
- Supabase DB created: yes (on first bot_started)
- Onboarding completed in DB: true (goal=maintain, step=8)
- Food logs in DB: 0
- Water glasses in DB: 3 (partially working)
- Birth date in DB: null (editprofile failed)
- Phone in DB: null (contact not saved)

## Bugs Found

1. **[CRITICAL] goal_healthy callback does not complete onboarding**
   - Sent `goal_healthy` callback per persona spec — returns HTTP 200 but `goal` stays null and `onboarding_completed` stays false
   - `goal_maintain` callback works correctly: sets goal=maintain, step=8, onboarding_completed=true
   - The `goal_healthy` payload is listed in SIM_GUIDE.md as a valid goal callback but appears unmapped in the bot handler
   - Required two extra attempts (first goal_healthy ×2 failed, then goal_maintain succeeded) to complete onboarding
   - Expected: `goal_healthy` should either set goal='healthy' or map to 'maintain' and complete onboarding

2. **[CRITICAL] Food logs not persisted — all /addfood flows return HTTP 200 but save nothing**
   - Sent 10+ /addfood commands across all 7 days (pizza, sushi, burger, scrambled eggs, pasta, salad, etc.)
   - All returned `{"ok":true,"processed":1}`
   - `nutri_food_logs` table shows 0 records for user 61f11308
   - Root cause: bot attempts to send AI analysis reply to MAX API before saving food, but MAX returns 404 for sim chat IDs — the whole flow aborts before DB write
   - Confirms systemic issue: food save is gated behind outbound reply success
   - Expected: food analysis and DB write should happen before/independent of reply delivery

3. **[HIGH] Phone number not saved from contact attachment**
   - Sent contact attachment with `vcfPhone: +79001000006` per onboarding step 1
   - Bot returned HTTP 200, `onboarding_step` advanced to 1
   - Final DB state: `phone: null`
   - Expected: phone should be persisted from the contact payload

4. **[HIGH] Cyrillic name stored as garbled bytes**
   - Name "Сергей" appears as `������` in the DB
   - Affects all Russian-name users (confirmed in other personas too)
   - Likely a UTF-8 encoding issue in the MAX webhook payload parsing or Supabase storage
   - Expected: Cyrillic names should be stored correctly

5. **[HIGH] editprofile birth_date not saved**
   - Sent `/editprofile` → `edit_birth` callback → `15.06.1996` text
   - All returned HTTP 200; context_state was `editing_goal_text` after (stuck from prior edit)
   - Final DB: `birth_date: null`
   - Context got stuck at `editing_goal_text` after the goal text edit (outbound reply failed, context not cleared)
   - When edit_birth was sent, the stuck context may have misrouted the "15.06.1996" text
   - Expected: birth_date should be saved; context_state should reset to idle after each edit completes or fails

6. **[MEDIUM] context_state stuck after failed editprofile reply**
   - After sending goal text in `/editprofile` flow, `context_state` remained `editing_goal_text` instead of resetting to `idle`
   - This is because the success reply to MAX fails (404), and the context reset happens in the reply callback, not before
   - Subsequent commands (including edit_birth) were processed while in wrong context
   - Expected: context_state should be reset to idle after processing input, regardless of reply delivery success

7. **[MEDIUM] weight update via AI text ("я вешу 83") not applied**
   - Sent free text "я вешу 83" on Day 6 expecting AI memory update
   - Bot returned HTTP 200, but `weight_kg` remained 85.0 in DB
   - Expected: bot should parse weight from natural language and update user record

8. **[LOW] Table name mismatch in SIM_GUIDE.md**
   - Guide documents `nutri_error_logs` (plural), actual table is `nutri_error_log` (singular)
   - Returns: `PGRST205: Could not find table 'public.nutri_error_logs'`
   - Expected: guide should reference the correct table name

9. **[INFO] Water tracking partially works**
   - Sent 8 /water commands total across all days
   - Final DB shows `water_glasses: 3` — some /water commands incremented the counter, others did not
   - Inconsistency suggests /water may increment counter before the reply attempt (unlike food flow), but not always
   - Expected: consistent increment on every /water command

## Engagement Notes

- **Features used**: /addfood (10x), /water (8x), /today (2x), /week (1x), /vitamins (1x), /deepcheck + deep_full (1x), /stats (1x), /recipes + recipe_custom (1x), /mealplan + mealplan_custom (1x), /editprofile × 2 (goal_text, birth), /delfood (2x), /allergy (1x), /reminders + toggle_evening (1x), /promo (1x), /invite (1x)
- **AI chat**: 3 free text messages sent ("как работает подсчёт калорий?", "что лучше — кето или палео?", "привет, как дела?") — all processed, replies not verifiable
- **Video**: sent video attachment on Day 6 — HTTP 200, no crash
- **Natural flow**: persona's delivery-food pattern felt realistic; /addfood with long descriptive strings (суши сет 16 штук, соевый соус, имбирь) handled without crash
- **UX friction**: entire day's logging experience would be invisible to the real user — bot processes food but sends no confirmation, leaving user with zero feedback. For an IT persona who expects quick feedback, this would cause immediate churn.
- **/delfood with no food**: sent twice — returned HTTP 200, no crash; behavior unverifiable since no food was saved
- **/promo MOONVIT2026**: returned HTTP 200; promo validation/subscription result not verifiable

## Raw Errors (from Supabase nutri_error_log)

Systemic error pattern for all sim user IDs during this session:

```
routeUpdate error: MAX API /messages?chat_id=990000006: 404 {"code":"chat.not.found","message":"Chat 990000006 not found"}
```

This error fires for every outbound message attempt. All 990000XXX chat IDs are synthetic and don't exist in the MAX messenger network, so every bot reply fails. This is expected behavior for simulation testing but reveals that the bot's food-saving logic is coupled to reply delivery — a design issue affecting production resilience (e.g. if MAX API is temporarily down, food logs would be lost).

## Final DB State

```json
{
  "id": "61f11308-7ca0-41ac-a0d6-11d2d1764269",
  "max_user_id": 990000006,
  "name": "������",
  "age": 30,
  "sex": "male",
  "height_cm": 185,
  "weight_kg": 85.0,
  "goal": "maintain",
  "activity_level": "moderate",
  "allergies": [],
  "daily_calories": 2885,
  "daily_protein": 136,
  "daily_fat": 80,
  "daily_carbs": 405,
  "onboarding_step": 8,
  "onboarding_completed": true,
  "context_state": "idle",
  "subscription_type": "trial",
  "water_glasses": 3,
  "streak_days": 0,
  "last_food_date": null,
  "birth_date": null,
  "phone": null,
  "messages_today": 0,
  "photos_today": 0,
  "free_analyses_used": 0
}
```
