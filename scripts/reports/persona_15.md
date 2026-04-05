# Persona 15: Юлия

## Profile
- Age: 29 / Sex: female / Height: 170 cm / Weight: 60 kg / Goal: healthy
- User ID: 990000015
- Phone: +79001000015
- Personality: Vegan, eco-activist, attentive to ingredients, interested in micronutrients
- Allergies: мясо, рыба, молоко, яйца, мёд (5 items — full vegan restriction set)

## Simulation Summary
- Days simulated: 7
- Total events sent: ~68
- Webhook responses ok:true — all 68
- Errors (MAX API chat.not.found): 5 logged for chat 990000015 (callbacks only)
- Food logs created in DB: 0
- Water logs created in DB: 0
- Onboarding completed: NO (stuck at step 2 / sex selection)
- Allergies saved: YES (all 5 correctly parsed and stored)

---

## Bugs Found

### 1. [CRITICAL] Onboarding blocked by reply-first architecture
**What happened:** After `bot_started` + contact, the bot advanced to `onboarding_step=1`. Every subsequent callback (`name_confirm`, `sex_female`, `goal_healthy`, `profile_short`, `profile_skip`) returned `{"ok":true,"processed":1}` but the step never advanced beyond 2.

**Root cause confirmed:** The bot sends a reply to MAX API before updating DB state. Since simulation user IDs (990000015) don't exist in MAX, the reply fails with `Chat 990000015 not found` and the state update is never reached. The state machine is reply-first, not state-first.

**What was expected:** State should update in DB regardless of reply success. Or at minimum, `profile_skip` (which should do instant complete) should bypass the reply dependency.

**Impact:** All features requiring completed onboarding (food logging, water tracking, /today, /week, /stats) are blocked for all sim users.

---

### 2. [HIGH] /allergy command works BEFORE onboarding completes
**What happened:** Sending `/allergy мясо, рыба, молоко, яйца, мёд` with onboarding at step 2 (incomplete) correctly saved all 5 allergies to the `allergies` JSONB array.

**Observation:** This is arguably correct behavior (allergy setup should be available early), but it creates an inconsistency: allergy data IS persisted while profile data (sex, age, goal) is NOT, because /allergy bypasses the reply-gated state machine.

**Vegan-specific note:** All 5 vegan exclusions (мясо, рыба, молоко, яйца, мёд) were parsed correctly as separate items. Multi-value comma-separated allergy input works.

---

### 3. [HIGH] /addfood produces no food log when onboarding is incomplete
**What happened:** `/addfood тофу-скрэмбл 200г, тост с авокадо, кофе на овсяном` + `confirm_food` returned ok:true on both events. `context_state` stayed "idle". `nutri_food_logs` table remained empty.

**What was expected:** Food entry and AI analysis should either work (creating a pending log) or return an explicit "complete onboarding first" error.

**Silent failure:** The bot accepted the input but did nothing visible in DB. No pending state was set, no error logged.

---

### 4. [MEDIUM] Name field corrupted (UTF-8 garbled)
**What happened:** The `name` field in `nutri_users` shows `"����"` — garbled bytes. The name "Юлия" was passed in the `bot_started` event JSON and saved with encoding corruption.

**What was expected:** Cyrillic name to be stored as valid UTF-8 string "Юлия".

**Impact:** Any feature using the user's name in bot messages would display garbage characters.

**Note:** Names sent as ASCII ("Yulia") via text message also did not update the name field.

---

### 5. [MEDIUM] Text messages with Cyrillic content via shell `--data` flag produce "Invalid JSON"
**What happened:** When sending Cyrillic text via `curl --data` with shell variable interpolation, the webhook responded `{"ok":true,"error":"Invalid JSON"}`. This means the webhook accepted the request but the JSON parsing failed for the body content.

**What was expected:** `{"ok":true,"processed":1}`.

**Workaround confirmed:** Using heredoc (`cat > /tmp/file.json`) with the payload written to file correctly sends Cyrillic text and gets `processed:1`.

**Impact on simulation:** Days 2 text messages (/addfood, /water, /today) likely hit this bug and were not processed as food entries. Days 3-7 used heredoc workaround and got `processed:1`.

**Bot-side implication:** The webhook JSON parser may be sensitive to character encoding in the Content-Type or body encoding. Real MAX messenger clients presumably send proper UTF-8 — this may be a curl/shell artifact. Needs verification with production traffic.

---

### 6. [LOW] `nutri_error_logs` table name in SIM_GUIDE is wrong
**What happened:** SIM_GUIDE.md references `nutri_error_logs` but the actual table is `nutri_error_log` (no trailing 's').

**Supabase hint confirmed:** `"hint":"Perhaps you meant the table 'public.nutri_error_log'"`.

**Impact:** All sim guide users using the exact curl from guide get a 404-style error instead of error data.

---

### 7. [LOW] `nutri_water_log` table name in SIM_GUIDE is wrong
**What happened:** SIM_GUIDE.md check_user section doesn't reference water log, but the table `nutri_water_log` does not exist (Supabase hint: `Perhaps you meant the table 'public.nutri_error_log'`). Water data is stored in the `water_glasses` column of `nutri_users` instead.

**Impact:** Water tracking verification via Supabase queries fails with wrong table name.

---

## Engagement Notes

### Features attempted (all returned processed:1)
- Full onboarding flow (7 steps) — stuck at step 2
- /allergy with 5 vegan restrictions — WORKS (saves to DB)
- /addfood (text, 9 different vegan meals) — accepted, no food log created
- /addfood with emoji (пад-тай 🌱, спринг-роллы 🥬) — accepted, no food log created
- Food photo (Wikipedia image URL) — accepted
- confirm_food callback — accepted, no food log created
- /vitamins — accepted
- /deepcheck + deep_vitamins + deep_full — accepted
- Free text questions about B12, iron, calcium, amino acids — accepted
- /recipes + recipe_custom — accepted
- /mealplan + mealplan_week — accepted
- /water (9x) — accepted, water_glasses stayed 0
- /today, /week, /stats, /profile — accepted
- /editprofile + edit_goal_text — accepted
- toggle_morning — accepted
- action_invite — accepted
- Sticker — accepted (no crash)

### What felt natural
- The allergy command with comma-separated list parsed all 5 vegan restrictions correctly — this is good UX for a vegan persona
- All 68 events processed without 500 errors — webhook is robust
- No crash on sticker, emoji in food text, or food photo URL

### What felt unnatural / UX friction

1. **Onboarding cannot complete in simulation** — this is a fundamental sim infrastructure issue, not a bot UX issue. In production with real MAX users, onboarding works via real inline buttons.

2. **Silent failure on /addfood when onboarding is incomplete** — the bot should either (a) redirect to "finish onboarding first", or (b) queue the food entry. A vegan user who logs allergens and then tries to log food immediately would get zero feedback.

3. **No vegan context used in food analysis** — because food logs were never created, we couldn't verify whether the bot uses the `allergies` array to flag non-vegan ingredients in AI analysis. This is the core vegan feature and remains untested at DB level.

4. **Allergy-to-analysis integration untestable** — the most important behavior for this persona (does the bot warn when AI identifies ingredients that conflict with saved allergies?) could not be tested because onboarding is blocked and food logs aren't created.

---

## Final DB State (after 7 days)

```json
{
  "max_user_id": 990000015,
  "name": "Юлия (garbled in DB)",
  "age": null,
  "sex": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": null,
  "allergies": ["мясо", "рыба", "молоко", "яйца", "мёд"],
  "onboarding_step": 2,
  "onboarding_completed": false,
  "context_state": "idle",
  "water_glasses": 0,
  "food_logs_count": 0,
  "messages_today": 0,
  "streak_days": 0
}
```

---

## Raw Errors (from nutri_error_log, chat_id=990000015)

```
2026-04-04T19:19:40 — routeUpdate error: MAX API /messages?chat_id=990000015: 404 {"code":"chat.not.found","message":"Chat 990000015 not found"} [message_callback]
2026-04-04T19:21:22 — routeUpdate error: MAX API /messages?chat_id=990000015: 404 {"code":"chat.not.found","message":"Chat 990000015 not found"} [message_callback]
2026-04-04T19:22:57 — routeUpdate error: MAX API /messages?chat_id=990000015: 404 {"code":"chat.not.found","message":"Chat 990000015 not found"} [message_callback]
2026-04-04T19:22:59 — routeUpdate error: MAX API /messages?chat_id=990000015: 404 {"code":"chat.not.found","message":"Chat 990000015 not found"} [message_callback]
2026-04-04T19:23:52 — routeUpdate error: MAX API /messages?chat_id=990000015: 404 {"code":"chat.not.found","message":"Chat 990000015 not found"} [message_callback]
```

All 5 errors are `message_callback` type. Text message errors (update_type: message_created) for chat 990000015 were NOT logged with context.chat_id — they appear in the error log without a chat_id context field, making per-user attribution of text-message errors impossible.

---

## Vegan-Specific Assessment

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-item allergy parsing | PASS | All 5 restrictions saved correctly |
| Allergy persistence across sessions | PASS | Stored in JSONB array, survives session |
| Vegan food text recognition | UNTESTED | /addfood accepted but no log created |
| Emoji in vegan food names | UNTESTED | accepted ok:true, no log |
| Food photo vegan analysis | UNTESTED | photo accepted, no log |
| Allergy conflict detection in AI analysis | UNTESTED | requires completed onboarding |
| Vegan meal plan generation | UNTESTED | mealplan_week accepted, reply failed |
| Vegan recipe recommendations | UNTESTED | recipe_custom accepted, reply failed |
| B12/iron/zinc deficiency free-text | UNTESTED | accepted, reply failed |
| Vitamin analysis (deepcheck) | UNTESTED | deep_vitamins accepted, reply failed |

**Summary:** The one vegan-specific feature that was fully testable at DB level (/allergy) works correctly. All higher-level vegan features (AI analysis with allergy awareness, meal planning, nutrition deepcheck) cannot be verified because they depend on the reply-first state machine which fails for simulation user IDs.

**Recommendation:** To properly test vegan dietary restriction handling, the bot should either:
1. Support a "dry run" mode where state advances even if MAX reply fails, OR
2. Expose a REST endpoint for reading the last bot response from DB, OR
3. Add integration test coverage specifically for allergy-flagging logic in AI analysis (unit testable without MAX API)
