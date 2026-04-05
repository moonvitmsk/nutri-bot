// L-1: Simple in-memory rate limiter for Vercel serverless
// Note: per-instance only (resets on cold start), sufficient for Hobby tier

const hitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 30; // 30 requests per minute per user

export function isRateLimited(userId: string | number): boolean {
  const key = String(userId);
  const now = Date.now();
  const entry = hitMap.get(key);

  if (!entry || now > entry.resetAt) {
    hitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_HITS) return true;
  return false;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hitMap) {
    if (now > v.resetAt) hitMap.delete(k);
  }
}, 300_000);
