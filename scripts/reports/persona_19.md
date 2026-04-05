# Persona 19: Елена

## Profile
- Age: 36, Sex: female, Height: 167 cm, Weight: 58 kg, Goal: sport / custom (crossfit recomp)
- User ID (MAX): 990000019
- DB UUID: 823b2349-ac56-482d-bb88-3e02eafbdb1f
- Phone: +79001000019
- Personality: кроссфитер, соревнуется, точный макротрекинг, оптимизация питания для перформанса

---

## Simulation Summary
- Days simulated: 7
- Total events sent: ~65
- All HTTP responses: 200 OK
- Errors encountered: 0 in nutri_error_log for user 990000019 (all errors are MAX API 404 — systemic, not user-specific)
- Onboarding completed: NO — stuck at step 0 due to MAX API delivery failures

---

## Day-by-Day Log

### Day 1: Full Onboarding + Custom Goal + First Food

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | bot_started | 200 | User created in DB (onboarding_step=0) |
| 2 | send_contact (+79001000019) | 200 | Processed, phone NOT saved |
| 3 | callback name_confirm | 200 | Processed, name garbled in DB (encoding bug) |
| 4 | callback sex_female | 200 | Processed, sex NOT saved |
| 5 | text "36" (age) | 200 | Processed, age NOT saved |
| 6 | text "167" (height) | 200 | Processed, height NOT saved |
| 7 | text "58" (weight) | 200 | Processed, weight NOT saved |
| 8 | callback goal_custom | 200 | Processed, goal NOT saved |
| 9 | text "улучшить результаты в кроссфите, рекомп без потери силы" | 200 | Processed, goal_text NOT saved |
| 10 | /addfood "омлет из 4 яиц с овощами, тост с авокадо, кофе" | 200 | Processed, no food log created |
| 11 | callback confirm_food | 200 | Processed, nothing to confirm |

**DB state after Day 1:** onboarding_step=0, all profile fields null, no food logs, phone null

### Day 2: Training Day Macros

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | /addfood "pre-WOD: банан, рисовые хлебцы 2шт, мёд" | 200 | Processed, no log |
| 2 | confirm_food | 200 | Processed |
| 3 | /addfood "post-WOD: протеиновый коктейль, рисовые чипсы, ягоды" | 200 | Processed, no log |
| 4 | confirm_food | 200 | Processed |
| 5 | /addfood "стейк 250г, батат 200г, салат, оливковое масло" | 200 | Processed, no log |
| 6 | confirm_food | 200 | Processed |
| 7-12 | /water x6 | 200 | Partially processed — water_glasses incremented to 2 (not 6!) |
| 13 | /today | 200 | Processed |

**Notable:** /water incremented water_glasses but only to 2, not 6. Possible rate limiting or deduplication on water counting.

### Day 3: Vitamins + Electrolytes

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | /vitamins | 200 | Processed |
| 2 | /deepcheck | 200 | Processed |
| 3 | callback deep_vitamins | 200 | Processed |
| 4 | text "какие электролиты пить при интенсивных тренировках?" | 200 | Processed (AI free text) |
| 5 | /addfood "лосось 200г, рис 250г, шпинат 100г" | 200 | Processed, no log |
| 6 | confirm_food | 200 | Processed |
| 7-11 | /water x5 | 200 | Processed |

### Day 4: Recipes + Meal Plan for Competition

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | /recipes | 200 | Processed |
| 2 | callback recipe_custom | 200 | Processed |
| 3 | text "высокобелковые перекусы 200-300 ккал для кроссфита" | 200 | Processed |
| 4 | /mealplan | 200 | Processed |
| 5 | callback mealplan_custom | 200 | Processed |
| 6 | text "план на 3 дня перед соревнованиями по кроссфиту" | 200 | Processed |
| 7 | /addfood "творог 300г, банан, мёд, орехи кешью 30г" | 200 | Processed, no log |
| 8 | confirm_food | 200 | Processed |
| 9 | /stats | 200 | Processed |

### Day 5: Photo + Weight Tracking

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | send_image (food photo) | 200 | Processed |
| 2 | callback edit_weight_food | 200 | Processed |
| 3 | text "250" (portion) | 200 | Processed |
| 4 | confirm_food | 200 | Processed, no log created |
| 5 | /editprofile | 200 | Processed |
| 6 | callback edit_weight | 200 | Processed |
| 7 | text "58.5" (decimal weight) | 200 | Processed, weight NOT saved (onboarding incomplete) |
| 8 | /week | 200 | Processed |
| 9 | /addfood "курица 300г, макароны цельнозерновые 200г" | 200 | Processed, no log |
| 10 | confirm_food | 200 | Processed |

### Day 6: Edge Cases

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | /addfood "куриная грудка 237г без кожи, рис жасмин 183г сухой вес, брокколи на пару 142г, оливковое масло extra virgin 15мл" | 200 | Processed, no log |
| 2 | confirm_food | 200 | Processed |
| 3 | text "зови меня Лена" (AI nickname) | 200 | Processed |
| 4 | /editprofile | 200 | Processed |
| 5 | callback edit_name | 200 | Processed |
| 6 | text "Лена" | 200 | Processed, name NOT updated (onboarding still step 0) |
| 7 | /allergy | 200 | Processed |
| 8 | send_sticker | 200 | Processed (no crash) |
| 9 | /reminders | 200 | Processed |

### Day 7: Final

| Step | Event | HTTP | Result |
|------|-------|------|--------|
| 1 | /addfood "яйца 4шт, овсянка 100г, арахисовая паста 30г" | 200 | Processed, no log |
| 2 | confirm_food | 200 | Processed |
| 3 | /addfood "тунец стейк 200г, киноа 200г, авокадо 100г" | 200 | Processed, no log |
| 4 | confirm_food | 200 | Processed |
| 5 | /today | 200 | Processed |
| 6 | /week | 200 | Processed |
| 7 | /vitamins | 200 | Processed |
| 8 | /stats | 200 | Processed |
| 9 | /profile | 200 | Processed |

---

## Final DB State

```json
{
  "id": "823b2349-ac56-482d-bb88-3e02eafbdb1f",
  "max_user_id": 990000019,
  "name": "?????" (garbled — Cyrillic encoding bug),
  "phone": null,
  "sex": null,
  "age": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": null,
  "onboarding_step": 0,
  "onboarding_completed": false,
  "context_state": "idle",
  "water_glasses": 2,
  "subscription_type": "trial",
  "last_active_at": "2026-04-04T19:25:15.889+00:00",
  "messages_today": 0,
  "photos_today": 0,
  "free_analyses_used": 0
}
```

**Food logs:** 0 (none saved)
**Messages stored:** 0

---

## Bugs Found

### 1. [CRITICAL] Onboarding permanently stuck at step 0 when MAX API is unavailable

**What happened:** All 65 events returned HTTP 200, but onboarding_step never advanced beyond 0. No profile data (sex, age, height, weight, goal, phone) was saved to the DB.

**Root cause:** The bot tries to send a reply to the user via `MAX API /messages?chat_id=990000019` after each onboarding step. For simulated users, this fails with `404 chat.not.found`. The state machine does NOT persist the new onboarding step before attempting the reply — it only updates state after successfully sending the message. So when the reply fails, the step doesn't advance.

**Expected:** Either (a) save state before sending reply (write-ahead), or (b) advance state regardless of send failure and log the reply error separately.

**Impact:** All simulated users are affected. Any real user with temporary messaging issues would also lose onboarding progress.

---

### 2. [HIGH] Name stored as garbled bytes — Cyrillic encoding bug

**What happened:** The name "Елена" was stored in the DB as `"?????"` (5 replacement characters in Supabase UI, actual bytes corrupted). The name field from `bot_started` event is not properly UTF-8 decoded before storage.

**Expected:** Name "Елена" stored and displayed correctly.

**Impact:** All users with Cyrillic names (majority of Russian-speaking user base) will have corrupted names in the DB. Affects personalized messaging.

---

### 3. [HIGH] No food logs created for any /addfood command

**What happened:** All 10+ /addfood commands (with confirm_food callback) returned HTTP 200, but `nutri_food_logs` table has 0 rows for this user.

**Root cause:** Same as bug #1 — the bot's food logging flow requires sending a confirmation message back to user. When MAX API send fails, the food entry is not persisted.

**Expected:** Food should be saved to DB upon /addfood parsing (before reply), and confirmation should be a cosmetic follow-up.

---

### 4. [MEDIUM] /water partially incremented — only 2 of 11 calls registered

**What happened:** Sent /water 11 times across Day 2 and Day 3. DB shows water_glasses=2, not 11.

**Possible causes:** (a) same MAX API reply failure causing water not to persist, (b) daily reset capping counter, (c) rate limiting on water commands per session.

**Expected:** Each /water command should increment the counter by 1. Final value should be 11 (or reset to daily logic, but should show >2).

---

### 5. [MEDIUM] messages_today counter stuck at 0

**What happened:** Despite receiving 65+ events including text messages, the `messages_today` counter in the user record remains 0.

**Expected:** Should reflect the number of messages processed today.

---

### 6. [LOW] photos_today counter stuck at 0

**What happened:** Sent 1 food image (Day 5). `photos_today` remains 0.

**Expected:** Should increment to 1 after image processing.

---

### 7. [LOW] free_analyses_used stuck at 0 despite deepcheck + vitamins + recipes + mealplan

**What happened:** Used /deepcheck, /vitamins, /recipes, /mealplan (deepcheck flows). `free_analyses_used` remains 0.

**Expected:** Should track usage of analysis features for trial quota management.

---

### 8. [INFO] goal_text column does not exist in nutri_users table

**What happened:** When verifying custom goal text storage, a query with `goal_text` column returned: `{"code":"42703","message":"column nutri_users.goal_text does not exist"}`.

**Note:** The custom goal flow sends a text after `goal_custom` callback. If this text is supposed to be saved, there's no schema column for it. It may be stored in `context_state` or AI memory instead — needs verification once onboarding flow is fixed.

---

### 9. [SYSTEMIC] MAX API 404 errors suppress all state changes

**Root cause (systemic):** All errors in `nutri_error_log` for simulated personas share the pattern:
```
routeUpdate error: MAX API /messages?chat_id=990000019: 404 {"code":"chat.not.found","message":"Chat 990000019 not found"}
```
The bot's architecture ties state persistence to successful message delivery. This is a design issue that affects all simulated users. For real users the chat always exists, but the pattern means any transient MAX API failure could cause data loss.

---

## Engagement Notes

- **Macro-tracking focus is well-matched** to the `/addfood` + confirm flow — if the flow worked, Елена's detailed entries (precise grams, ingredient separation) would exercise the AI nutrition parser well
- **Custom goal flow** (goal_custom callback + text) is a good UX design for athletes — but goal_text has no DB column, suggesting it may only live in AI context (ephemeral)
- **Pre/post-WOD naming convention** in food descriptions is athlete-natural and would be a good AI parsing test case
- **Decimal weight (58.5 kg)** via /editprofile is a common crossfit use case — test blocked by onboarding freeze
- **Precise macros in /addfood** ("237г без кожи", "183г сухой вес") — real crossfiter behavior, needs AI to handle "dry weight" vs "cooked weight" distinction
- **Sticker handling** — returned 200, no crash; graceful degradation confirmed at transport level
- **Electrolytes free text** — important AI persona question for sport goal; unable to verify response content due to delivery failures

## UX Friction Points

- No fallback if bot can't deliver messages — user gets silence, assumes bot is broken
- No acknowledgment of received input without response (e.g., store-first, confirm-later pattern missing)
- Custom goal text requires a separate text step after button — slightly awkward; could be inline
- Water tracking (11 taps in 2 days) is natural for crossfit hydration but counter not reliable

---

## Raw Errors (from Supabase nutri_error_log)

All errors are the same pattern, affecting all simulated personas:

```
error_type: "webhook"
message: "routeUpdate error: MAX API /messages?chat_id=990000019: 404
  {"code":"chat.not.found","message":"Chat 990000019 not found"}"
context: {"chat_id": 990000019, "update_type": "bot_started" | "message_created" | "message_callback"}
```

Also noted from Day 1 first call (UID bash readonly variable — system UID 197609 used):
```
error_type: "webhook"
message: "routeUpdate error: MAX API /messages?chat_id=197609: 404 {chat.not.found}"
context: {"chat_id": 197609, "update_type": "bot_started"}
```
This stray call created no persistent user record for chat_id 197609.

Additional table name mismatch found in SIM_GUIDE.md:
- Guide references `nutri_error_logs` (plural)
- Actual table is `nutri_error_log` (singular)
- Error: `{"code":"PGRST205","hint":"Perhaps you meant the table 'public.nutri_error_log'"}`

---

## Summary Table

| Feature | Sent | Processed (HTTP 200) | State Saved | Notes |
|---------|------|---------------------|-------------|-------|
| Onboarding (full) | 9 events | 9 | 0 fields | All fail at MAX API reply |
| /addfood | 10 | 10 | 0 logs | No food saved |
| confirm_food | 10 | 10 | 0 | Nothing to confirm |
| /water | 11 | 11 | 2 | Only 2 registered |
| /today, /week | 4 | 4 | - | Read commands |
| /vitamins | 2 | 2 | - | |
| /deepcheck | 1 | 1 | - | |
| /stats | 2 | 2 | - | |
| /recipes | 1 | 1 | - | |
| /mealplan | 1 | 1 | - | |
| /editprofile | 2 | 2 | 0 | No change |
| /allergy | 1 | 1 | - | |
| /reminders | 1 | 1 | - | |
| /profile | 1 | 1 | - | |
| send_image | 1 | 1 | 0 | photos_today=0 |
| send_sticker | 1 | 1 | - | No crash |
| free text (AI) | 3 | 3 | - | |
| **TOTAL** | **~65** | **65** | **minimal** | |
