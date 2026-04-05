# Persona 10: Иван Петрович

## Profile
- Age: 60, Sex: male, Height: 175 cm, Weight: 82 kg, Goal: healthy (mapped to maintain)
- User ID: 990000010
- Phone: +79001000010
- DB UUID: fc5e960f-9f03-4517-b6c6-bdde5ee3228d
- Personality: retired, non-tech-savvy, writes formally with patronymic

## Simulation Summary
- Days simulated: 7
- Total events sent: ~55
- Onboarding completed: YES (step 8, after manual intervention)
- Food logs saved: 0 (all failed due to sendMessage abort)
- Water glasses logged: 5
- Errors encountered: multiple (onboarding stuck, name encoding, food not saved, birth_date not updated)

---

## Bugs Found

### 1. [CRITICAL] Onboarding stuck — goal callback silently fails mid-flow

**What happened:** At onboarding step 6 (goal selection), sending `goal_healthy` callback set `goal=maintain` and `onboarding_step=7` in DB, then called `finishOnboarding()` which triggered `sendMessage()`. The `sendMessage` threw a 404 error. This caused the entire callback handler to propagate an exception, leaving the user stuck: goal was partially saved but `onboarding_completed` was never set to `true` (which requires step 7→8 in `finishOnboarding`). A second trigger (sending `goal_healthy` again after manual step 7 patch) was required to complete onboarding.

**Expected:** A single goal callback should complete onboarding atomically, regardless of messaging API failures.

**Severity for non-tech users:** Critical. A 60-year-old user who pressed "Здоровый образ жизни" once and got no response would have no idea what happened. They would not know to press the button again, or why nothing worked.

**Root cause:** `finishOnboarding` calls `sendMessage` AFTER the DB writes. If `sendMessage` throws, the exception bubbles up and terminates further processing. The onboarding state (step 7→8 + `onboarding_completed=true`) is set inside `finishOnboarding`'s `updateUser` call BEFORE `sendMessage`, so theoretically both updates commit — but the FIRST `updateUser` (goal + step=7) at line 485 completes, while `finishOnboarding`'s `updateUser` (step=8, completed=true) also likely completes. Investigation showed the user remained at step=6 after first goal callbacks, suggesting that the sequence failed earlier. Manual patching to step=7 and resending the goal callback then completed onboarding successfully.

---

### 2. [HIGH] Name encoding corruption — Cyrillic name stored as garbage

**What happened:** User name "Иван Петрович" (passed in bot_started `name` field) is stored in Supabase as `"���� ��������"` (mojibake). The `sanitizeDisplayName` function or the DB write path is corrupting multi-byte Cyrillic characters.

**Expected:** Name should be stored and displayed correctly as "Иван Петрович".

**UX impact for non-tech users:** If the bot greets the user by the corrupted name, it would be deeply confusing and unprofessional. For older users, this erodes trust immediately.

---

### 3. [HIGH] Spelled-out age rejected with no guidance

**What happened:** When prompted for age during onboarding, the user typed "шестьдесят" (sixty in Russian words). The bot rejected this silently (step stayed at 3, no visible response). The user then typed "60" which worked.

**Expected behavior options:**
  - Parse spelled-out numbers (шестьдесят = 60)
  - Show a clear error message: "Пожалуйста, введи возраст цифрами, например: 60"

**Current behavior:** Silent rejection with no error message sent to user (sendMessage call fails for sim IDs, but even in production the bot appears to just re-send the age prompt without explaining the format).

**UX impact:** Older users frequently write numbers in words. The complete absence of a format hint during age entry creates a dead end.

---

### 4. [HIGH] /addfood text — food never saved (sendMessage throws before AI call)

**What happened:** All `/addfood` commands with inline text (e.g., `/addfood каша гречневая, котлета, хлеб, чай`) resulted in 0 food logs for user 10 across 7 days. The `handleFoodText` function calls `sendMessage(chatId, 'Считаю КБЖУ...')` at line 29 BEFORE the AI analysis. This `sendMessage` throws 404, aborting the entire function before `saveFoodLog` is reached.

**Expected:** Food should be analyzed and saved even if reply sending fails.

**UX impact:** For a user who types food descriptions (as non-tech users often prefer over photos), absolutely nothing is recorded. No error, no feedback. The user sees silence.

**Note:** This is a simulation artifact (simulated chat IDs generate 404), but the architectural pattern is fragile — `sendMessage` failures should not abort food saving.

---

### 5. [MEDIUM] Onboarding name prompt confused by formal patronymic input

**What happened:** After `name_change` callback, the bot prompted for a name. User entered "Иван Петрович" (formal name with patronymic — a very common pattern for Russian users 60+). The bot accepted this and stored it (despite the encoding issue). However, this could trigger name validation concerns — the validator at step 1 checks `isGreeting`, `isTooShort`, `isNumber`. A name with a space and patronymic passes validation, but older users who enter full formal names ("Иванов Иван Петрович") with 3 words might be treated inconsistently.

**Expected:** Explicit acceptance of full Russian names with patronymics.

---

### 6. [MEDIUM] Birth date edit ("15.03.1966") not saved

**What happened:** After `/editprofile` → `edit_birth` callback → sending "15.03.1966", the `birth_date` field remained null in Supabase. The `handleProfileEdit` function handles `editing_birth` context, and `parseBirthDate` should parse DD.MM.YYYY format.

**Expected:** Birth date "15.03.1966" should be parsed to ISO date and saved, age recalculated to ~59-60.

**UX impact:** Users who try to correct their date of birth (a common scenario for older users) get no feedback and the edit is silently lost.

---

### 7. [MEDIUM] /Сегодня (wrong case) and /todey (typo) not handled gracefully

**What happened:** Sending `/Сегодня` (Cyrillic today, wrong case) and `/todey` (typo of /today) were both processed with `{"ok":true,"processed":1}` but likely fell through to AI chat or unknown command handler.

**Expected for non-tech users:**
  - `/Сегодня` should either be recognized as a valid alias or return a helpful "did you mean /today?" message
  - Typos like `/todey` should trigger fuzzy matching or a command suggestion

**UX impact:** Older users commonly mistype commands. No suggestion/correction means they get confused responses.

---

### 8. [LOW] Water counter works but no user feedback (silent for sim)

**What happened:** `/water` commands incremented `water_glasses` (final count: 5 across all days). Bot processed correctly. No observable issues beyond the usual sendMessage 404.

**Expected:** Working correctly in production. The water tracking feature is reliable.

---

### 9. [LOW] "Хочу удалить данные" intent detection

**What happened:** Text "Хочу удалить данные" was sent — intent detection should have matched `deletedata`. Bot processed it (ok:true), but outcome not directly verifiable due to sendMessage failures. The `cancel_delete` callback was sent and presumably prevented deletion.

**Expected:** The intent detector correctly identifies delete intent and routes to `/deletedata` flow.

---

### 10. [LOW] No food logs → /today, /week, /stats return empty summaries

**What happened:** Since no food was successfully saved (due to bug #4), all summary commands (/today, /week, /stats) would show empty results. From a UX perspective for older users, an empty diary with no explanation of why ("you haven't logged anything today") is confusing.

**Expected:** Bot should remind user how to log food when diary is empty.

---

## Engagement Notes

### Features used during simulation
- Onboarding: fully tested (required 2 attempts for goal step)
- /addfood (text): tested 5 times — all failed to save food
- /water: 5 times — working
- /vitamins, /deepcheck, /today, /week, /stats, /help, /profile, /recipes, /mealplan: all triggered
- /editprofile → edit_birth: tested, birth_date not saved
- /reminders → reminders_on: triggered
- Free-text chat: multiple times ("Уважаемый бот...", "Спасибо", age correction)

### What felt natural for older users
- The step-by-step onboarding structure with buttons is appropriate for the audience
- `/addfood` with inline text (not requiring a photo) is the right UX for non-tech users who don't want to take photos
- Formal Russian phrasing ("Уважаемый бот") being routed to AI chat is correct behavior

### UX friction points specific to older/non-tech users
1. **No format hints during onboarding** — when age is rejected (spelled-out), the bot should say "введи цифрами: например, 60"
2. **Goal selection appears to do nothing** — pressing the goal button and getting silence (real users would see the welcome message fail to appear) is extremely confusing for non-tech users who don't retry
3. **Text food entry appears broken** — the most natural input mode for this demographic (typing "каша, котлета, чай") silently fails
4. **No "did you mean?" for command typos** — `/Сегодня`, `/todey` should have graceful degradation
5. **Empty diary with no onboarding to usage** — after completing onboarding, if the welcome message fails, the user has no idea what to do next

---

## Final User State (verified in Supabase)

| Field | Value |
|-------|-------|
| onboarding_completed | true |
| onboarding_step | 8 |
| name | corrupted (encoding bug) |
| sex | male |
| age | 60 |
| height_cm | 175 |
| weight_kg | 82 |
| goal | maintain |
| daily_calories | 2509 |
| daily_protein | 131 |
| daily_fat | 70 |
| daily_carbs | 339 |
| water_glasses | 5 |
| birth_date | null (edit failed) |
| subscription_type | trial |

---

## Raw Errors (from Supabase error_log)

All errors for sim users are `MAX API /messages?chat_id=99000XXXX: 404 {"code":"chat.not.found"}` — this is expected for simulated IDs.

Key architectural issue exposed by simulation: **sendMessage 404 errors propagate as thrown exceptions**, causing any handler that calls `sendMessage` early (before DB writes) to abort processing. This creates silent failures for all food-related operations and potentially other features in production if the MAX API has transient failures.

---

## Recommendations for Older User UX

1. **Wrap all `sendMessage` calls in try-catch** so DB operations don't abort on messaging failures
2. **Add format hints to all onboarding prompts** — especially age (Пример: 60), height (Пример: 175), weight (Пример: 82)
3. **Add spelled-out number parsing** for age at minimum (шестьдесят, шестьдесят лет → 60)
4. **Fix Cyrillic name encoding** in the `sanitizeDisplayName` path
5. **Add command fuzzy matching** or at minimum a "Команда не найдена — /help" response for unknown commands
6. **Ensure finishOnboarding is atomic** — don't depend on sendMessage success for state completion
