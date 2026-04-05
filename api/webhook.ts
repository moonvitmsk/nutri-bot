import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeUpdate } from '../src/handlers/router.js';
import type { MaxUpdate } from '../src/max/types.js';
import { isRateLimited } from '../src/middleware/rate-limit.js';
import { isDuplicateUpdate } from '../src/middleware/idempotency.js';

// L-2: Webhook payload validation
function isValidUpdate(u: any): u is MaxUpdate {
  if (!u || typeof u !== 'object') return false;
  if (!['message_created', 'message_callback', 'bot_started'].includes(u.update_type)) return false;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', bot: 'NutriBot Moonvit' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const raw = req.body;
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    console.log('=== WEBHOOK RAW ===', JSON.stringify(raw).slice(0, 500));

    // MAX sends {"updates": [...], "marker": ...} wrapper
    const rawUpdates = raw?.updates || (raw?.update_type ? [raw] : []);

    if (!Array.isArray(rawUpdates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    const updates: MaxUpdate[] = rawUpdates.filter(isValidUpdate);

    if (!updates.length) {
      return res.status(200).json({ ok: true, note: 'no updates' });
    }

    console.log(`Processing ${updates.length} update(s)`);

    for (const update of updates) {
      try {
        // Idempotency: skip duplicate update_id
        const updateId = (update as any).update_id || (update as any).timestamp;
        if (updateId && isDuplicateUpdate(updateId)) {
          console.log('Duplicate update skipped:', updateId);
          continue;
        }

        // L-1: Rate limiting per user
        const userId = update.message?.sender?.user_id
          || update.callback?.user?.user_id
          || update.user?.user_id;
        if (userId && isRateLimited(userId)) {
          console.log('Rate limited:', userId);
          continue;
        }

        console.log('Event:', update.update_type, 'chat:', update.chat_id);
        await routeUpdate(update);
        console.log('Done:', update.update_type);
      } catch (err: any) {
        console.error('Handler error:', update.update_type, err?.message);
      }
    }

    return res.status(200).json({ ok: true, processed: updates.length });
  } catch (err: any) {
    console.error('WEBHOOK ERROR:', err?.message || err);
    return res.status(200).json({ ok: true, error: String(err?.message || err) });
  }
}
