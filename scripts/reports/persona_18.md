# Persona 18: Николай

## Profile
- Age: 48 / Sex: male / Height: 172 cm / Weight: 100 kg / Goal: lose
- User ID: 990000018
- DB UUID: a51c6bee-eb5e-4d43-8713-5b7c9abbfe3f
- Phone: +79001000018
- Personality: Менеджер, стресс-еда. Мотивирован, но срывается.

## Simulation Summary
- Days simulated: 7
- Total events sent: ~83
- Errors encountered: 8+ (MAX API 404 on every outbound message)
- Onboarding completed: YES (after retries)
- Food logs saved: 0
- Water glasses tracked: 1 of 12 sent

## Bugs Found

1. **[HIGH] Age mis-captured during onboarding** — Rapid-fire numeric inputs caused step machine to store weight value (100) as age. Result: `age=100` instead of `48`. The bot sequentially awaits each step, but when inputs arrive faster than the DB write completes, the next numeric value overwrites the step. Daily calories computed incorrectly as a result (2082 kcal based on age=100 instead of ~1700 for true params).

2. **[HIGH] /editprofile edit_weight does not persist** — Sent `/editprofile` → `edit_weight` callback → text `"99"`. After full flow, `weight_kg` remained `100.0`. The edit flow processes the inputs but the final save fails silently (likely MAX API send fails before DB commit, or the text "99" is not accepted in `context_state=idle` after the callback).

3. **[HIGH] AI memory "я вешу 98" does not update weight** — Free text "я вешу 98" sent, weight remained 100.0. Either the AI memory extraction is not implemented for simulated chats, or the DB update happens after the outbound message send which fails.

4. **[HIGH] Food logging completely broken for simulated users** — `/addfood` command triggers AI analysis → bot attempts to SEND result to user via MAX API → `chat.not.found` 404 → entire flow aborts. No food is saved even as unconfirmed in `nutri_food_logs`. The food confirmation flow has no intermediate persistence layer; state is lost on send failure.

5. **[MEDIUM] /water command inconsistently updates counter** — 12 `/water` commands sent across Days 3–5. Final count: `water_glasses=1`. Water increment appears non-atomic: bot sends confirmation message first, only increments counter if send succeeds. MAX API failure blocks the increment on most calls.

6. **[MEDIUM] Name garbled in DB** — `name` field stored as `"�������"` (replacement characters). Cyrillic UTF-8 name "Николай" is corrupted during storage. Encoding mismatch between webhook payload and DB insert.

7. **[LOW] onboarding_step=4 accepted age=100** — The bot accepted "100" as a valid age (should reject values >120 or flag as suspicious for weight-range values). No validation error on extreme age values.

8. **[LOW] Table name discrepancy in SIM_GUIDE** — Guide references `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular). Minor documentation bug.

## Engagement Notes

- **Most-used features**: /addfood (attempted 12x), /water (12x), /deepcheck (2x), /week (2x), /stats (2x)
- **What felt natural**: The onboarding flow (after retries) follows logical steps. Stress-eating persona naturally hits /addfood multiple times per day.
- **UX friction**:
  - No recovery path when MAX API send fails mid-flow — user would see no response at all
  - /editprofile weight update gives no feedback on failure
  - The "я вешу 98" pattern (natural speech for weight update) has no visible effect
  - After binge day, /today should show alarming numbers but user gets no response at all

## Raw Errors (from Supabase nutri_error_log)

All errors follow same pattern — MAX API 404 on outbound message sends:

```
routeUpdate error: MAX API /messages?chat_id=990000018: 404
{"code":"chat.not.found","message":"Chat 990000018 not found"}
```

Errors logged for both `message_created` and `message_callback` update types. No application-level (non-MAX) errors encountered, meaning bot logic itself runs without crashing — it only fails at the delivery layer.

## Final DB State

| Field | Value | Expected |
|-------|-------|----------|
| age | 100 | 48 |
| height_cm | 172 | 172 ✓ |
| weight_kg | 100.0 | 99 (after edit) |
| goal | lose | lose ✓ |
| daily_calories | 2082 | ~1700 (with correct age) |
| onboarding_completed | true | true ✓ |
| water_glasses | 1 | 12 |
| food_logs count | 0 | 8+ |
| last_food_date | null | should be set |
| free_analyses_used | 0 | 8+ |
| name | ??????? | Николай |
