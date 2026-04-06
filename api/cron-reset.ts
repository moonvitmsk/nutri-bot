import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetDailyCounters } from '../src/db/users.js';
import { cleanupOrphanedLogs } from '../src/db/food-logs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await resetDailyCounters();
    const orphanedCount = await cleanupOrphanedLogs();
    return res.status(200).json({ ok: true, orphaned_cleaned: orphanedCount });
  } catch (err: any) {
    console.error('Reset cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
