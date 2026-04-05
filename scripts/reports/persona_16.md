# Persona 16: Artyom (Артём)

## Profile
- Age: 19 (defaults set to 30 by profile_skip)
- Sex: male (not saved — see Bug #3)
- Height: 180 cm
- Weight: 70 kg
- Goal: gain (not saved — defaulted to "maintain" — see Bug #4)
- User ID: 990000016
- DB UUID: 29995fa3-a483-4b7a-876b-279460389c61

## Simulation Summary
- Days simulated: 7
- Total events sent: ~60
- Errors encountered: 4 distinct bugs
- Food logs created: 0 (critical bug — all /addfood calls failed silently)
- Water glasses logged: 8 (water logging works)
- Messages today (at end): 3
- Final context_state: idle
- Onboarding completed: true (step 8)

## Bugs Found

1. **[CRITICAL] bot_started silently fails for Cyrillic names in sim-send.sh**
   - What happened: `bot_started` with name "Артём" (Cyrillic, passed via bash variable) returned HTTP 200 but no user was created in the DB. Repeated 4 times — same result.
   - What was expected: User record created in `nutri_users`.
   - Root cause: Cyrillic bytes in the bash JSON string get corrupted. When ASCII name "Artem" was used, user was created immediately.
   - Impact: All personas with Cyrillic names in sim-send.sh may fail silently at registration.

2. **[CRITICAL] Food logs never created — MAX API failure causes silent data loss**
   - What happened: Every `/addfood` text command and `action_addfood` + text flow returned HTTP 200 but zero entries appeared in `nutri_food_logs` for this user. Error log confirms `routeUpdate error: MAX API /messages?chat_id=990000016: 404 chat.not.found`.
   - What was expected: AI parses food text, creates unconfirmed food log entry; `confirm_food` marks it confirmed.
   - Root cause: The bot sends the AI analysis response back via MAX API before (or as part of) saving the food log. When MAX send fails (simulated chat_id has no real chat), the entire operation rolls back or aborts — food entry is never written.
   - Impact: Food logging is completely non-functional for simulated users. Any real user whose MAX chat fails would also lose their food entry.
   - Severity: This is a data persistence failure, not a UI issue.

3. **[MEDIUM] edit_goal callback doesn't persist — profile_skip overrides with defaults**
   - What happened: After `profile_skip` (which sets goal="maintain"), sending `edit_goal` → `goal_gain` returned 200s but the goal field stayed "maintain" in the DB. The weight update worked (70 kg saved) but goal did not change.
   - What was expected: goal field updated to "gain" after callback sequence.
   - Note: The edit_goal flow may require a different context_state to accept changes post-onboarding.

4. **[MEDIUM] sex field never set — neither via onboarding skip nor editprofile**
   - What happened: After `profile_skip`, sex remained null. Sending `sex_male` callback after onboarding completion also had no effect.
   - What was expected: sex="male" saved after `sex_male` callback (or as default via profile_skip for male persona).
   - Impact: AI nutrition calculations use null sex, potentially affecting macro targets.

5. **[LOW] profile_skip sets wrong default age (30) for a 19-year-old persona**
   - What happened: `profile_skip` set age=30 as default. The persona is 19.
   - What was expected: profile_skip should prompt user to confirm defaults or use a more neutral default.
   - Note: This is by design for skipping, but the 30-year-old calorie targets (2604 kcal/day) are wrong for a 19-year-old boxer trying to gain mass.

## Engagement Notes

- **Water logging works**: /water command incremented water_glasses counter correctly (reached 8 across sessions). This was the only data point consistently persisted.
- **Onboarding flow works**: profile_skip path correctly marked onboarding_completed=true at step 8. Height (180 cm) was saved via editprofile.
- **All HTTP responses 200**: The webhook accepts and processes all events without 4xx/5xx errors. Failures are silent data losses, not surface-visible errors.
- **/stats, /vitamins, /today, /week, /deepcheck** all sent 200 — but responses were dropped by MAX API. Cannot verify content.
- **Short text "yo"** (Day 6 edge case): accepted and processed (200), presumably routed to AI chat.
- **Video attachment**: accepted (200), no crash.
- **/promo TEST** (invalid code): accepted (200), presumably returned promo-not-found response (lost in MAX).
- **Free AI questions** ("is it ok to eat 6 times a day?", "does creatine help build muscle?"): both returned 200, messages_today counter reflects some AI usage (3 at end of sim).
- **UX friction**: a real boxer like Артём would abandon onboarding if he doesn't get visual feedback. The current architecture makes all responses invisible to simulated users — hard to test engagement quality.
- **Profile goal**: never changed from "maintain" to "gain" despite multiple attempts — boxer would notice wrong recommendations from day 1.

## Raw Errors (from Supabase nutri_error_log)

All errors follow the same pattern:
```
routeUpdate error: MAX API /messages?chat_id=990000016: 404 {"code":"chat.not.found","message":"Chat 990000016 not found"}
```

Timestamps: 2026-04-04T19:29:50 through 2026-04-04T19:29:56 (Day 7 final actions)

Error type: `webhook`
Context fields: `{"update_type": "message_created"}` or `{"chat_id": 990000016, "update_type": "message_callback"}`

**No food-specific errors logged** — the food processing pipeline silently aborts before logging the error, pointing to an unhandled exception inside the food analysis + save flow when MAX send fails.

## Key Finding

The biggest systemic issue is that **food log persistence is coupled to MAX API message delivery**. If the bot cannot send the reply, the food entry is not saved. This means any network hiccup, rate limit, or invalid chat_id results in silent food data loss — with no retry, no fallback, and no user notification. For a production food tracker, this is a critical reliability gap.
