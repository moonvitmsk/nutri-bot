// POST /api/miniapp-delete-food — delete a food log entry
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, validateAndGetUser } from './_shared/auth.js';
import { deleteFoodLog } from '../src/db/food-logs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await validateAndGetUser(req, res);
    if (!auth) return;

    const { logId } = req.body || {};
    if (!logId || typeof logId !== 'string') {
      return res.status(400).json({ error: 'logId required' });
    }

    await deleteFoodLog(logId, auth.user.id);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[miniapp-delete-food]', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
