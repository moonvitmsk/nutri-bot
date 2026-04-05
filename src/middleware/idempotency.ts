// Webhook idempotency: prevent duplicate processing of the same update_id

const processedUpdates = new Map<string, number>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns true if this update_id was already processed (duplicate).
 * Returns false if it's a new update_id (first time seen).
 */
export function isDuplicateUpdate(updateId: string | number): boolean {
  const key = String(updateId);
  const now = Date.now();

  if (processedUpdates.has(key)) {
    return true;
  }

  processedUpdates.set(key, now);
  return false;
}

/**
 * Clean up expired entries from the cache.
 */
export function cleanupIdempotencyCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of processedUpdates) {
    if (now - timestamp > TTL_MS) {
      processedUpdates.delete(key);
    }
  }
}

// Auto-cleanup every 2 minutes
setInterval(cleanupIdempotencyCache, 2 * 60 * 1000);

// Export for testing
export function _getCacheSize(): number {
  return processedUpdates.size;
}

export function _clearCache(): void {
  processedUpdates.clear();
}
