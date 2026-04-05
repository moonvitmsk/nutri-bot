# Security Audit — NutriBot Moonvit

**Date**: 2026-04-02
**Auditor**: Automated (scheduled task)
**Scope**: `src/handlers/`, `src/utils/`, `api/webhook.ts`

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Secrets management | PASS | All secrets via env vars, no hardcoded keys |
| Input validation (onboarding) | PASS | Age/height/weight bounds enforced |
| Phone sanitization | PASS | Strips non-digit chars before saving |
| QR code extraction | PASS | Regex whitelist, no arbitrary text passed to DB |
| Image URL usage | PARTIAL | URLs passed to OpenAI Vision — not validated as URLs |
| Webhook auth | MISSING | No signature verification on incoming MAX webhooks |
| Admin password | WARNING | Default `moonvit2026` hardcoded in config.ts as fallback |
| SQL injection | PASS | All DB via Supabase client (parameterized) |
| XSS | N/A | Bot is text-only, no HTML rendering |
| Rate limiting | PARTIAL | `userRatePerMinute: 30` defined but no middleware enforcing it |
| PII handling | PASS | Consent text shown, `/deletedata` command implemented |
| Error messages | PASS | Internal errors logged, generic messages to users |

---

## Findings

### 1. Missing Webhook Signature Verification (HIGH)

**File**: `api/webhook.ts`

The webhook endpoint accepts any POST request without verifying the `X-MAX-Signature` header. An attacker could forge bot updates.

**Recommendation**: Verify HMAC-SHA256 signature using `MAX_BOT_TOKEN` before processing:

```typescript
import { createHmac } from 'crypto';

function verifySignature(body: string, signature: string, token: string): boolean {
  const expected = createHmac('sha256', token).update(body).digest('hex');
  return signature === expected;
}
```

---

### 2. Default Admin Password in Source (MEDIUM)

**File**: `src/config.ts:16`

```typescript
adminPassword: process.env.ADMIN_PASSWORD || 'moonvit2026',
```

The fallback `'moonvit2026'` is committed to source. If `ADMIN_PASSWORD` env var is not set in production, the default is active.

**Recommendation**: Remove the fallback; throw if env var is missing in production:

```typescript
adminPassword: process.env.ADMIN_PASSWORD ?? (() => { throw new Error('ADMIN_PASSWORD required'); })(),
```

---

### 3. Image URL Not Validated Before External Call (LOW)

**Files**: `src/handlers/food-photo.ts`, `src/handlers/lab-results.ts`, `src/handlers/qr-code.ts`

`imageUrl` is taken from MAX attachment payload and passed directly to `analyzeFoodPhoto(imageUrl)` / `downloadImage(imageUrl)` without validating it is a legitimate HTTPS URL.

**Recommendation**: Validate URL before use:

```typescript
function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch { return false; }
}
```

---

### 4. Rate Limiting Not Enforced in Webhook (LOW)

**File**: `api/webhook.ts`, `src/config.ts:26`

`userRatePerMinute: 30` is defined but there is no actual rate-limiting middleware checking requests per user per minute in the webhook handler.

**Recommendation**: Implement in-memory or Redis-backed rate limiter keyed on `user_id`.

---

### 5. Allergies and Diet Fields Not Sanitized (LOW)

**File**: `src/handlers/onboarding.ts:94`

```typescript
updates.allergies = text.toLowerCase() === 'нет' ? [] : text.split(',').map(s => s.trim());
```

User input is split and stored as-is. Values are later displayed back in profile messages. If the admin panel renders these without escaping, it may be a concern.

**Recommendation**: Truncate each item to a reasonable max length (e.g., 100 chars).

---

### 6. Chat Text Passed Directly to LLM (INFO)

**File**: `src/handlers/chat.ts:19`

User `text` is saved and included in LLM messages history. No prompt injection filtering is applied. This is generally acceptable for a conversational bot but consider:

- System prompt clearly defines bot role (reviewed: yes, in `src/ai/prompts.ts`)
- Token limits enforced via `contextMessages: 10` and summarization

---

## Positive Findings

- All Supabase queries use the SDK client (parameterized, no raw SQL from user input)
- Phone number cleaned with `replace(/[^+\d]/g, '')` before storage
- Age validated `10–120`, height `100–250`, weight `30–300`
- QR code extraction uses strict regex whitelist (`/^[A-Z0-9-]+$/i`)
- `/deletedata` command with confirmation dialog (GDPR/152-ФЗ compliant)
- Consent screen shown before data collection (152-ФЗ)
- No credentials in source files (all via env vars)
- Secrets not logged (webhook logs only first 500 chars, no token visible)

---

## Action Items

| Priority | Item | File |
|----------|------|------|
| HIGH | Add MAX webhook signature verification | `api/webhook.ts` |
| MEDIUM | Remove default admin password fallback | `src/config.ts` |
| LOW | Validate image URLs before external calls | `handlers/food-photo.ts`, `handlers/lab-results.ts`, `handlers/qr-code.ts` |
| LOW | Implement rate limiter middleware | `api/webhook.ts` |
| LOW | Truncate allergy/diet_pref input strings | `handlers/onboarding.ts` |
