# Persona 09: Наталья (Ната / Наташа)

## Profile
- Age: 25, Sex: female, Height: 172 cm, Weight: 55 kg, Goal: gain
- User ID: 990000009
- DB UUID: 4bac2935-3bb0-4a3f-865f-f5e71460df8d
- Phone: +79001000009

## Simulation Summary
- Days simulated: 7
- Total webhook events sent: ~75
- Total errors generated (Supabase): 43 (all are MAX API "chat.not.found" 404 — expected for sim)
- Food logs saved to DB: 0 (CRITICAL BUG — see below)
- Messages saved to DB: 2 (only the omega-3 free-text Q&A pair)
- Water glasses tracked: 8 (Day 2 x4 + Day 4 x4, water counter increments correctly)
- Onboarding completed: true
- Final context_state: idle

## Bugs Found

### BUG-1 [CRITICAL] Name stored as U+FFFD replacement characters
- **What happened**: Name "Ната" (entered via text on onboarding step 3) is stored in DB as 7 × `\uFFFD` (Unicode replacement character, bytes `ef bf bd`).
- **Expected**: `name = "Ната"` in the `nutri_users` table.
- **Root cause**: Likely a charset mismatch or double-encoding of UTF-8 Cyrillic at the point where user-typed name is written to Supabase. The issue persists after /editprofile → edit_name → "Наташа" — name remains corrupted.
- **Impact**: Every bot response that personalises by name would show garbled text. Profile display is broken.
- **Verified by**: `curl .../nutri_users?max_user_id=eq.990000009 | xxd` — bytes are all `efbfbd`.

### BUG-2 [CRITICAL] /addfood (text) saves nothing to nutri_food_logs
- **What happened**: All `/addfood <text>` commands across 7 days (авокадо-тост, гранола, паста, батончик, боул с киноа, смузи, тартар, пицца, поке-боул, чизкейк) returned `{"ok":true,"processed":1}` but `nutri_food_logs` for this user is empty (`[]`).
- **Expected**: Each confirmed food entry creates a row in `nutri_food_logs` with calories, macros, description.
- **Possible root cause**: Bot tries to reply via MAX API → gets 404 "Chat not found" (sim user not in MAX) → process likely exits before persisting the food log. The food analysis and storage is gated on successful message delivery.
- **Impact**: Core food-tracking feature is completely broken for sim users; likely also broken for any real user if MAX message delivery fails partway through.
- **Verified by**: `nutri_food_logs?user_id=eq.{DB_UUID}` → `[]`; other users have rows.

### BUG-3 [HIGH] Phone not saved despite contact attachment being sent
- **What happened**: Sent contact with `vcfPhone: "+79001000009"` during onboarding step 2. After full onboarding `phone` field in `nutri_users` is `null`.
- **Expected**: `phone = "+79001000009"`.
- **Impact**: Phone-based deduplication and contact lookups fail.

### BUG-4 [HIGH] Onboarding requires two passes for weight + goal
- **What happened**: After sending weight "55" and `goal_gain` callback in the correct onboarding sequence, user ended up at `onboarding_step=5` with `weight_kg=null`, `goal=null`, `onboarding_completed=false`. Had to re-send both to complete onboarding.
- **Expected**: Single pass through the onboarding flow should complete correctly.
- **Possible cause**: Race condition or step counter off-by-one — the weight and goal callbacks may be processed before the state from the previous step is committed.

### BUG-5 [MEDIUM] User messages stored with garbled Cyrillic (double-encoding)
- **What happened**: The user message "какое соотношение омега-3 к омега-6 оптимально?" is stored in `nutri_messages` as `"����� ����������� �����-3 � �����-6 ����������?"`.
- **Expected**: Proper UTF-8 Russian text.
- **Note**: The *assistant* reply is stored correctly in Cyrillic. Only user-originated text is garbled.
- **Root cause**: Input from webhook payload is likely parsed with a wrong encoding before being stored.

### BUG-6 [MEDIUM] /allergy command appears to not save allergies
- **What happened**: Sent `/allergy лактоза` on Day 6. Final user state shows `allergies: []`.
- **Expected**: `allergies: ["лактоза"]` or equivalent.
- **Note**: This may be related to BUG-1 (Cyrillic encoding) or a separate issue with the allergy command flow.

### BUG-7 [LOW] SIM_GUIDE references wrong table name
- **What happened**: SIM_GUIDE.md says to query `nutri_error_logs` (plural). Actual table is `nutri_error_log` (singular). Supabase returns PGRST205 "could not find table" error.
- **Expected**: Consistent table naming in docs and schema.

### BUG-8 [LOW] streak_days not incrementing
- **What happened**: After 7 days of activity, `streak_days = 0`.
- **Expected**: Should count consecutive days with food logged (though BUG-2 may be the root cause — no food logs = no streak data).

## Engagement Notes

### Features used
- Onboarding: full flow (bot_started → contact → name_change → name text → sex → age → height → weight → goal)
- Food tracking: /addfood text (10 entries across 7 days), food image (1), all with confirm_food
- Water tracking: /water (9 total), counter increments correctly
- Nutrition commands: /vitamins (3x), /deepcheck + deep_vitamins + deep_progress
- Content: /mealplan + mealplan_week, /recipes + recipe_snack
- Profile editing: /editprofile → edit_goal_text, edit_name
- Social: free-text AI chat (omega-3/omega-6 question answered correctly), collagen question
- Edge cases: emoji text, special chars in food name (quotes/parens), /allergy, /help

### What felt natural
- The onboarding callback flow (sex_female, goal_gain) is clean and intuitive
- AI responded correctly to the omega-3/omega-6 question (nutritionally accurate answer)
- Water tracking is the only feature working end-to-end reliably (increments per /water)
- All webhook calls return `{"ok":true,"processed":1}` — no silent 500s

### UX friction points
- Onboarding required two passes to complete (BUG-4) — very confusing in real usage
- No confirmation that /addfood was actually saved (because MAX 404 silently breaks the flow)
- /editprofile name change gives no visible feedback in DB — user would assume it worked but nothing persists
- /allergy command has no visible effect in profile
- The `edit_goal_text` flow accepts free text "набрать 3 кг мышечной массы за 2 месяца" — unclear if this updates the structured `goal` field or a separate text field (goal stays "gain" in DB, which is correct)

## Raw Errors (from Supabase nutri_error_log)

All 43 errors for user 990000009 are the same pattern:

```
error_type: "welcome_card" / "webhook"
message: "routeUpdate error: MAX API /messages?chat_id=990000009: 404 {"code":"chat.not.found","message":"Chat 990000009 not found"}"
```

First error (welcome card, onboarding start):
```json
{
  "id": "79b50b31-d143-42c4-9b0e-0f63aaf6b0d9",
  "error_type": "welcome_card",
  "message": "Welcome card failed: MAX API /messages?chat_id=990000009: 404 {\"code\":\"chat.not.found\",\"message\":\"Chat 990000009 not found\"}",
  "created_at": "2026-04-04T19:15:44.074325+00:00"
}
```

**Root impact**: Every bot response attempt to chat_id=990000009 fails with 404. The bot processes inputs (state machine advances, AI generates responses) but cannot deliver messages back or persist food logs. This means the simulation environment faithfully stresses the server-side logic but cannot test the full round-trip including message delivery and post-delivery persistence.

## Final DB State (post 7 days)

| Field | Value |
|-------|-------|
| name | `\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD` (7 replacement chars) |
| age | 25 |
| sex | female |
| height_cm | 172 |
| weight_kg | 55.0 |
| goal | gain |
| onboarding_completed | true |
| phone | null |
| water_glasses | 8 |
| allergies | [] |
| streak_days | 0 |
| context_state | idle |
| food_logs count | 0 |
| messages count | 2 |
| errors count | 43 |
