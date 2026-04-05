# Persona 25: Ирина — кормящая мама

## Profile
- Age: 33 / Sex: female / Height: 166 cm / Weight: 56 kg / Goal: healthy
- User ID (max_user_id): 990000025
- DB UUID: c74f5eb4-7968-4075-a7eb-8f369f471165
- Persona: молодая мама, грудное вскармливание (ГВ), мало времени, быстрые записи

---

## Simulation Summary
- Days simulated: 7
- Total events sent: ~60 (onboarding 8 + daily food/water/commands/queries/edge)
- All webhook calls returned HTTP 200 `{"ok":true,"processed":1}`
- Food logs stored in DB: 0 (critical bug — see below)
- Onboarding completed in DB: false (critical bug — see below)
- Error log table: `nutri_error_log` (note: SIM_GUIDE references `nutri_error_logs` — wrong name)

---

## Critical Bugs Found

### 1. [CRITICAL] Onboarding does not persist to DB — user stays at step 0
**What happened:** Full onboarding was sent in sequence: bot_started → contact → name_confirm → sex_female → 33 → 166 → 56 → goal_healthy. All returned HTTP 200. However, Supabase shows `onboarding_step: 0`, `onboarding_completed: false`, `age: null`, `sex: null`, `height_cm: null`, `weight_kg: null`, `goal: null`, `phone: null`.

**Expected:** After completing all 8 onboarding steps, the user record should have all fields populated and `onboarding_completed: true`.

**Impact:** User effectively has no profile. All subsequent calorie/macro calculations are impossible. Nursing calorie adjustments cannot be applied.

**Root cause (likely):** The bot processes updates and attempts to send a reply via `MAX API /messages?chat_id=990000025`, which returns 404 (`chat.not.found`) because this is a simulated chat. The error causes the state machine to roll back or never commit the step. The webhook returns 200 to our caller but the internal handler throws on the MAX API reply call.

---

### 2. [CRITICAL] Food logs not written — 0 entries in nutri_food_logs after 14 /addfood + confirm_food cycles
**What happened:** All 7 days included /addfood commands followed by confirm_food callbacks. Supabase `nutri_food_logs` for this user is empty.

**Expected:** Each confirmed food entry should create a row in `nutri_food_logs`.

**Root cause (same as #1):** After food parsing, the bot tries to send the confirmation message to MAX API → 404 → exception thrown → transaction likely fails or the write never happens because the error short-circuits before the DB insert.

---

### 3. [HIGH] Name encoding corrupted in DB — stored as `"�����"` (UTF-8 mojibake)
**What happened:** The name "Ирина" (Cyrillic) is stored as `"�����"` in the `name` column.

**Expected:** `"Ирина"` stored correctly.

**Impact:** Bot would address the user with garbled characters in any personalized message.

**Root cause:** Likely a character encoding mismatch in the onboarding name extraction or DB insert — the raw bytes are being stored as latin-1 or the MAX API returns the name in a different encoding that is not decoded before DB write.

---

### 4. [HIGH] Nursing/GV context not captured or factored into calorie norms
**What happened:** Free text "я кормящая мама, это важно для расчёта нормы" was sent (HTTP 200), but since the profile was never completed, no nursing context flag exists in DB. The `context_state` remained `"idle"` throughout.

**Expected:** Bot should either:
  a) Recognize the ГВ context and adjust daily calorie norm (+400-500 kcal for nursing)
  b) Store the context as a tag/flag in the user profile for future queries

**Impact:** Core persona-specific feature untestable — cannot confirm whether the bot has any nursing-aware logic since the profile never completes.

---

### 5. [MEDIUM] `nutri_error_logs` table name mismatch in SIM_GUIDE
**What happened:** SIM_GUIDE.md instructs `curl .../nutri_error_logs` but the actual table is `nutri_error_log` (no trailing 's').

**Expected:** Guide should match actual schema.

**Impact:** All sim operators checking error logs via the guide will get a PGRST205 error and miss all error data.

---

### 6. [MEDIUM] Water counter not incrementing — `water_glasses: 0` after 12 /water commands
**What happened:** 5 water commands (day 2) + 4 (day 4) + 3 (day 5) = 12 /water events sent. Supabase shows `water_glasses: 0`.

**Expected:** Each /water command should increment `water_glasses` and eventually reset daily.

**Root cause:** Same MAX API 404 failure pattern — the handler likely throws on reply before DB update.

---

### 7. [LOW] /allergy with no args — behavior unverifiable
**What happened:** `/allergy` sent with no arguments, returned HTTP 200. Cannot verify response because there is no message log in DB and no real chat connection.

**Expected:** Bot should prompt user to specify allergens.

---

## Nursing-Specific Context Assessment

| Feature | Sent | Bot Acknowledged (DB) | Working |
|---|---|---|---|
| Nursing context free text | Yes | No (context_state=idle) | NO |
| Calorie norm adjustment for ГВ | N/A (no profile) | No | UNTESTABLE |
| Questions: forbidden foods at ГВ | Yes (HTTP 200) | No log | UNTESTABLE |
| Question: extra calcium | Yes (HTTP 200) | No log | UNTESTABLE |
| /vitamins with nursing context | Yes (HTTP 200) | No log | UNTESTABLE |
| /deepcheck → deep_vitamins | Yes (HTTP 200) | No log | UNTESTABLE |
| Meal plan for nursing mom | Yes (HTTP 200) | No log | UNTESTABLE |
| Recipe: fast lunch for nursing mom | Yes (HTTP 200) | No log | UNTESTABLE |

**Bottom line:** The bot's nursing/ГВ logic is completely untestable in simulation mode because the MAX API delivery failure prevents all state commits. The webhook correctly processes incoming updates (HTTP 200 always) but cannot complete the handler loop without a real MAX chat.

---

## Engagement Notes

- The onboarding sequence is well-structured and handles all expected button callbacks
- Free-text nursing context message ("я кормящая мама...") is a natural UX pattern — the bot should detect this and store it even if it can't confirm onboarding completion
- 5 water glasses/day for a nursing mom is a realistic need — the water tracking feature is important for this persona
- The `/allergy`, `/editprofile`, sticker, and `/reminders` flows all returned 200 — structural routing works
- The AI memory command ("зови меня Ира") is a critical UX feature for this persona — no way to verify it worked
- Meal plan and recipe custom text inputs for nursing context are the most important AI-generated features for this persona — both are untestable

---

## Systemic Observations (Cross-Persona)

The error log shows identical `MAX API /messages?chat_id=XXXXXXX: 404 chat.not.found` errors for personas 8, 10, 12, 15, 19, 20, 21, 22, 23, 25, 29, 30. This is a **platform-wide simulation blocker**: the bot's handler does not separate the "reply to user" step from the "commit state to DB" step. If delivery fails, state is lost.

**Recommended fix:** Decouple DB writes from MAX API message sending. Write state to DB first, then attempt delivery. If delivery fails, log the error but do not roll back the user state update.

---

## Raw Errors (from nutri_error_log, relevant to persona 25 session)

All errors follow the same pattern during the concurrent stress test window (19:23:51–19:24:02 UTC):

```
routeUpdate error: MAX API /messages?chat_id=990000025: 404 {"code":"chat.not.found","message":"Chat 990000025 not found"}
```

Source: `src/handlers/router.ts:30` → `routeUpdate` → `trackError` at `src/services/error-tracker.ts:16`

All errors: `resolved: false`, `user_id: null` (another bug — user_id should be populated in error context when known).

---

## Summary for Developer

1. **Fix #1 (blocker):** Decouple DB state writes from MAX API reply — write first, then send
2. **Fix #2 (blocker for this persona):** Implement nursing/ГВ context detection in free-text handler and store as profile flag
3. **Fix #3:** Fix UTF-8 encoding for Cyrillic names from MAX API user object
4. **Fix #4:** Populate `user_id` in error log entries when the user is already identified
5. **Fix #5:** Update SIM_GUIDE.md: `nutri_error_logs` → `nutri_error_log`
