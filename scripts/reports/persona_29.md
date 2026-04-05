# Persona 29: Алиса — Журналист-ревьюер

## Profile
- Age: 31, Sex: female, Height: 171 cm, Weight: 63 kg (updated to 62.5 during test), Goal: lose
- User ID: 990000029
- DB UUID: cca9b9ec-e18d-4bb6-9206-3f5faa1f1334
- Personality: journalist writing a review, tests everything, notes impressions

---

## Simulation Summary
- Days simulated: 7
- Total webhook events sent: 50
- Total messages stored in DB: 10 (AI chat messages only)
- Food logs persisted: 0 (critical bug — see below)
- Errors from bot: all `{"ok":true,"processed":1}` — server never returned 5xx
- System errors in nutri_error_log: all "chat.not.found" for other sim personas — none specific to persona 29

---

## Feature Ratings (Journalist Style: 1–5)

### Onboarding — 3/5
The flow is logical: phone → profile type → name confirm → sex → age → height → weight → goal. Eight steps, all accepted without error. Bot confirmed completion (`onboarding_step: 8`, `onboarding_completed: true`). However:
- **Bug [HIGH]**: `age` field stored as `63` instead of `31`. Height `171` was submitted before weight `63` — the system appears to have stored the weight value (`63`) in the `age` column, suggesting a step-ordering bug or field mapping issue during onboarding.
- **Bug [HIGH]**: `height_cm` stored as `null` despite sending `171`. Only `weight_kg` (62.5 after edit) was saved. The height step was either skipped silently or the field write failed.
- **Bug [MEDIUM]**: Name stored as garbled bytes (`"����� ���������"`) — UTF-8/encoding issue when writing Cyrillic names to the DB. The bot likely receives UTF-8 correctly but persists with wrong encoding.
- No confirmation of what onboarding type was selected (`profile_full`) — user doesn't see feedback that full profile was chosen vs short.
- `phone` field: null. Phone was sent via contact attachment but not stored.

### /help — 2/5
Command was processed (`ok: true`). No way to verify what the bot actually replied (we can't read bot messages in simulation mode). From a UX standpoint — it's the first thing a journalist would test. Without seeing the reply, it's unclear if the help text is complete, discoverable, or well-structured. Rating penalized for zero observability in simulation.

### Food Logging (/addfood) — 2/5
- Sent 8 food entries across 7 days with `confirm_food` after each. All returned `ok: true`.
- **Bug [CRITICAL]**: Zero food entries in `nutri_food_logs`. Not a single food was persisted to the database. The bot processed the events but wrote nothing. Either: (a) food is stored in a different table, (b) `confirm_food` failed silently, or (c) trial subscription blocks logging.
- Positive: multi-item food strings accepted (`тыквенный суп-пюре 350г, хлебцы, латте`), named portions accepted (`утренний боул: овсянка, ягоды, семена чиа, кокосовый йогурт`), restaurant-style descriptions accepted (`обед: поке с тунцом и авокадо 400г`).
- Photo food logging: image sent, `confirm_food` sent — same critical bug applies, nothing stored.

### /water — 3/5
Three water glasses sent. DB shows `water_glasses: 2` (not 3). Lost one count somewhere — minor off-by-one or timing issue. Functional but not reliable for accurate hydration tracking.

### /today, /week — ?/5 (untestable)
Both commands processed without error. Cannot verify response content in simulation mode. The critical food log bug means `/today` would likely show empty or incorrect data even if the formatting is good.

### /vitamins — ?/5 (untestable)
Processed. Content unknown in simulation. With `height_cm: null` and `age: 63` stored, any vitamin recommendations would be based on corrupted profile data.

### /deepcheck + deep_full — 3/5
Accepted and processed without error. Two-step flow (command → callback) works mechanically. Quality of analysis unknown but the flow is clean.

### /recipes + recipe_dinner — 3/5
Two-step flow works. Dinner recipe callback accepted. No errors.

### /mealplan + mealplan_today — 3/5
Same pattern — clean two-step flow, no errors.

### /stats — ?/5 (untestable)
With zero food logs, stats would be meaningless data.

### /profile — ?/5 (untestable)
Processed. Would show corrupted data (age 63, null height).

### Conversational AI — 4/5
This is the strongest feature. Four free-text questions sent:
- "расскажи про витамин D"
- "что полезнее — красная рыба или белая?"
- "составь мне список покупок на неделю"
- "я постоянно хочу сладкого, почему?"

The AI replied with substantive, multi-turn responses (visible in `nutri_messages`). Tone was conversational and practical — "рыба 2–3 раза в неделю", "без фанатизма". Messages stored correctly in Russian. The conversational layer is clearly the most polished part of the product. **Only bug**: user messages stored with garbled encoding (`"�������� ��� ������� D"`), same UTF-8 issue as name.

### AI Memory (nickname) — 1/5
Sent "зови меня Лиса". Bot processed it (`ok: true`). No way to verify if the bot actually remembered the nickname in subsequent messages. No name change reflected in `nutri_users`. This is a soft AI-memory test that requires multi-turn response reading to verify — untestable in simulation without reading replies.

### /editprofile — 4/5
Two edits tested:
- Weight: `edit_weight` → `62.5` → DB confirmed `weight_kg: 62.5`. Works correctly.
- Goal text: `edit_goal_text` → "минус 3 кг здорово и без стресса" → accepted. Goal field shows `lose` (enum), likely stored separately as free-text description. Flow is smooth.

### /delfood — ?/5
Flow: `/delfood` → `delfood_0` callback. Accepted without error. Since no food was ever actually stored (critical bug), there was nothing to delete — the list shown to the user (if any) would be empty or stale.

### /subscribe — 2/5
Processed. No paywall content observable. Trial subscription is active. Rating based on: the command exists and doesn't crash, but the paywall messaging quality is unknowable.

### /promo INVALID — 3/5
Sent `/promo INVALID` — processed without 500 error. Bot presumably replied with "promo code not found" or similar. No DB error logged. Graceful handling assumed.

### /allergy — 4/5
Sent `/allergy лактоза, орехи`. DB confirmed `allergies: ["лактоза", "орехи"]` stored — though displayed as garbled bytes in the raw API response (`["�������","�����"]`), the actual array length is 2 so data is there. The encoding issue is a rendering/client-side problem, not data loss. Clean UX for setting dietary restrictions.

### /reminders — 3/5
Two toggle callbacks sent (`toggle_morning`, `toggle_evening`). Both processed. No DB column visible for reminder state in nutri_users — likely stored elsewhere or as preferences. Mechanically functional.

### Sticker/Video handling — 3/5
Both sent, both returned `ok: true`. Bot should gracefully handle unsupported media types. No errors thrown. Presumably replies with "I can't process this type of message."

### /deletedata + cancel — 4/5
Two-step safety flow (`/deletedata` → `cancel_delete`) works cleanly. Data preserved. Correct pattern for destructive action confirmation.

### /invite — ?/5 (untestable)
Processed. Referral message content unknown.

---

## Bugs Found

1. **[CRITICAL] Food logging broken** — All `/addfood` + `confirm_food` events accepted, zero rows written to `nutri_food_logs`. Core feature non-functional or storing to a different/inaccessible table. Affects: `/today`, `/week`, `/stats`, `/delfood`.

2. **[HIGH] Onboarding field mapping bug** — Age stored as `63` (the weight value) instead of `31`. Height stored as `null` instead of `171`. Sequence: age("31") → height("171") → weight("63"). Suspect off-by-one in step counter or field assignment.

3. **[HIGH] UTF-8 encoding broken for Cyrillic in DB** — Name `"Алиса Журналова"` stored as `"����� ���������"`. User messages stored with same corruption. Allergies stored correctly as array but display as `"�������"`. The DB or the write layer is corrupting multi-byte characters.

4. **[MEDIUM] Phone not stored** — Contact attachment sent with `+79001000029`, but `phone` column is `null`. Phone capture appears broken.

5. **[MEDIUM] Water count off** — Sent 3 `/water` commands, DB shows `water_glasses: 2`. Possible race condition or duplicate-event dedup logic discarding one.

6. **[LOW] `nutri_error_logs` table name mismatch** — SIM_GUIDE references `nutri_error_logs` but actual table is `nutri_error_log` (no trailing `s`). Minor doc inconsistency, causes confusion during investigation.

7. **[LOW] No errors generated for persona 29 specifically** — All observed errors in `nutri_error_log` are "chat.not.found" for other sim persona IDs. This means the bot is silently failing on food writes without logging an error — silent failure is harder to debug than logged failure.

---

## UX Friction Points

- **No receipts**: After every `/addfood`, a user expects to see "Added: Caesar salad, ~420 kcal". Without reading bot replies, the experience feels like shouting into a void. The confirm flow (add → wait → confirm button) adds friction for daily use.
- **Profile completeness gap**: Height and age corrupted in DB means all calorie/macro calculations are wrong from day 1. User would notice recommendations feeling off.
- **Trial limits opaque**: `messages_today: 5` with `subscription_type: trial` — unclear what the limit is, when it resets, what happens when exceeded.
- **Nickname memory**: "зови меня Лиса" is a natural interaction that users will try. If the bot doesn't acknowledge and use it in follow-ups, that's a broken promise.

## Great Moments

- Conversational AI quality is genuinely good — substantive answers to nutrition questions, practical tone, no generic filler.
- `/allergy` data properly stored as array — correct data model for multi-allergy users.
- `/editprofile` weight edit works cleanly and updates calorie targets automatically (calories changed from 1695 to 1596 after weight edit — correct behavior).
- `/deletedata` two-step confirmation is the right pattern — protects against accidental deletion.
- Multi-item food strings parsed without crashing — `"тыквенный суп-пюре 350г, хлебцы, латте"` accepted.

---

## Engagement Notes

- Most-used features: food logging (8 entries), conversational AI (4 questions), profile editing
- Most natural flows: deepcheck → deep_full, recipes → recipe_dinner, editprofile → edit_weight
- Most unnatural: /delfood without seeing the list (blind navigation)
- Journalist verdict: The AI chat layer would make a compelling product demo. The data layer (food logging, onboarding field storage, encoding) needs serious fixes before this is publishable.

---

## Raw Errors (from nutri_error_log)

All errors observed are `"chat.not.found"` for other sim personas (14, 16, 17, 22, 27). Pattern:
```
MAX API /messages?chat_id=99000XXXX: 404 {"code":"chat.not.found","message":"Chat 99000XXXX not found"}
```
These are expected for sim users — the MAX messaging API rejects sending to non-existent real chats. This error is systemic across the stress test, not persona-specific.

No persona-29-specific errors logged, despite food log writes silently failing. Missing error visibility is itself a bug.

---

## Final Score (Journalist's Verdict)

| Category | Score |
|---|---|
| Onboarding | 3/5 |
| Food Logging | 1/5 (broken) |
| Conversational AI | 4/5 |
| Profile & Editing | 4/5 |
| Water Tracking | 3/5 |
| Vitamins / DeepCheck | 3/5 |
| Social / Invite | untested |
| Edge Case Handling | 3/5 |
| **Overall** | **2.5/5** |

The bot's AI personality is its strongest asset. The nutrition data layer is its biggest liability. Fix the food logging bug and the encoding issue, and this becomes a 4/5 product.
