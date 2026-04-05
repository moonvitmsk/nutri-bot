# NutriBot API Documentation

**Base URL**: `https://nutri-bot-sashazdes-gmailcoms-projects.vercel.app`
**Platform**: Vercel Serverless (Node.js)
**Bot Platform**: MAX (platform-api.max.ru)

---

## Endpoints

### `GET /api/webhook`

Health check.

**Response `200`**:
```json
{ "status": "ok", "bot": "NutriBot Moonvit" }
```

---

### `POST /api/webhook`

Main webhook endpoint. Receives all updates from the MAX bot platform.

**Headers**:
- `Content-Type: application/json`

**Body**: MAX Update object (see types below)

**Response `200`** (always, to prevent MAX retries):
```json
{ "ok": true }
```

**Response `405`** (non-GET/POST):
```json
{ "error": "Method not allowed" }
```

---

## Update Types

All updates have `update_type` discriminator.

### `bot_started`

Fired when user starts the bot for the first time.

```json
{
  "update_type": "bot_started",
  "chat_id": 123456,
  "user": {
    "user_id": 789,
    "name": "Иван"
  }
}
```

**Behavior**: Creates user record if not exists, invokes `/start` command.

---

### `message_created`

Fired on text or image message.

```json
{
  "update_type": "message_created",
  "message": {
    "sender": { "user_id": 789, "name": "Иван" },
    "recipient": { "chat_id": 123456 },
    "body": {
      "text": "Привет",
      "attachments": [
        {
          "type": "image",
          "payload": { "url": "https://..." }
        }
      ]
    }
  }
}
```

**Routing logic**:
- Image + `context_state = awaiting_qr` → QR handler
- Image + `context_state = awaiting_lab` → Lab photo handler
- Image (default) → Food photo handler
- Text starting with `/` → Command handler
- Text + onboarding not complete → Onboarding step handler
- Text → Chat handler

---

### `message_callback`

Fired on inline button press.

```json
{
  "update_type": "message_callback",
  "chat_id": 123456,
  "callback": {
    "callback_id": "abc123",
    "payload": "action_food",
    "user": { "user_id": 789, "name": "Иван" }
  }
}
```

---

## Bot Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Main menu or start onboarding | All |
| `/profile` | Show user profile and daily targets | Post-onboarding |
| `/today` | Today's food diary with macros summary | Post-onboarding |
| `/week` | Weekly statistics with trend vs previous week | Post-onboarding |
| `/water` | Log one glass of water (tracks 0–8/day) | All |
| `/deepcheck` | Start 4-agent deep nutrition consultation | Trial/Premium |
| `/lab` | Prepare to receive blood test photo | Trial/Premium |
| `/subscribe` | Show subscription status / QR activation info | All |
| `/reset` | Clear message history | All |
| `/deletedata` | Delete all user data (with confirmation) | All |
| `/help` | Show command list with disclaimer | All |

---

## Callback Payloads

| Payload | Description |
|---------|-------------|
| `consent_yes` | User accepted PD processing (152-ФЗ) |
| `consent_no` | User declined PD processing |
| `sex_male` / `sex_female` | Onboarding: gender selection |
| `goal_lose` / `goal_maintain` / `goal_gain` | Onboarding: goal selection |
| `activity_sedentary` ... `activity_very_active` | Onboarding: activity level |
| `action_food` | Request food photo analysis |
| `action_deep` | Start deep consultation |
| `action_lab` | Request lab photo |
| `action_water` | Log water glass |
| `action_qr` | Request QR photo scan |
| `action_today` | Show today's diary |
| `action_profile` | Show profile |
| `confirm_food` | Save last unconfirmed food log to diary |
| `cancel_food` | Discard last food log |
| `confirm_delete` | Confirm full data deletion |
| `cancel_delete` | Cancel data deletion |

---

## Subscription Tiers

| Tier | Photo analysis | Chat messages | Deep check | Lab analysis |
|------|---------------|---------------|------------|--------------|
| `free` | No | 10/day | No | No |
| `trial` | 3/day | Unlimited | Yes (30 days) | No |
| `premium` | 20/day | Unlimited | Yes (14-day interval) | Yes |

Trial and Premium activated by scanning QR code under Moonvit product caps.

---

## Data Models

### NutriUser (key fields)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Internal user ID |
| `max_user_id` | number | MAX platform user ID |
| `max_chat_id` | number | MAX chat ID |
| `name` | string | Display name |
| `sex` | `'male' \| 'female'` | |
| `age` | number | |
| `height_cm` | number | |
| `weight_kg` | number | |
| `activity_level` | string | sedentary/light/moderate/active/very_active |
| `goal` | `'lose' \| 'maintain' \| 'gain'` | |
| `daily_calories` | number | Calculated target |
| `daily_protein` | number | Grams |
| `daily_fat` | number | Grams |
| `daily_carbs` | number | Grams |
| `onboarding_completed` | boolean | |
| `onboarding_step` | number | 0–12 |
| `context_state` | string | idle/awaiting_qr/awaiting_lab/awaiting_deepcheck |
| `premium_until` | ISO date | null if not premium |
| `allergies` | string[] | |
| `chronic` | string[] | |
| `diet_pref` | string \| null | |

---

## Macro Calculation

BMR via Mifflin-St Jeor:
- Male: `10 × weight_kg + 6.25 × height_cm − 5 × age + 5`
- Female: `10 × weight_kg + 6.25 × height_cm − 5 × age − 161`

TDEE = BMR × activity multiplier (1.2 – 1.9)

Goal adjustment: lose −15%, gain +15%

Protein: `weight_kg × 1.6g` (maintain/lose) or `× 2.0g` (gain)
Fat: `calories × 25% / 9 kcal`
Carbs: remaining calories / 4 kcal

---

## QR Code Format

Valid Moonvit QR codes:
- `MV-{SKU}-{SERIAL}` — e.g., `MV-MENS-MULTI-ABC12345`
- URL with `?code=MV-...` parameter
- Short alphanumeric codes (<50 chars, `[A-Z0-9-]` only)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAX_BOT_TOKEN` | Yes | MAX Bot API token |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `WEBHOOK_URL` | Yes | Public webhook URL for bot registration |
| `ADMIN_PASSWORD` | Yes | Admin panel password |
| `FREE_TRIAL_DAYS` | No | Default: 30 |
