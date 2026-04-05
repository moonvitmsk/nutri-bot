# Persona 14: Pavel

## Profile
- Age: 33 (entered), stored as 88 (bug — field collision during onboarding)
- Sex: male
- Height: 176 cm
- Weight: 88.5 kg entered, updated to 87.0 on Day 5 edit
- Goal: "lose" intended — stored as "maintain" (bug — first successful goal callback wins)
- User ID: 990000014
- DB UUID: ae6e292b-0e84-45ad-a371-aa272d7a54b8

## Simulation Summary
- Days simulated: 7
- Total events sent: ~70
- HTTP errors: 0 (all 200)
- DB-level food logs saved: 0
- Water glasses saved: 4 (working)
- Weight edit (Day 5): working — 88.5 → 87.0

## Bugs Found

1. [CRITICAL] Food logs never saved — all /addfood + confirm_food pairs return HTTP 200 but nutri_food_logs table remains empty. Root cause: the bot processes food analysis via AI, then attempts to send the reply via MAX API. When MAX API returns 404 (chat not found for simulated user IDs), the entire operation is abandoned without persisting the food log. Food data is lost on every MAX API failure. Expected: food log should be saved to DB before attempting reply delivery.

2. [HIGH] Onboarding weight field rejects integer input — at onboarding step 5, sending "88" (integer) does not advance the step and does not save weight_kg. The field stays null indefinitely. Only "88.5" (decimal float) succeeded. Integers like "88", "100", "70" all silently fail. Expected: any valid numeric input (integer or decimal) should be accepted for weight.

3. [HIGH] Onboarding age field receives wrong value — during initial onboarding, "33" was sent for age but the value "88" (intended as weight, sent earlier in a duplicate sequence) was stored in the age column. The onboarding state machine does not properly sequence the age input when multiple numeric inputs arrive in quick succession. Final stored age: 88 instead of 33.

4. [MEDIUM] Goal not saved as intended — user sent "goal_lose" callback multiple times during onboarding, all returned HTTP 200, but goal was ultimately saved as "maintain" (the first goal callback that arrived when the step was ready). The bot silently accepts goal callbacks at wrong steps without error, then saves the first one that hits at the right step — which may not match user intent. Expected: only the final confirmed goal selection should be saved, or the bot should reject goal callbacks when not at the goal step.

5. [MEDIUM] name_confirm callback does not advance onboarding step — after contact is sent (step goes to 1), sending name_confirm callback keeps step at 1 instead of advancing to 2. The bot appears to skip the name confirmation step silently. Sex selection (sex_male) then jumps from step 1 directly to step 3. Expected: step should advance 1 → 2 after name_confirm.

6. [LOW] SIM_GUIDE documents "nutri_error_logs" table name — the actual table is "nutri_error_log" (no trailing s). Curl queries in the guide using nutri_error_logs return a PGRST205 schema error.

7. [INFO] All simulated chat IDs generate MAX API 404 errors — every outbound message to fake user IDs (990000014, etc.) fails with "Chat not found". This is expected for simulation but means the bot cannot be properly end-to-end tested without real MAX API chats. The error is logged to nutri_error_log correctly.

## Engagement Notes

- Water tracking works well — /water increments water_glasses in DB reliably (4 glasses tracked across 7 days)
- /editprofile → edit_weight flow works correctly — weight updated from 88.5 to 87.0 and persisted
- Onboarding completes but with corrupted data (wrong age, wrong goal, missing food logs)
- /deepcheck, /recipes, /mealplan, /vitamins, /stats, /today, /week, /subscribe, /help — all return HTTP 200, no crashes
- Sticker input handled gracefully (HTTP 200, no crash)
- Free text "это очень вредно?" processed without crash (HTTP 200)
- Free text "покажи профиль" → intent routing → HTTP 200, no crash
- /delfood with no food logs returns HTTP 200 (no crash, but behavior unverified since no reply visible)
- /allergy with no args returns HTTP 200 (no crash)

## UX Friction Points (Trucker Persona)

- Weight input requiring decimal format (88.5 vs 88) is a major UX friction for non-technical users — a trucker will type "88" and the bot will silently loop without explanation
- No visible feedback possible for simulated users due to MAX API 404, but in production the bot would send the next onboarding prompt — still, the integer-only rejection needs error messaging
- The goal mismatch (wanted "lose", got "maintain") is invisible to users — they'd never know their goal wasn't saved correctly

## Raw Errors (from Supabase error log)

All errors follow this pattern (100% of entries):
```
routeUpdate error: MAX API /messages?chat_id=990000014: 404 {"code":"chat.not.found","message":"Chat 990000014 not found"}
```

Error type: webhook
Resolved: false
First occurrence: 2026-04-04T19:26:34 UTC
Last occurrence: 2026-04-04T19:31:15 UTC

No application-level exceptions or unhandled errors were logged beyond MAX API delivery failures.

## Final DB State (Day 7)

```json
{
  "max_user_id": 990000014,
  "name": "Pavel",
  "sex": "male",
  "age": 88,
  "height_cm": 176,
  "weight_kg": 87.0,
  "goal": "maintain",
  "daily_calories": 2379,
  "daily_protein": 139,
  "daily_fat": 66,
  "daily_carbs": 307,
  "onboarding_completed": true,
  "water_glasses": 4,
  "streak_days": 0,
  "last_food_date": null,
  "subscription_type": "trial",
  "messages_today": 2,
  "photos_today": 0
}
```
