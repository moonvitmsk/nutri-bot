import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetDailyCounters } from '../src/db/users.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await resetDailyCounters();
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Reset cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
