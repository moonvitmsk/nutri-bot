# Persona 04: Дмитрий

## Profile
- Age: 22, Sex: male (not set via skip), Height: 175 cm, Weight: 65 kg, Goal: gain
- User ID: 990000004
- DB UUID: 99012ade-d7bc-4473-80d6-5da322482912
- Phone: +79001000004

## Simulation Summary
- Days simulated: 7
- Total events sent: ~45
- Errors encountered: 0 (for this persona — no errors in nutri_error_log linked to chat_id 990000004)

## Day-by-Day Results

### Day 1: Onboarding skip
- `bot_started` — first call did NOT create user (returned ok:true but record absent); second call created correctly
- `send_contact` — ok
- `callback profile_skip` — ok; defaults applied: height=170cm, weight=70kg, goal=maintain, onboarding_completed=true
- `/addfood доширак и 2 сосиски` + `confirm_food` — ok (processed, no food_log record created — text-based addfood does not write to nutri_food_logs)

**BUG FOUND:** Bot returns `{"ok":true,"processed":1}` on `bot_started` but does NOT create the user record on the first call. Second identical call creates it. Likely a race condition or silent failure on first init.

### Day 2: Fast food
- `/addfood бигмак, картошка фри большая, кола 0.5` + confirm — ok
- `/addfood шаурма куриная большая` + confirm — ok
- `/today` — ok
- Free text `"а это вредно?"` — triggered AI chat (responded in context of nutrition, mentioned calories/norms); message stored in nutri_messages

### Day 3: Photo + corrections
- Food image sent (Big Mac photo URL) — ok
- `edit_weight_food` callback — ok
- Sent `"300"` as weight — bot misinterpreted as AI chat, responded: "300 — это что именно? Ккал, граммов, рублей или шагов?" — **BUG:** weight input after edit_weight_food callback was not captured as food weight; went to AI chat context instead
- `confirm_food` — ok (processed)
- `/vitamins` — ok
- `/water` — ok (water_glasses incremented)
- `/addfood пельмени 400г, майонез` + confirm — ok

**BUG FOUND:** After `edit_weight_food` callback, the next text message `"300"` was routed to AI chat instead of being consumed as the weight correction input. Context state did not switch to `awaiting_weight`. This breaks the photo edit-weight flow.

### Day 4: Healthy eating + deepcheck
- `/recipes` — ok
- `recipe_breakfast` callback — ok
- `/addfood яичница 3 яйца, тост, кофе` + confirm — ok
- `/addfood суп куриный из столовой` + confirm — ok
- `/deepcheck` — ok
- `deep_diet` callback — ok
- `/stats` — ok

### Day 5: Profile fix
- `/editprofile` → `edit_height` → `"175"` — ok; height_cm updated to 175
- `/editprofile` → `edit_weight` → `"65"` — ok; weight_kg updated to 65.0
- `/editprofile` → `edit_goal` → `goal_gain` — ok; goal updated to gain
- `"зови меня Дима"` — routed to AI chat (no name change in DB; name remains encoded); AI responded with nutrition advice, did not acknowledge the name request
- `/addfood роллы филадельфия 8шт` + confirm — ok
- `/water` x2 — ok; water_glasses=3 total

**OBSERVATION:** "зови меня Дима" did not trigger name update. Bot should detect AI-memory pattern and update profile name field. Treated as generic chat only.

**VERIFY:** After Day 5 edits confirmed in DB: height_cm=175, weight_kg=65.0, goal=gain — all correct.

### Day 6: Edge cases
- `"привет"` — triggered AI chat correctly; bot responded with nutrition context
- `"покажи дневник"` — routed to AI chat, NOT to /today intent; bot responded with general advice mentioning calorie norms. **POSSIBLE BUG:** Natural language intent "показать дневник" should map to /today but did not
- `"хочу воды"` — routed to AI chat, NOT triggering water log. **POSSIBLE BUG:** Water intent detection from natural language not working
- `/addfood` (no args) — processed; bot likely asked for description (expected behavior)
- `/promo TESTCODE123` (invalid) — processed; expected rejection message
- `/subscribe` — processed ok

### Day 7: Final checks
- `/addfood гречка 200г, сардельки 2шт, кетчуп` + confirm — ok
- `/today`, `/week`, `/vitamins`, `/stats`, `/invite` — all ok (processed)

## Bugs Found

1. **[HIGH] First bot_started does not create user** — `bot_started` returns `{"ok":true,"processed":1}` but user record is not in DB. Second identical event creates it. Silent failure on first init, no error logged. Affects new user acquisition.

2. **[HIGH] edit_weight_food breaks context** — After `edit_weight_food` callback, sending `"300"` went to AI chat instead of being consumed as weight correction. Bot replied "300 — это что именно? Ккал, граммов?" Context state not set to weight-awaiting mode after edit_weight_food.

3. **[MEDIUM] Natural language intent "покажи дневник" not mapped to /today** — Free text intent detection for diary/food log viewing does not trigger /today command. Routes to generic AI chat.

4. **[MEDIUM] Natural language intent "хочу воды" not triggering /water** — Water-related intent in free text does not log water glass. Routes to AI chat instead.

5. **[LOW] "зови меня [name]" pattern not updating profile name** — AI memory pattern for name change ("зови меня Дима") handled as generic chat, name not persisted to DB. Mentioned in SIM_GUIDE as expected feature.

6. **[INFO] Text-based /addfood not writing to nutri_food_logs** — Only photo-based food entries write to nutri_food_logs table. Text /addfood confirmed entries produce no record in that table. Either different storage mechanism or bug. last_food_date remains null after multiple text food entries.

7. **[INFO] nutri_error_log table name mismatch in SIM_GUIDE** — Guide references `nutri_error_logs` (plural) but actual table is `nutri_error_log` (singular). Minor doc issue.

## Engagement Notes
- Onboarding skip path works well — fast entry for impatient users
- Profile edits (height/weight/goal) through /editprofile flow are reliable
- AI chat is contextually aware of user goal (gain mass) and gave relevant protein/calorie advice
- Water tracking via /water command works; natural language water intent does not
- Photo food logging triggers AI analysis but weight-edit flow is broken
- /deepcheck + deep_diet callback works
- /recipes + recipe_breakfast callback works
- /promo with invalid code handled gracefully (no crash)
- streak_days=0 despite food entries — either cross-day requirement or text-based entries don't count toward streak

## Final DB State (Day 7 end)
- height_cm: 175, weight_kg: 65.0, goal: gain
- onboarding_completed: true, onboarding_step: 8
- water_glasses: 3
- messages_today: 4
- photos_today: 0
- last_food_date: null (text-based entries don't set this field)
- streak_days: 0
- context_state: idle
- subscription_type: trial
- daily_calories: 2850, daily_protein: 130, daily_fat: 79, daily_carbs: 405

## Raw Errors (from nutri_error_log)
No errors recorded in nutri_error_log for chat_id 990000004.

System-wide errors present in the log are all `chat.not.found` 404s from MAX API — these affect all virtual test personas (990000003–990000025, 197609) since simulated user IDs do not have real MAX messenger chats. Bot processes logic correctly but cannot deliver responses back. This is expected in the test environment.

Example system error pattern (not specific to persona 04):
```
routeUpdate error: MAX API /messages?chat_id=990000004: 404 {"code":"chat.not.found","message":"Chat 990000004 not found"}
```
This means all bot responses are computed but silently fail on delivery — business logic and DB writes still execute correctly.
