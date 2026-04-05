# Persona 01: Мария

## Profile
- Age: 28, Sex: female, Height: 165 cm, Weight: 58 kg, Goal: lose (похудеть)
- User ID (MAX): 990000001
- DB UUID: 165f6aab-bd72-4aaa-8313-9dddcb5b1f7e
- Phone: +79001000001
- Personality: офисный работник, следит за калориями, любит салаты и сладкое вечером

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- All HTTP responses: 200 OK
- Errors encountered: 2 (structural bugs, see below)

---

## Day-by-Day Log

### Day 1: Full Onboarding
| Step | Event | HTTP | Notes |
|------|-------|------|-------|
| 1 | bot_started | 200 | OK |
| 2 | send_contact (+79001000001) | 200 | OK |
| 3 | callback name_confirm | 200 | OK |
| 4 | callback sex_female | 200 | OK |
| 5 | text "28" (age) | 200 | OK |
| 6 | text "165" (height) | 200 | OK |
| 7 | text "58" (weight) | 200 | OK |
| 8 | callback goal_lose | 200 | OK |
| 9 | check_user | — | onboarding_completed=true, step=8 |
| 10 | /addfood "салат цезарь с курицей, 300г" | 200 | OK |
| 11 | callback confirm_food | 200 | OK |
| 12 | /today | 200 | OK |

Onboarding result: SUCCESS
- name: garbled (encoding bug — name stored as "�����" instead of "Мария")
- sex: female
- age: 28
- height_cm: 165
- weight_kg: 58.0
- goal: lose
- daily_calories: 1726
- subscription_type: trial

### Day 2: Regular Usage
| Event | HTTP | Notes |
|-------|------|-------|
| /addfood "кофе латте и круассан" | 200 | OK |
| callback confirm_food | 200 | OK |
| /water x3 | 200 x3 | OK |
| /addfood "греческий салат 250г, хлеб" | 200 | OK |
| callback confirm_food | 200 | OK |
| /addfood "паста карбонара 350г" | 200 | OK |
| callback confirm_food | 200 | OK |
| /today | 200 | OK |

### Day 3: Photo + Edge Cases
| Event | HTTP | Notes |
|-------|------|-------|
| send_image (Wikipedia food URL) | 200 | OK |
| callback confirm_food | 200 | OK |
| send_sticker | 200 | Handled gracefully |
| /vitamins | 200 | OK |
| /addfood "чай зелёный, яблоко, 2 печенья" | 200 | OK |
| callback confirm_food | 200 | OK |
| free text "сколько калорий в банане?" | 200 | OK — AI should respond |

### Day 4: Features Exploration
| Event | HTTP | Notes |
|-------|------|-------|
| /profile | 200 | OK |
| /stats | 200 | OK |
| /week | 200 | OK |
| /recipes | 200 | OK |
| callback recipe_lunch | 200 | OK |
| /water x2 | 200 x2 | OK |
| /addfood "овсянка с ягодами 300г" | 200 | OK |
| callback confirm_food | 200 | OK |
| /addfood "куриная грудка 200г, рис 150г, овощи" | 200 | OK |
| callback confirm_food | 200 | OK |

### Day 5: Deepcheck + Edit Profile
| Event | HTTP | Notes |
|-------|------|-------|
| /deepcheck | 200 | OK |
| callback deep_diet | 200 | OK |
| /editprofile | 200 | OK |
| callback edit_weight | 200 | OK |
| text "57" (new weight) | 200 | OK |
| /addfood "йогурт натуральный 200г, мюсли 50г" | 200 | OK |
| callback confirm_food | 200 | OK |
| /mealplan | 200 | OK |
| callback mealplan_today | 200 | OK |
| /water x4 | 200 x4 | OK |

Note: weight_kg in DB remained 58.0 after edit_weight flow — update may not have saved (see bugs).

### Day 6: Edge Cases
| Event | HTTP | Notes |
|-------|------|-------|
| send_text " " (space only) | 200 | Handled — no crash |
| send long text (190+ chars meal description) | 200 | Handled — AI likely parsed as food |
| send_video | 200 | Handled gracefully |
| /delfood (no number) | 200 | Handled — bot should show list or error |
| free text "зови меня Маша" | 200 | AI memory test |
| /allergy лактоза | 200 | OK |
| /reminders | 200 | OK |

### Day 7: Final Day
| Event | HTTP | Notes |
|-------|------|-------|
| /addfood "смузи из банана, шпината и молока" | 200 | OK |
| callback confirm_food | 200 | OK |
| /addfood "борщ с мясом 400г, сметана, хлеб" | 200 | OK |
| callback confirm_food | 200 | OK |
| /today | 200 | OK |
| /week | 200 | OK |
| /vitamins | 200 | OK |
| /stats | 200 | OK |
| /invite | 200 | OK |

---

## Final State (Supabase)

### User Record (after 7 days)
```json
{
  "id": "165f6aab-bd72-4aaa-8313-9dddcb5b1f7e",
  "max_user_id": 990000001,
  "name": "?????" (garbled),
  "sex": "female",
  "age": 28,
  "height_cm": 165,
  "weight_kg": 58.0,
  "goal": "lose",
  "onboarding_step": 8,
  "onboarding_completed": true,
  "context_state": "idle",
  "water_glasses": 3,
  "streak_days": 0,
  "subscription_type": "trial",
  "daily_calories": 1726,
  "last_food_date": null,
  "free_analyses_used": 0
}
```

### Food Logs
- Query: `nutri_food_logs?user_id=eq.165f6aab-bd72-4aaa-8313-9dddcb5b1f7e` → **0 results**
- Food log entries exist in the table for other users, confirmed working for them
- Our user has `last_food_date: null` despite sending 10+ /addfood commands
- `free_analyses_used: 0` — suggests food was NOT processed/stored

### Water Count
- `water_glasses: 3` — expected 9 (3+2+4 = 9 across days 2,4,5)
- Water counter appears to reset daily or only counts last session

### Messages
- `nutri_messages` table query for our DB UUID returned 0 results
- Conversation history not stored (or stored under different schema)

---

## Bugs Found

### BUG-01 [HIGH] — Name encoding corrupted on save
- **What happened**: User name "Мария" stored as "?????" (5 replacement chars) in DB
- **Expected**: UTF-8 Cyrillic preserved in nutri_users.name
- **Field**: `nutri_users.name`
- **Likely cause**: Charset mismatch between MAX webhook payload encoding and DB insert

### BUG-02 [HIGH] — Food logs NOT saved for simulated users
- **What happened**: After 10+ /addfood + confirm_food events, `nutri_food_logs` shows 0 rows for user UUID
- **Expected**: Each confirmed food entry creates a row in nutri_food_logs
- **Observed**: `last_food_date: null`, `free_analyses_used: 0`
- **Likely cause**: Food is processed by AI and sent back via MAX API, but MAX API returns 404 (chat.not.found) because simulated user IDs don't have real MAX chats — the save to DB may be skipped when the MAX send fails, or the food log write is conditional on successful message delivery

### BUG-03 [MEDIUM] — Water count undercounted: shows 3 instead of 9
- **What happened**: Sent /water 9 times across 3 days (3+2+4), DB shows `water_glasses: 3`
- **Expected**: Cumulative total = 9 (or at minimum session-based tracking)
- **Possible cause**: `water_glasses` is reset on each day, but even within a single session the count didn't accumulate beyond 3

### BUG-04 [MEDIUM] — MAX API 404 errors for all simulated chat IDs (expected, but notable)
- **What happened**: Every outbound MAX API call fails with `{"code":"chat.not.found"}`
- **Expected in simulation**: These are fake user IDs not registered in MAX messaging platform
- **Impact**: Bot processes logic correctly (HTTP 200) but cannot send reply messages; all food confirmations and command responses are silently dropped
- **Note**: This is inherent to simulation testing, but error logs show unresolved errors accumulating

### BUG-05 [LOW] — check_errors helper references wrong table name
- **What happened**: `check_errors()` in sim-send.sh queries `nutri_error_logs` (plural)
- **Actual table**: `nutri_error_log` (singular) — confirmed by Supabase hint
- **Fix needed**: Update sim-send.sh line 83: `nutri_error_logs` → `nutri_error_log`

### BUG-06 [LOW] — streak_days always 0
- **What happened**: After 7 simulated days of usage, `streak_days: 0`
- **Expected**: Streak should increment with daily activity
- **Possible cause**: Streak calculation likely depends on timezone-aware date comparison against `last_food_date`; since no food was stored (BUG-02), streak never increments

---

## Engagement Notes

### What Worked Well
- Full onboarding flow completed in 8 steps without issues — clean sequential state machine
- All commands (/today, /week, /profile, /stats, /vitamins, /recipes, /deepcheck, /mealplan, /invite, /reminders, /allergy) returned HTTP 200 — no crashes
- Edge cases handled gracefully: sticker, video, space-only text, very long text — no 500 errors
- Food image upload flow works (HTTP 200 with URL attachment)
- Trial subscription correctly assigned on new user creation

### UX Friction Points
- Onboarding requires 8 sequential steps — could feel long for mobile users
- No feedback visible in simulation (all replies blocked by MAX API 404), making it hard to know if bot responded meaningfully
- `/delfood` with no number — unclear if bot shows a list or just an error; not verifiable without real chat
- `/editprofile` → `edit_weight` → send "57" did not update `weight_kg` in DB (remained 58.0) — broken or requires additional confirmation step

### Features Used Most
- /addfood (10+ times across 7 days) — core feature
- /water (9 times) — high frequency
- /today, /week — daily review
- /profile, /stats — profile inspection
- /deepcheck, /mealplan, /recipes — once each, as expected for weekly features

---

## Raw Errors (from nutri_error_log, last 20)

All 20 errors follow the same pattern:
```
error_type: "webhook"
message: "routeUpdate error: MAX API /messages?chat_id=99000XXXX: 404 {"code":"chat.not.found","message":"Chat 99000XXXX not found"}"
```

Affected chat IDs from other simulated personas: 990000003, 990000004, 990000005, 990000006, 990000007, 990000010, 990000013, 990000014, 990000016, 990000018, 990000022, 990000024

One welcome_card error also logged:
```
error_type: "welcome_card"
message: "Welcome card failed: MAX API /messages?chat_id=990000016: 404 {\"code\":\"chat.not.found\",...}"
user_id: 990000016
```

All errors: `resolved: false`

**Root cause**: Simulated user IDs (990000XXX) are not registered real MAX messenger users. The bot correctly processes logic but all outbound message sends fail with 404. The error log will accumulate indefinitely during stress testing.

**Recommendation**: Add a simulation/test mode flag that suppresses MAX API send attempts and logs responses locally instead, allowing full DB state testing without MAX dependency.
