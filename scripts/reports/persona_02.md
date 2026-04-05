# Persona 02: Андрей

## Profile
- Age: 35, Sex: male, Height: 180 cm, Weight: 90 kg, Goal: gain (набрать массу)
- Persona User ID (webhook): 990000002
- Phone: +79001000002
- Actual DB UUID (max_user_id=990000002): `acf8f25c-2470-482c-9f94-809b62d1f946`
- Corrupted DB record (created first, captured by wrong ID): `95087f2c-e9f5-4d04-a3d6-e65057ea580f` (max_user_id=197609)

## Simulation Summary
- Days simulated: 7
- Total events sent: ~60
- All webhook calls returned HTTP 200
- Errors encountered: 3 critical bugs, multiple systemic issues

---

## Bugs Found

### BUG-1 [CRITICAL] User ID Collision / Wrong Record Captured at Onboarding
**What happened:** When `bot_started` was sent with user_id=990000002, the bot matched an existing MAX platform user record (max_user_id=197609) instead of creating a fresh record. The onboarding steps (sex, age, height, weight, goal_gain) wrote into this pre-existing record (DB ID `95087f2c`), completing onboarding for the wrong identity.

**Expected:** A new user record with max_user_id=990000002 should be created on `bot_started`.

**Observed:** The record with max_user_id=197609 was populated with Андрей's data (age=35, height=180, weight=90, goal=gain). A separate new record for max_user_id=990000002 (DB ID `acf8f25c`) was created later (19:15:38 UTC), 1m52s after bot_started, stuck at `onboarding_step=0`, name garbled.

**Impact:** All subsequent events (addfood, water, callbacks) were processed against the wrong DB record or the orphaned new record, with responses failing delivery (chat.not.found).

---

### BUG-2 [CRITICAL] All Bot Response Deliveries Fail — `chat.not.found` for sim user IDs
**What happened:** Every event we send returns HTTP 200 (webhook accepted), but the bot's attempt to reply via MAX API always throws: `MAX API /messages?chat_id=990000002: 404 {"code":"chat.not.found","message":"Chat 990000002 not found"}`.

**Expected:** Simulated user IDs (990000NNN) are synthetic and don't correspond to real MAX platform chat sessions. This is expected for load testing, but the error should be silently suppressed or the error log should distinguish sim vs. real users.

**Observed:** Every single simulated event generates a `nutri_error_log` entry with `error_type: webhook`. During the concurrent swarm simulation (~20 personas), 20+ error log rows were created within seconds, polluting the error log with non-actionable noise.

**Stack trace location:** `src/handlers/router.ts:30` → `routeUpdate` → `src/services/error-tracker.ts:16` → `trackError`

---

### BUG-3 [HIGH] Onboarding Steps Not Linked to Correct User Record
**What happened:** The actual record for persona 02 (`acf8f25c`, max_user_id=990000002) was created during the simulation but never progressed through onboarding. Final state: `onboarding_step=0, onboarding_completed=false, sex=null, age=null, goal=null`. Water glass count is 13 (water commands were correctly routed and incremented even without onboarding).

**Expected:** After full onboarding sequence (bot_started → contact → name_confirm → sex_male → 35 → 180 → 90 → goal_gain), the user record should show `onboarding_completed=true` with all profile fields set.

**Observed:** Onboarding data went to the wrong DB record (197609 collision). The real persona 02 record was stuck at step 0 throughout all 7 days.

---

### BUG-4 [HIGH] No Food Logs Saved for Any Text-Based /addfood
**What happened:** All `/addfood` commands sent as text (куриная грудка 300г, рис бурый 200г, etc.) returned HTTP 200 but zero food log entries exist in `nutri_food_logs` for persona 02.

**Expected:** Each confirmed /addfood → confirm_food sequence should create a row in `nutri_food_logs`.

**Observed:** `nutri_food_logs` for DB ID `acf8f25c` = empty array. Food log table contains only photo-based entries from real users. Text-based food logging either silently fails due to the `chat.not.found` error (response blocked) or the AI analysis result is discarded when delivery fails.

---

### BUG-5 [MEDIUM] Name Stored as Garbled UTF-8 (Mojibake)
**What happened:** All Cyrillic names from simulation personas show as `"name":"������"` or `"name":"�����"` in the database.

**Expected:** `name: "Андрей"` stored correctly in UTF-8.

**Observed:** `name: "������"` — classic Mojibake, 6 replacement characters for a 6-character Cyrillic name ("Андрей"). Only Latin-script names (Olga, Pavel, Tatyana, Maksim Busines, Svetlana Persona11) stored correctly.

**Impact:** Affects bot personalization — the bot cannot address the user by name. Affects all Cyrillic-named users (majority of Russian target audience).

**Likely cause:** The `name` field from the MAX webhook payload arrives as UTF-8 but is being decoded as Latin-1/ISO-8859-1 somewhere in the ingestion pipeline.

---

### BUG-6 [MEDIUM] context_state Stuck at "onboarding_short" After Completed Onboarding
**What happened:** The corrupted record (95087f2c) completed onboarding but `context_state` remained `"onboarding_short"` instead of resetting to `"idle"`.

**Expected:** After `goal_gain` callback completes onboarding, `context_state` should transition to `"idle"`.

**Observed:** `context_state: "onboarding_short"` persisted throughout all 7 days. Any subsequent text messages were interpreted as onboarding input rather than commands.

---

### BUG-7 [MEDIUM] Water Tracked on Non-Onboarded User, No Other State Works
**What happened:** The actual persona 02 record (acf8f25c) received 13 water increments across Days 1-6 despite never completing onboarding. Water commands work without onboarding but all other features (addfood, deepcheck, stats) do not.

**Expected:** Consistent behavior — either require onboarding for all features or document which features work pre-onboarding.

**Observed:** `/water` → water_glasses incremented. `/addfood` → processed but food not saved. `/deepcheck`, `/stats`, `/today`, `/week`, `/vitamins` → HTTP 200 returned, no DB changes.

---

### BUG-8 [LOW] nutri_error_logs Table Name Mismatch in SIM_GUIDE.md
**What happened:** SIM_GUIDE.md instructs `check_errors` to query `nutri_error_logs` table but the actual table is named `nutri_error_log` (no trailing "s").

**Expected:** `curl .../nutri_error_logs` returns data.

**Observed:** `{"code":"PGRST205","hint":"Perhaps you meant the table 'public.nutri_error_log'"}`. The `check_errors` function in `sim-send.sh` is broken.

---

## Engagement Notes

- **/water** is the most reliable feature — increments work even without onboarding, across all conditions. Likely the most-used feature in practice.
- **/addfood** text flow feels natural for a bodybuilder persona (Андрей would naturally type exact gram weights). However, zero persistence means the feature is dead for sim users.
- **Photo-based food logging** appears fully functional for real users based on other users' food logs in the DB (rich AI analysis with macros, micronutrients, portion estimation, confidence scores).
- **Deepcheck / Stats / Mealplan / Recipes** — all returned HTTP 200, flow seems to trigger AI generation, but responses were not deliverable. Cannot assess UX quality.
- **Free text "как набрать массу быстрее?"** was correctly routed to AI chat — the message log shows the bot gave a snarky response about encoding, which is the result of the Cyrillic name being garbled (bot received mojibake as context).
- **Sticker handling** — returned 200, no error in error_log specific to this persona. Appears handled gracefully.
- **edit_goal callback (goal_sport)** — accepted, but since onboarding was never completed for actual persona record, goal remains null.
- **UX friction:** The 2-second sleep in `sim-send.sh` between calls is appropriate for rate limiting but means the full 7-day simulation takes ~2 minutes. Acceptable.

---

## State Summary (Day 7)

| Field | Expected | Actual (acf8f25c) |
|---|---|---|
| name | Андрей | ������ (garbled) |
| sex | male | null |
| age | 35 | null |
| height_cm | 180 | null |
| weight_kg | 90 | null |
| goal | gain | null |
| onboarding_completed | true | false |
| onboarding_step | 8 | 0 |
| water_glasses | 18 (Days 1-6 /water) | 13 |
| food_logs | 11+ entries | 0 |
| context_state | idle | idle |

---

## Raw Errors (from nutri_error_log)

All errors follow the same pattern — every webhook event generates one:

```
routeUpdate error: MAX API /messages?chat_id=990000002: 404
{"code":"chat.not.found","message":"Chat 990000002 not found"}

Stack: Error
  at trackError (src/services/error-tracker.ts:16)
  at routeUpdate (src/handlers/router.ts:30)
  at async Object.handler (api/webhook.ts:65)
```

Additionally for persona 02 first boot:
```
routeUpdate error: MAX API /messages?chat_id=197609: 404
{"code":"chat.not.found","message":"Chat 197609 not found"}
update_type: "bot_started"
```

This confirms the ID collision: the bot resolved user_id=990000002 to an existing DB record with max_chat_id=197609, then tried to reply to that chat ID.

---

## Recommendations

1. **CRITICAL:** Add guard in `bot_started` handler — if incoming user_id does not match stored max_user_id exactly, create new record instead of reusing.
2. **CRITICAL:** Fix Cyrillic encoding in name ingestion pipeline — ensure UTF-8 end-to-end from MAX webhook JSON parsing through DB insertion.
3. **HIGH:** Add `sim_user` flag or ID range filter (990000000-999999999) to suppress delivery errors from simulation traffic and prevent error_log pollution.
4. **HIGH:** Investigate why text-based food logs are not persisted — either the AI analysis result is lost before DB write, or the write is skipped when message delivery fails.
5. **MEDIUM:** Fix `context_state` reset after onboarding completion.
6. **LOW:** Update `sim-send.sh` `check_errors` function to use correct table name `nutri_error_log`.
