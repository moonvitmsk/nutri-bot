# Persona 20: Роман (Roman)

## Profile
- Age: 31, Sex: male, Height: 183 cm, Weight: 82 kg, Goal: healthy
- User ID: 990000020
- DB UUID: 21ce5ef5-4a9a-4e31-9422-6564e2e9fa91
- Personality: Professional chef, describes meals with full ingredient lists and weights

## Simulation Summary
- Days simulated: 7
- Total events sent: 47
- Successful HTTP 200 responses: 47 (100%)
- Food entries logged to DB: 0
- Messages logged to DB: 0
- Errors in nutri_error_log for this user: 0 (all failures silent)
- Water glasses tracked: 3 (only feature that persisted)

## Critical Bugs Found

### 1. [CRITICAL] User creation delayed/missing — bot_started silently discarded on first 2 attempts
- Sent bot_started 3 times for UID 990000020 before user appeared in DB
- First two calls returned HTTP 200 but created no DB record
- User eventually appeared at created_at=2026-04-04T19:23:04 (approx 2+ minutes after first send)
- DB shows gap: 990000019 → 990000021 in sequence from concurrent test run, 990000020 appeared later
- Expected: user created on first bot_started
- Actual: user silently not created; no error logged; no indication of failure

### 2. [CRITICAL] Onboarding never progresses past step 0 for all sim users
- All subsequent onboarding events (send_contact, name_confirm, sex_male, age, height, weight, goal_healthy) returned HTTP 200
- User remained at onboarding_step=0, onboarding_completed=false
- Root cause: MAX API /messages returns 404 "chat.not.found" for all sim UIDs (990000020+)
- The welcome card fails, bot never sends the next onboarding prompt
- Without prompt, callback responses (name_confirm, sex_male, etc.) have no pending context to act on
- Expected: onboarding state machine progresses even if message delivery fails
- Actual: entire onboarding blocked by delivery failure; state never advances

### 3. [CRITICAL] All /addfood commands silently dropped for non-onboarded user
- 11 /addfood events sent across 7 days with complex multi-ingredient descriptions
- All returned HTTP 200 with {"ok":true,"processed":1}
- Zero food log entries created in nutri_food_logs
- No errors logged in nutri_error_log
- Expected: either process food entry (goal_healthy user should be able to log food) or return error indicating onboarding required
- Actual: silent drop with success response — misleads caller into thinking food was logged

### 4. [HIGH] confirm_food callbacks silently ignored when no pending food entry exists
- 8 confirm_food callbacks sent after /addfood commands
- All returned HTTP 200
- No food confirmations in DB (as food was never queued)
- Expected: bot should respond "no pending food entry" or process the pending entry
- Actual: complete silence, no state change, no error

### 5. [HIGH] Commands executing on non-onboarded user without gating
- /water: WORKED — water_glasses incremented to 3 across 3 calls (Day 3)
- /today, /week, /vitamins, /stats, /profile, /deepcheck, /mealplan, /recipes, /allergy: all returned 200 but no DB traces
- Inconsistent gating: water works, food does not — no clear policy on which commands require completed onboarding

### 6. [MEDIUM] No error logging for UID 990000020 despite multiple failures
- nutri_error_log shows errors for other sim users (990000017, 990000021, etc.) but none for 990000020
- All failures for this user are completely silent
- Expected: at minimum, welcome_card failure should be logged with user_id=990000020
- Actual: no trace of failures; compare with 990000021 which DID get logged

### 7. [LOW] Sticker handling — unknown behavior
- Sticker event sent on Day 6
- HTTP 200 returned, no error logged
- Cannot verify if bot responded gracefully (delivery fails anyway for sim users)
- From other personas' errors, bot likely handled it but response delivery failed

## AI Complex Food Parsing — Analysis

Since food logs were not persisted (due to onboarding_completed=false), it was impossible to directly observe AI calorie estimates for complex dishes. However, the webhook accepted all /addfood payloads without HTTP errors, suggesting the AI parsing layer does not fail on complex input.

Dishes sent for AI parsing (none confirmed in DB):
- Ризотто с белыми грибами: 7 ingredients with weights — high complexity
- Яйца бенедикт: 5 ingredients including hollandaise sauce
- Том-ям с креветками: 7 ingredients, exotic items (galangal, lemongrass)
- Стейк рибай: preparation method (medium-rare) + side dishes
- Паста алио олио: 5 ingredients including unlisted quantities (garlic cloves, not grams)
- Утка конфи + картофель дофинуа: French culinary terms
- Тирамису домашнее: dessert with coffee
- Хачапури по-аджарски: Georgian dish, egg+butter variant
- Фо бо: Vietnamese soup, 7 ingredients including herbs without gram weights
- Поке боул: 6 ingredients, sushi rice + raw fish

Key observation: the AI parser received inputs where:
- Some ingredients lacked weight (galangal, lemon grass, herbs, chili) — tests implicit quantity handling
- Preparation method specified without weight impact (medium-rare)
- Exotic/regional dish names used alongside ingredient lists
- Mix of Russian culinary terms and foreign dish names

Unable to evaluate actual calorie accuracy due to onboarding bug blocking food log creation.

## Engagement Notes

- Chef-style descriptions are extremely detailed — 7+ ingredient entries are realistic for this persona
- The /addfood command text length (150-200 chars) did not cause any HTTP errors
- The bot correctly accepted Cyrillic food descriptions with mixed Latin terms (medium-rare, том-ям)
- /water was the only feature that actually persisted data — suggests partial command gating
- /deepcheck, /mealplan, /recipes with callback flows (recipe_custom, mealplan_today, deep_diet) all accepted without error
- action_restaurant callback accepted but restaurant menu image analysis unverifiable
- Free-text questions ("насколько точно AI считает калории?", "какие кухни мира самые здоровые?") sent without errors

## UX Friction Points
- Onboarding completely blocked for sim users — all test personas with sim UIDs face same issue
- No feedback to user when food log silently fails (critical for production UX)
- Chef users would expect precise per-ingredient breakdown — impossible to test due to blocked onboarding
- Mixed-language ingredient names (Italian/Japanese/Vietnamese) with Russian context not testable

## Raw Errors (from nutri_error_log)

No errors were logged specifically for user 990000020. All observed errors were for other sim users:
- Pattern: `MAX API /messages?chat_id=99000XXXX: 404 {"code":"chat.not.found"}`
- This error type logged for: 990000017, 990000021, 990000022, 990000024, 990000026, 990000027, 990000028, 990000029
- Conspicuous absence: 990000020 never appears in error_log despite identical failure mode

## DB State at End of Simulation

```json
{
  "onboarding_step": 0,
  "onboarding_completed": false,
  "water_glasses": 3,
  "streak_days": 0,
  "last_food_date": null,
  "messages_today": 0,
  "photos_today": 0,
  "free_analyses_used": 0,
  "subscription_type": "trial"
}
```

Food logs: 0 entries
Messages: 0 entries
