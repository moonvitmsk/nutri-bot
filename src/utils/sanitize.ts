// Security: Input sanitization utilities

/**
 * Sanitize display names (from MAX API user profiles).
 * Removes HTML tags, control characters, limits length.
 */
export function sanitizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
    .trim()
    .substring(0, 100);
}

/**
 * Sanitize user text input (messages, allergy lists, promo codes).
 * Removes null bytes, limits length.
 */
export function sanitizeUserInput(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\0/g, '')  // Remove null bytes
    .substring(0, 5000);
}

/**
 * Sanitize callback data payload.
 * Only allows alphanumeric, underscore, hyphen, colon.
 */
export function sanitizeCallbackData(data: string): string {
  if (!data || typeof data !== 'string') return '';
  return data
    .replace(/[^a-zA-Z0-9_\-:]/g, '')
    .substring(0, 200);
}

/**
 * Sanitize phone number input.
 * Only allows digits and leading +.
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone
    .replace(/[^\d+]/g, '')
    .substring(0, 20);
}
