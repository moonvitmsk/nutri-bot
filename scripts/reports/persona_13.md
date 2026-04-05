# Persona 13: Татьяна

## Profile
- Age: 50, Sex: female, Height: 158, Weight: 72, Goal: maintain
- User ID: 990000013, Phone: +79001000013
- Personality: Учительница, пишет полными предложениями, не любит сложности

## Simulation Summary
- Days simulated: 7
- Total events sent: 57
- Errors encountered: 48 (all `MAX API chat.not.found` — expected for sim IDs)
- User created in DB: yes (on 2nd bot_started, after ~Day 5 in sequence)
- Onboarding completed: NO (`onboarding_step=0`, `onboarding_completed=false`)
- Food logs saved: 0
- Messages stored: 0
- Water tracked: 7 glasses (only field updated correctly)
- Name after /editprofile: "Tatyana Nikolaevna" (saved correctly)

## Bugs Found

1. **[CRITICAL] User not created on first bot_started with Cyrillic name**
   - First `bot_started` with `name="Татьяна"` returned `{"ok":true,"processed":1}` but no user record was created in `nutri_users`
   - No error logged — silent failure
   - User 990000013 was absent from DB while 990000015, 990000017, 990000018 (sent later by other personas) were present
   - Root cause: likely encoding issue with Cyrillic in name field causing DB insert to fail silently
   - Expected: user created regardless of name encoding; fallback to raw bytes or sanitized name

2. **[CRITICAL] Onboarding state lost — callbacks before user exists are silently ignored**
   - After the silent user creation failure, all onboarding callbacks (`profile_short`, `sex_female`, age `"50"`, `goal_maintain`) were sent and received `ok:true`, but since no user existed, context was not saved
   - When user was eventually created (2nd bot_started with ASCII name), `onboarding_step=0` — all prior steps lost
   - Expected: webhook returns error or queues events; user creation should be idempotent and robust

3. **[HIGH] Food logs not saved despite confirmed /addfood flow**
   - 8 food entries were submitted across 7 days via `/addfood [text]` + `confirm_food` callback
   - `nutri_food_logs` table has 0 records for this user
   - `onboarding_completed=false` likely gates food saving — but bot still returns `ok:true` without indicating to user that food was not saved
   - Expected: either block /addfood with clear message ("complete onboarding first") or save food regardless of onboarding state

4. **[HIGH] All commands silently no-op for incomplete-onboarding user**
   - Commands `/today`, `/week`, `/stats`, `/vitamins`, `/mealplan`, `/recipes`, `/reminders`, `/allergy`, `/help`, `/profile` all returned `ok:true`
   - No messages stored in `nutri_messages` — responses may have been attempted but failed at MAX API (chat.not.found)
   - Cannot confirm whether correct responses were generated since replies never reached user
   - Expected: in test/sim mode, responses should be loggable without requiring a real MAX chat

5. **[MEDIUM] Onboarding not re-triggered after user is created on 2nd bot_started**
   - Second `bot_started` (with ASCII name) created user at `onboarding_step=0`, but then subsequent Day 5-7 commands did not trigger onboarding flow
   - `onboarding_step` stayed at 0 throughout, suggesting bot did not prompt to complete onboarding again
   - Expected: if user exists but onboarding incomplete, bot should re-prompt for missing fields

6. **[MEDIUM] /editprofile with name update partially works**
   - Name was changed from "Tatyana" to "Tatyana Nikolaevna" — update persisted in DB
   - But `sex`, `age`, `goal` remain null because onboarding was never completed
   - Edit callbacks worked correctly (edit_name → text input → saved)

7. **[LOW] Leading/trailing spaces in command "  /today  " — behavior unconfirmed**
   - Sent `"  /today  "` as text — returned `ok:true`
   - Could not verify bot response since MAX API fails for sim IDs
   - Expected: command should be trimmed and processed normally

8. **[LOW] Phone number not stored despite contact share**
   - Contact with `+79001000013` was sent before user existed
   - Final user state: `phone=null`
   - Expected: phone saved on contact event; if user didn't exist yet, should be linked on creation

## Engagement Notes
- Water tracking was the only feature that worked correctly — `water_glasses=7` confirms `/water` command increments counter even without completed onboarding
- /editprofile name change worked — suggests context_state machine handles edit flow correctly
- Free text ("Подскажите, что приготовить из кабачков?", "Большое спасибо") — bot processed but responses unverifiable
- Sticker and leading-space command edge cases accepted without error
- The persona flow felt natural for a 50-year-old user: traditional Russian food entries, polite free text, cookbook-style meal names all plausible inputs
- Biggest UX friction: silent failure on onboarding means user would see bot accept all their food entries but nothing would actually be saved — confusing

## Final DB State
```
id:                fbc2ae5f-6cd8-4d8e-b679-49de5c743fff
max_user_id:       990000013
name:              Tatyana Nikolaevna
phone:             null
sex:               null
age:               null
height_cm:         null
weight_kg:         null
goal:              null
onboarding_step:   0
onboarding_completed: false
water_glasses:     7
streak_days:       0
context_state:     idle
subscription_type: trial
created_at:        2026-04-04T19:19:43 UTC
updated_at:        2026-04-04T19:22:07 UTC
```

## Raw Errors (from Supabase)
All 48 errors for this user are identical:
```
error_type: webhook
message: routeUpdate error: MAX API /messages?chat_id=990000013: 404 {"code":"chat.not.found","message":"Chat 990000013 not found"}
```
This is expected for simulated user IDs (not real MAX messenger chats).

Notable global errors seen in `nutri_error_log` from other simulations:
- `Food photo error: 400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.` — AI model API compatibility bug (affects food photo analysis)
- `nutri_error_logs` table name used in SIM_GUIDE is wrong — correct table is `nutri_error_log` (no trailing 's')
