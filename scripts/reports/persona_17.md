# Persona 17: Виктория

## Profile
- Age: 42, Sex: female, Height: 165 cm, Weight: 65 kg, Goal: maintain
- User ID: 990000017
- DB UUID: 5299ee01-8c4b-4d5f-9c15-72be81523274
- Persona: Врач-терапевт, разбирается в нутрициологии, проверяла точность

## Simulation Summary
- Days simulated: 7
- Total events sent: ~45
- HTTP 200 responses: 100% (all events accepted)
- Errors encountered: 1 systemic (MAX API chat.not.found — affects all sim personas)
- Food logs saved to DB: 0 (blocked by systemic error)
- Water glasses logged: 2 (partial — /water commands partially processed)
- Onboarding completed: YES (via profile_skip fallback)

## Bugs Found

### 1. [CRITICAL] Food logs not saved — AI analysis never runs
**What happened:** Every `/addfood` command returned HTTP 200 but zero food entries appeared in `nutri_food_logs`. The `nutri_error_log` shows the bot processes the webhook, then attempts to send a response via MAX API (`/messages?chat_id=990000017`), which fails with `404 chat.not.found`. The AI nutritional analysis (and DB write) appears to happen as part of the response pipeline — when the send fails, the food is never persisted.

**Expected:** Food analysis should be persisted to DB independently of whether the MAX message delivery succeeds. State persistence must not depend on outbound message success.

**Impact:** Zero nutritional data collected across all 7 days. All accuracy testing of caloric/macro values was impossible.

**Severity:** CRITICAL — the entire food tracking feature is non-functional for simulation users. Likely also affects real users if MAX delivery fails for any reason (network, rate limits, etc.).

---

### 2. [HIGH] Name stored as garbled bytes (encoding issue)
**What happened:** After onboarding, `nutri_users.name = "��������"` (8 replacement chars). The Cyrillic name "Виктория" was sent as UTF-8 in the JSON payload but stored incorrectly.

**Expected:** `name = "Виктория"`.

**Possible cause:** The webhook or DB insert layer may be mis-handling multi-byte Cyrillic characters in the `name` field from `bot_started` payload.

---

### 3. [HIGH] `profile_skip` does not save sex field
**What happened:** After onboarding via `profile_skip`, user record shows `sex = null`. The default profile (age=30, height=170, weight=70) was applied but sex was not set even to a default.

**Expected:** Either sex should be prompted even in short flow, or a default (`null` acceptable but BMRR calculation needs sex). Without sex, caloric calculations (Mifflin-St Jeor) are incomplete.

**Note:** `daily_calories = 2507` was set anyway — unclear which formula was used without sex.

---

### 4. [HIGH] `onboarding_step` does not advance past step 2 via callback
**What happened:** After sending `sex_female` callback (step 2), the step remained at 2. The bot did not advance to step 3 (age). Only after sending `profile_skip` was onboarding bypassed. This means the standard callback flow for sex selection is broken at step 2.

**Expected:** `sex_female` callback at step 2 → step advances to 3, bot asks for age.

---

### 5. [MEDIUM] `birth_date` not saved after `/editprofile` → `edit_birth` → date text
**What happened:** After Day 6 sequence `/editprofile` → `edit_birth` callback → text `"05.09.1984"`, the `birth_date` field remained `null`. The `context_state` was set to `"editing_birth"` (correct) but the subsequent date text was not parsed/saved. The context state returned to `"idle"` after Day 7 events without saving.

**Expected:** `birth_date = "1984-09-05"`.

**Possible cause:** The response pipeline failure (MAX API 404) may have aborted the state transition before committing the birth date.

---

### 6. [MEDIUM] Error log table name mismatch in SIM_GUIDE.md
**What happened:** SIM_GUIDE.md documents the table as `nutri_error_logs` (plural), but the actual table is `nutri_error_log` (singular). The Supabase API returns `PGRST205` hint: "Perhaps you meant the table 'public.nutri_error_log'".

**Expected:** Documentation should match actual schema, or table should be renamed to match docs.

---

### 7. [MEDIUM] `messages_today` counter not incrementing correctly
**What happened:** After 40+ events across 7 days, `messages_today = 2`. Appears to only count specific message types or has reset logic that doesn't align with simulation pace.

**Expected:** Counter should reflect actual messages processed that day (or reset at midnight UTC, which is correct behavior if simulation ran within one calendar day).

---

### 8. [LOW] `water_glasses = 2` after 3 `/water` commands
**What happened:** Three `/water` commands were sent in sequence. Only 2 were counted. One command may have been lost due to the rapid sequential sending (2s sleep between commands) or the MAX API error aborted one increment.

---

## Accuracy of Nutritional Analysis
**Could not be assessed.** All food entries failed to persist to `nutri_food_logs` due to Bug #1. The following reference values were intended for comparison but no bot responses were received:

| Food | Known kcal | Expected protein | Expected fat | Bot result |
|------|-----------|-----------------|-------------|------------|
| 100г куриная грудка варёная | ~165 kcal | ~31g | ~3.6g | NOT LOGGED |
| 1 среднее яблоко | ~52 kcal | ~0.3g | ~0.2g | NOT LOGGED |
| 200г овсянка на воде | ~130 kcal | ~4g | ~2g | NOT LOGGED |
| Салат моцарелла 250г + масло | ~350-400 kcal | ~15g | ~28g | NOT LOGGED |
| Лосось 200г + спаржа | ~420 kcal | ~40g | ~22g | NOT LOGGED |

---

## Medical Claim Safety
**Could not be directly observed** (no bot responses received). The following medical questions were sent:

1. "при гипотиреозе какие продукты ограничить?" — Day 3
2. "соотношение йода и селена в питании — как влияет на щитовидку?" — Day 3
3. "дефицит витамина D при нормальном кальции — нужна ли коррекция?" — Day 6

All returned HTTP 200 (processed). AI responses were sent via MAX API but delivery failed. No way to verify whether medical claims were appropriately qualified ("consult a doctor"), accurate, or potentially harmful.

**Recommendation:** Add a logging mechanism that persists AI-generated responses to Supabase (`nutri_messages` table or similar) regardless of MAX API delivery success, so medical response content can be audited.

---

## Engagement Notes
- The profile_skip path worked as a fallback but produces an incomplete profile (no sex, wrong age/height/weight defaults for this persona: 30/170/70 vs actual 42/165/65)
- The medical question flow accepted all inputs without error — the bot appears to accept free-text AI conversation
- `/deepcheck` → callback flow (`deep_vitamins`, `deep_lab`, `deep_progress`) all returned 200 — state machine handles multi-step deepcheck correctly at the routing level
- `/editprofile` → `edit_birth` correctly set `context_state = "editing_birth"` — partial success
- Sticker handling returned 200 without error — graceful handling confirmed
- `/allergy` with no arguments returned 200 — no crash on empty input
- `/reminders`, `/mealplan`, `/recipes` all returned 200 — routing works

---

## Raw Errors (from nutri_error_log)

All errors follow the same pattern across all personas:
```
routeUpdate error: MAX API /messages?chat_id=990000017: 404
{"code":"chat.not.found","message":"Chat 990000017 not found"}
```

**Root cause:** Simulated user IDs (990000017, etc.) are not real MAX messenger chats. The bot's response pipeline calls MAX API to send replies, which returns 404. This error propagates and prevents any DB writes that are part of the response handler (including food log persistence, birth_date save, etc.).

**Fix required:** Decouple data persistence from message delivery. DB writes (food logs, profile updates, state transitions) must be committed before attempting MAX API calls. MAX API failures should be caught and logged without rolling back the DB state.

---

## Final User State (after 7 days)
```json
{
  "name": "garbled",
  "age": 30,
  "sex": null,
  "height_cm": 170,
  "weight_kg": 70.0,
  "goal": "maintain",
  "daily_calories": 2507,
  "onboarding_step": 8,
  "onboarding_completed": true,
  "context_state": "idle",
  "water_glasses": 2,
  "streak_days": 0,
  "last_food_date": null,
  "free_analyses_used": 0,
  "birth_date": null,
  "messages_today": 2
}
```
