# Persona 30: Тимур

## Profile
- Age: 37, Sex: male, Height: 177 cm, Weight: 79 kg, Goal: healthy
- User ID: 990000030
- DB UUID: d3897131-7e97-404a-937d-f91a47d9276f
- Personality: Entrepreneur, busy, evaluates bots as a product

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- HTTP errors: 0 (all 200 OK)
- Food logs saved to DB: 0 (critical bug)
- Messages stored in DB: 0 (critical bug)
- Water glasses logged: 1 (of ~6 sent)

---

## Bugs Found

1. **[CRITICAL] Food logs not persisted** — Sent 8+ `/addfood` commands across 7 days, all returned HTTP 200, `confirm_food` callbacks also 200 — but `nutri_food_logs` table has 0 entries for this user. Bot processes events without error but data is silently dropped. The MAX API `chat.not.found` error (see Raw Errors) is likely blocking the response delivery step, which may also break the food confirmation pipeline.

2. **[CRITICAL] Messages not stored** — `nutri_messages` table is empty for this user despite 55+ events processed. Chat history is lost — AI context, "зови меня Тим" memory instruction, and all conversation state are unrecoverable between sessions.

3. **[HIGH] Name encoding broken** — User name stored as `"�����"` (UTF-8 corruption). Name sent as `"Тимур"` via bot_started; the DB stores mojibake. Affects all Cyrillic names. Breaks personalization — the bot cannot address users by name correctly.

4. **[HIGH] profile_skip defaults incomplete** — After `profile_skip`, user profile has `sex: null`, `age: null`, `weight_kg: null`, `birth_date: null`. Goal defaulted to `"maintain"` instead of the persona's `healthy`. Height defaulted to 170 (corrected via editprofile to 177 on Day 6). An impatient entrepreneur who skips onboarding gets wrong calorie targets and null demographics — unusable data for personalization.

5. **[HIGH] MAX API delivery failure (systemic)** — All error logs show `routeUpdate error: MAX API /messages?chat_id=99000XXXX: 404 chat.not.found`. The bot cannot send responses back to simulated users. This means every interaction from the user's perspective is a black hole — the bot processes but never replies. In a real product context, this is complete UX failure.

6. **[MEDIUM] water_glasses only shows 1** — Sent 6 `/water` commands across Days 2 and 5, but DB shows `water_glasses: 1`. Either the counter doesn't persist across sessions or there's a reset bug.

7. **[MEDIUM] streak_days stuck at 0** — 7 days of consistent activity, streak never incremented. Either the streak logic requires actual message delivery (broken due to MAX API errors) or the cron/date logic has a bug.

8. **[LOW] Wrong table name in SIM_GUIDE** — `check_errors()` in sim-send.sh queries `nutri_error_logs` but the actual table is `nutri_error_log` (no trailing 's'). Causes guide-based verification to fail with PGRST205. Minor tooling issue.

9. **[LOW] `last_food_date` never set** — After 8+ food entries, `last_food_date` remains `null`. This field likely feeds streak logic — explains streak_days = 0.

---

## Product Assessment (Entrepreneur Perspective)

### Would you pay for this? Why/why not?
**No — not in current state.**

The core loop is broken: I log food, the bot silently processes it, no reply arrives, nothing is saved. From a paying user's perspective, the product simply doesn't work. Even if individual AI features (deepcheck, mealplan, vitamins) are technically solid on the backend, they are invisible to the user because responses never reach the chat.

If MAX API delivery were fixed and food logs actually persisted, the answer shifts — there's genuine value here for a busy professional who wants a zero-friction nutrition tracker.

### What's the core value?
**Natural language food logging + AI nutritional analysis.** The concept is correct: instead of manual calorie counting (tedious), the user types "бизнес-ланч: суп, курица, рис" and the bot does the math. For an entrepreneur who eats at restaurants, has irregular schedules, and won't open a dedicated app — a Telegram-based conversational logger is genuinely compelling.

Secondary value: deepcheck + vitamins analysis as a periodic health audit. This is a premium differentiator — not available in basic calorie trackers.

### What's missing for retention?
1. **Reply delivery** — The single most critical item. Without responses, there is no retention.
2. **Streak + habit loop** — Streak is stuck at 0; the gamification layer is invisible. Entrepreneurs respond to dashboards and metrics — a working "7-day streak" badge with a weekly summary would drive daily opens.
3. **Proactive nudges** — Morning/evening reminders (tested on Day 6 via `toggle_morning`) have no observable effect in current state. Push reminders are the primary re-engagement mechanism for a busy user who won't remember to open the bot.
4. **Name personalization** — "Привет, [имя]!" is table stakes. Currently broken due to encoding bug.
5. **Weekly summary insight** — `/week` exists, but there's no push delivery of a weekly digest ("Тим, на этой неделе ты съел на 20% больше жиров — вот что изменить"). This is the hook that brings users back on Monday.
6. **Goal-based feedback loop** — Goal is `healthy` but daily_calories = 2575 (defaulted for `maintain`). The bot should recalibrate targets based on actual goal, then track progress toward it explicitly.

### Monetization Ideas
1. **Freemium gating that makes sense** — Free: 3 food logs/day + /today. Premium: unlimited logs + deepcheck + recipes + mealplan + weekly PDF report. Current trial feels undefined — what exactly expires?
2. **Business/Team plan** — Entrepreneurs often pay for their teams. "NutriBot for Teams" — a manager gets aggregated anonymized health stats for their employees. Moonvit supplement cross-sell opportunity.
3. **Supplement integration** — Given Moonvit context, deepcheck should surface specific supplement recommendations with a buy link. "У тебя дефицит магния → [купить Moonvit Magnesium]". Direct revenue from AI-driven recommendations.
4. **Corporate wellness contracts** — B2B SaaS model: sell to HR departments as employee wellness benefit. Bot + monthly reporting dashboard. Higher LTV than consumer subscriptions.
5. **Promo code mechanics** — `/promo TEST123` returned no observable feedback (no reply delivered). A working promo system with influencer codes would drive acquisition. Track conversion per code.
6. **Annual plan with health report** — "Год с NutriBot → PDF-отчёт о динамике питания за год". Anchors users to long-term commitment.

### Overall Rating: 3/10

**Breakdown:**
- Concept & positioning: 8/10 — right problem, right channel, right format
- Core loop functionality: 1/10 — food logs not saved, no responses delivered
- AI feature depth (backend): 7/10 — deepcheck, vitamins, mealplan are sophisticated
- UX / onboarding: 4/10 — profile_skip works but leaves null demographics; name encoding broken
- Retention mechanics: 2/10 — streak broken, reminders non-functional, no weekly push
- Monetization clarity: 3/10 — subscribe flow exists but trial boundaries unclear

**Verdict:** Strong concept, broken delivery layer. Fix MAX API response routing and food log persistence first — everything else is secondary. Once the core loop works, this is a 7/10 product for the busy professional segment.

---

## Engagement Notes
- Most used features (by intent): /addfood, /today, /water, /profile
- Features that feel natural: Natural language food input is smooth — typing "бизнес-ланч: суп, курица, рис" feels effortless vs. logging in MyFitnessPal
- Features that feel unnatural: /editprofile flow requires re-sending the command after each field — should be a single multi-step wizard
- UX friction points:
  - No feedback that food was actually saved (response never arrives)
  - profile_skip doesn't ask for a single key metric (weight or goal) — leaves profile too empty to be useful
  - "зови меня Тим" name change instruction lost (messages not stored, no AI memory persistence)
  - /promo with invalid code gives no error feedback

---

## Raw Errors (from nutri_error_log)

All 20 logged errors share the same pattern — MAX API delivery failure for simulated chat IDs:

```
routeUpdate error: MAX API /messages?chat_id=990000030: 404
{"code":"chat.not.found","message":"Chat 990000030 not found"}
```

- error_type: "webhook"
- Affects: ALL simulated personas (990000014 through 990000030)
- Resolution: false (none resolved)
- Root cause: Simulated user IDs do not correspond to real MAX messenger chats; the bot cannot send reply messages back. This is expected for simulation but means response delivery is completely untested in this environment.

**Note:** The `nutri_error_log` table (correct name) vs. `nutri_error_logs` (incorrect name in sim-send.sh `check_errors()` function) — the SIM_GUIDE has a typo that causes verification failures.

---

## Final State (Supabase)

```json
{
  "max_user_id": 990000030,
  "name": "<<corrupted UTF-8>>",
  "sex": null,
  "age": null,
  "height_cm": 177,
  "weight_kg": null,
  "goal": "maintain",
  "onboarding_step": 8,
  "onboarding_completed": true,
  "context_state": "idle",
  "water_glasses": 1,
  "streak_days": 0,
  "subscription_type": "trial",
  "daily_calories": 2575,
  "last_food_date": null,
  "food_logs_count": 0,
  "messages_stored": 0
}
```
