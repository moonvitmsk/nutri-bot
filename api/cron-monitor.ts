import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../src/db/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const alerts: string[] = [];
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000).toISOString();

  // Check 1: Error rate last hour
  try {
    const { count } = await supabase
      .from('nutri_error_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hourAgo);

    if ((count ?? 0) > 50) {
      alerts.push(`High error rate: ${count} errors in last hour (threshold: 50)`);
    }
  } catch (err) {
    alerts.push(`Failed to check error rate: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Check 2: Last message freshness (ignore nighttime 23:00-07:00 MSK = 20:00-04:00 UTC)
  const utcHour = now.getUTCHours();
  const isNightMSK = utcHour >= 20 || utcHour < 4;

  if (!isNightMSK) {
    try {
      const twoHoursAgo = new Date(now.getTime() - 2 * 3600000).toISOString();
      const { count } = await supabase
        .from('nutri_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoHoursAgo)
        .eq('role', 'user');

      if ((count ?? 0) === 0) {
        alerts.push('No user messages in last 2 hours (bot may be down)');
      }
    } catch (err) {
      alerts.push(`Failed to check message freshness: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Check 3: Supabase connectivity
  try {
    const { error } = await supabase.from('nutri_settings').select('key').limit(1);
    if (error) {
      alerts.push(`Supabase error: ${error.message}`);
    }
  } catch (err) {
    alerts.push(`Supabase unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Log alerts
  if (alerts.length > 0) {
    for (const alert of alerts) {
      await supabase.from('nutri_error_log').insert({
        error_type: 'monitor',
        message: alert,
        context: { check_time: now.toISOString() },
      });
    }
  }

  return res.status(200).json({
    ok: true,
    alerts_count: alerts.length,
    alerts,
    checked_at: now.toISOString(),
  });
}
