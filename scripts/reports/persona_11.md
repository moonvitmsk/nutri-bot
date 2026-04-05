# Persona 11: Светлана

## Profile
- Age: 38, Sex: female, Height: 163 cm, Weight: 68 kg (→ 67 kg by Day 6), Goal: lose
- User ID: 990000011
- DB User ID: f6efd3d9-e981-4d7f-a644-ffa8ef3bda65
- Personality: accountant, sedentary job, office snacking, wants to lose weight before vacation, disciplined

## Simulation Summary
- Days simulated: 7
- Total events sent: ~60
- Webhook responses: all `{"ok":true,"processed":1}` — no 4xx/5xx
- Errors encountered: 3 critical bugs (see below)

## Bugs Found

### 1. [CRITICAL] Onboarding data lost — user in corrupted state
- **What happened**: After full onboarding (bot_started → contact → name_confirm → sex_female → 38 → 163 → 68 → goal_lose), the initial `check_user` response showed a correctly populated record: `id=6ec64ccf`, `age=38`, `sex=female`, `height_cm=163`, `weight_kg=68`, `goal=lose`, `onboarding_completed=true`, `onboarding_step=8`.
- **Final state**: Only one record exists for `max_user_id=990000011` — `id=f6efd3d9` — with `onboarding_completed=false`, `onboarding_step=0`, `age=null`, `sex=null`, `height_cm=null`, `goal=null`. The original completed record (`6ec64ccf`) no longer appears in Supabase.
- **Expected**: Onboarding data should persist. The completed profile should remain intact throughout the 7-day simulation.
- **Likely cause**: A second `bot_started` or a re-registration event at some point in the simulation replaced/deleted the first user record, creating a ghost user that lost all profile data. This is a data integrity / upsert collision bug.

### 2. [CRITICAL] Food logs not persisted — `nutri_food_logs` empty for this user
- **What happened**: All 14+ `/addfood` + `confirm_food` event pairs returned `{"ok":true,"processed":1}`. But querying `nutri_food_logs?user_id=eq.f6efd3d9...` returns `[]`. The global food logs table has entries from other users only.
- **Expected**: Each confirmed food entry should create a row in `nutri_food_logs`.
- **Likely cause**: The bot processed food through text analysis (not photo), so no `photo_url` is set. If the food log insert path requires a photo URL or ties to the wrong user ID (the now-deleted `6ec64ccf`), entries are silently dropped. The corrupted user state (bug #1) may cascade here — the bot may be writing to the deleted user's ID.

### 3. [MEDIUM] `last_food_date` never set, `streak_days` stays 0
- **What happened**: After 7 days of food logging, `last_food_date=null` and `streak_days=0` in user record.
- **Expected**: `last_food_date` should reflect the last confirmed food entry, and streak should increment on consecutive days.
- **Likely cause**: Food log inserts failing (bug #2) means the streak update trigger never fires.

### 4. [MEDIUM] `water_glasses` shows only 3 despite 10+ `/water` events sent across 7 days
- **What happened**: Day 2 (2x), Day 3 (3x), Day 5 (4x), Day 7+ water commands = 10+ events. Final `water_glasses=3`.
- **Expected**: Either cumulative count or daily reset, but 3 is too low even for a single day.
- **Likely cause**: Water events may be counting against the new corrupted user (f6efd3d9) only from a certain point, and the daily reset logic is dropping counts.

### 5. [LOW] SIM_GUIDE Supabase verification query uses wrong table name
- **What happened**: SIM_GUIDE documents `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular). Query returns `{"code":"PGRST205","message":"Could not find the table 'public.nutri_error_logs'"}`.
- **Expected**: SIM_GUIDE table names should match production schema.
- **Fix**: Update SIM_GUIDE line 99 to `nutri_error_log` (remove trailing s).

### 6. [LOW] SIM_GUIDE food log verification query uses non-existent column `food_name`
- **What happened**: Query `select=id,user_id,food_name,...` returns `{"code":"42703","message":"column nutri_food_logs.food_name does not exist"}`. Actual column is `description`.
- **Expected**: Correct column name in SIM_GUIDE.
- **Fix**: Replace `food_name` with `description` in SIM_GUIDE verification queries.

## Engagement Notes

### Features used
- Full onboarding flow (all 8 steps) — worked initially
- `/addfood` text (14 entries across 7 days) — accepted but not persisted
- `confirm_food` callback — accepted every time
- `/water` (10+ times) — partially counted
- `/vitamins` (2x), `/week` (2x), `/today` (4x), `/stats` (2x), `/profile` (1x) — all accepted
- `/deepcheck` + `deep_diet` callback — accepted
- `/recipes` + `recipe_dinner` callback — accepted
- `/mealplan` + `mealplan_today` callback — accepted
- `/delfood` + `/delfood 1` + `confirm_delete` — accepted
- `/editprofile` + `edit_weight` + "67" text — weight updated to 67.0 (only field that survived)
- `/allergy` (no args) — accepted
- Sticker — accepted
- `/reminders` + `toggle_morning` + `toggle_evening` — accepted
- Free text intents — accepted
- Food photo (image attachment) — accepted
- `/deepcheck` deep analysis — accepted

### Natural / Unnatural UX
- The disciplined accountant persona felt natural — she consistently confirmed all food entries and tracked water regularly. No frustration signals from the bot (all 200 OK).
- `/delfood 1` flow (list → select by number → confirm_delete) worked in terms of event acceptance but cannot verify correct deletion since food logs are empty.
- Free text "сколько я сегодня съела?" was accepted — AI intent routing appears functional at least at intake level.
- `/allergy` with no arguments accepted without error — good defensive handling.
- Sticker handled gracefully — no errors.

### UX Friction Points
- After onboarding corruption, any "personalized" response (calorie targets, progress summaries) would be based on null profile data — the bot would give wrong or default calorie advice to a 0-profile user.
- With `onboarding_completed=false`, the bot may show onboarding prompts on next session instead of main menu — severe regression for a returning user.
- No food log data means `/today`, `/week`, `/stats` would show empty dashboards — completely broken engagement for days 2-7.
- Weight update (`edit_weight → 67`) is the only successful state write that survived — isolated field updates work even when the main profile is corrupted.

## Raw Errors (from Supabase error_log)

All errors in `nutri_error_log` during the simulation window are from other personas (chat_ids 990000006, 990000010, 990000013, 990000017, 990000019, 990000021, 990000022, 990000023, 990000028, 990000029, 990000030). Pattern is identical:

```
routeUpdate error: MAX API /messages?chat_id=XXXXXX: 404
{"code":"chat.not.found","message":"Chat XXXXXX not found"}
```

**Interpretation**: Every bot response attempt fails with `chat.not.found` because sim user IDs (990000011 etc.) do not exist in the real MAX messenger network. This is expected behavior in a simulation context — the webhook processes the event and saves state, but the outgoing message delivery fails silently. The bot logs these as errors but still returns `{"ok":true,"processed":1}` to the webhook caller.

**Impact on this persona**: No 990000011-specific errors were logged. The bot silently processed all events. State corruption (bugs #1, #2) happens upstream of the message-send step, meaning the delivery errors mask the real persistence failures.

## Supabase State Summary (Day 7 final)

| Field | Expected | Actual |
|-------|----------|--------|
| onboarding_completed | true | false |
| onboarding_step | 8 | 0 |
| age | 38 | null |
| sex | female | null |
| height_cm | 163 | null |
| weight_kg | 67 | 67.0 ✓ |
| goal | lose | null |
| water_glasses | 10+ | 3 |
| streak_days | 7 | 0 |
| last_food_date | set | null |
| food_log rows | 14+ | 0 |
