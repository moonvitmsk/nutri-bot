# Persona 28: Григорий (Гриша)

## Profile
- Age: 44 (birth date: 10.11.1981, calculated from date string)
- Sex: male (set via callback; NOT saved to DB — sex field null)
- Height: 174 cm (set during onboarding; NOT saved — height_cm null)
- Weight: 85 kg start → 84 kg edit attempt (NOT saved — weight_kg null)
- Goal: maintain
- User ID: 990000028
- DB ID: 2ca28ac7-20b7-4241-8856-6ce6c115d6b9

## Simulation Summary
- Days simulated: 7
- Total events sent: ~65
- Errors encountered: 4 distinct bugs found
- All webhook calls returned `{"ok":true,"processed":1}`

## Day-by-Day Execution Log

### Day 1: Full onboarding with birth date
- bot_started → OK, user created
- send_contact (+79001000028) → OK, phone accepted
- name_confirm callback → OK
- sex_male callback → OK (processed but NOT saved to DB)
- Text "10.11.1981" sent as age step → bot accepted it, birth_date stored as "1981-11-10", age calculated as 44
- "174" (height) → OK (processed but NOT saved)
- "85" (weight) → OK (processed but NOT saved)
- goal_maintain callback → OK, onboarding_completed=true
- /addfood "каша гречневая 200г, яйцо варёное 2шт, чай без сахара" → OK
- confirm_food → OK (no food log row found in DB for this user — likely MAX API delivery error)

### Day 2: Systematic logging
- /addfood breakfast (творог, банан, мёд) → confirm_food → OK
- /addfood lunch (суп щавелевый, куриная грудка, рис) → confirm_food → OK
- /addfood dinner (рыба запечённая, салат, хлеб) → confirm_food → OK
- /water x4 → all OK, water_glasses only shows 3 (counter likely resets or capped)
- /today → OK

### Day 3: All verification commands
- /today, /week, /vitamins, /stats, /profile, /help → all OK (200 responses)
- /addfood "каша овсяная, яблоко, орехи" → confirm_food → OK
- /water x3 → OK

### Day 4: All callback flows
- /deepcheck → deep_full → OK
- /recipes → recipe_any → OK
- /mealplan → mealplan_week → OK
- action_more → OK
- /subscribe → OK
- /allergy (show) → OK

### Day 5: Edit every field
- /editprofile → edit_name → "Гриша" → OK
- /editprofile → edit_sex → sex_male → OK (sex still null in DB)
- /editprofile → edit_birth → "10.11.1981" → OK, birth_date="1981-11-10" confirmed
- /editprofile → edit_height → "174" → OK (height_cm still null in DB)
- /editprofile → edit_weight → "84" → OK, context_state set to "editing_weight" — weight NOT committed
- /editprofile → edit_goal → goal_maintain → OK
- /editprofile → edit_goal_text → "поддерживать текущий вес и здоровье" → OK
- Final check: age=44, birth_date=1981-11-10, sex=null, height_cm=null, weight_kg=null

### Day 6: Delete + reminders + edge
- /addfood "тест удаления 100г" → confirm_food → OK
- /delfood 1 → OK
- /today → OK
- /reminders → toggle_morning → toggle_evening → all OK
- /allergy глютен → OK, allergies field updated (contains garbled bytes in DB — encoding issue)
- /allergy (verify) → OK
- /allergy нет (clear) → OK
- /allergy (verify empty) → OK
- Send sticker → OK
- Send video → OK

### Day 7: Final comprehensive
- /addfood "завтрак инженера: каша, яйца 3шт, кофе, тост с маслом" → confirm_food → OK
- /addfood "обед: говядина тушёная, картофель, квашеная капуста" → confirm_food → OK
- /today → /week → /vitamins → /stats → /profile → all OK

## Bugs Found

1. **[HIGH] sex, height_cm, weight_kg NOT saved to DB during onboarding**
   - Onboarding steps for sex, height, weight all returned OK but DB shows sex=null, height_cm=null, weight_kg=null
   - Expected: fields persisted after each step
   - birth_date/age DO get saved correctly
   - Likely a DB write failure silently swallowed during onboarding steps 3, 5, 6

2. **[HIGH] Food logs not created for text-based /addfood**
   - Multiple /addfood + confirm_food sequences returned OK but nutri_food_logs table has zero rows for this user
   - The MAX API "chat.not.found" errors from other personas suggest the bot tries to send the response via MAX API and fails; the food may not be committed if the send fails
   - last_food_date remains null, suggesting the food save never completed

3. **[MEDIUM] Allergy field stores garbled bytes (encoding issue)**
   - After /allergy глютен, the allergies column shows garbled bytes: `["���"]` instead of `["глютен"]`
   - Cyrillic text in JSONB array field is not being stored or retrieved with correct encoding
   - Expected: `["глютен"]`

4. **[MEDIUM] edit_weight leaves context_state="editing_weight" without committing**
   - After sending "84" in edit_weight flow, context_state stayed as "editing_weight"
   - weight_kg remains null — the value was not persisted
   - Expected: weight_kg=84, context_state returns to "idle"

5. **[LOW] water_glasses counter shows 3 after 7 total /water commands**
   - 4 water on Day 2 + 3 on Day 3 = 7 total, but DB shows water_glasses=3
   - Likely resets daily (expected behavior) but worth confirming if Day 2 count was lost

## Engagement Notes
- Methodical flow works well: the engineer persona naturally follows all prompts step by step
- Birth date parsing (DD.MM.YYYY) works correctly during onboarding — bot recognized it and calculated age
- All callback payloads processed without errors on the webhook side
- The MAX API "chat.not.found" errors are systemic: all stress-test personas (990000028 etc.) exist in DB but have no real MAX chat, so bot responses fail silently
- Sticker and video both processed without crashing the bot (good resilience)
- /reminders → toggle_morning/toggle_evening flow accepted without errors
- The /allergy add → verify → clear → verify cycle works at the command routing level

## Raw Errors (from nutri_error_log)

All errors are MAX API delivery failures affecting all stress-test personas:
```
routeUpdate error: MAX API /messages?chat_id=990000028: 404 {"code":"chat.not.found","message":"Chat 990000028 not found"}
```
These are expected for synthetic personas — no real MAX chat exists.
However, they indicate that when the bot fails to send a response, it may also be aborting the food save transaction (see Bug #2).

## Final DB State
```json
{
  "name": "[garbled]",
  "age": 44,
  "sex": null,
  "height_cm": null,
  "weight_kg": null,
  "goal": "maintain",
  "birth_date": "1981-11-10",
  "water_glasses": 3,
  "allergies": ["[garbled]"],
  "onboarding_completed": true,
  "context_state": "idle",
  "subscription_type": "trial"
}
```
