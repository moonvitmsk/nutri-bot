// MAX Web App initData validation
// Docs: https://dev.max.ru/docs/webapps/validation
// Algorithm: HMAC-SHA256 двухступенчатая проверка

import crypto from 'crypto';

export interface ValidatedUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface ValidationResult {
  valid: boolean;
  user?: ValidatedUser;
  authDate?: number;
}

/**
 * Validate initData from MAX Web App Bridge.
 *
 * Steps (per MAX docs):
 * 1. Parse key=value pairs from initData
 * 2. Extract and remove `hash`
 * 3. URL-decode all values
 * 4. Sort alphabetically by key
 * 5. Join as key=value with \n separator
 * 6. secret_key = HMAC-SHA256(key="WebAppData", message=botToken)
 * 7. signature = HMAC-SHA256(key=secret_key, message=dataCheckString)
 * 8. Compare hex(signature) with hash
 */
export function validateInitData(initData: string, botToken: string): ValidationResult {
  if (!initData || !botToken) return { valid: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    // Remove hash from params for check string
    params.delete('hash');

    // Sort remaining params alphabetically, join with \n
    // URLSearchParams already URL-decodes values
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Step 1: secret_key = HMAC-SHA256(key="WebAppData", message=botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Step 2: signature = HMAC-SHA256(key=secretKey, message=dataCheckString)
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (signature !== hash) {
      return { valid: false };
    }

    // Parse user object
    const userStr = params.get('user');
    let user: ValidatedUser | undefined;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        // user value might still be encoded
        try { user = JSON.parse(decodeURIComponent(userStr)); } catch { /* skip */ }
      }
    }

    const authDate = params.has('auth_date')
      ? parseInt(params.get('auth_date')!, 10)
      : undefined;

    return { valid: true, user, authDate };
  } catch (err) {
    console.error('[miniapp-validate] Error:', err);
    return { valid: false };
  }
}
