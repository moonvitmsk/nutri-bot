import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../src/db/supabase.js';
import { sendDailySummary } from '../src/handlers/daily-summary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Only send to users who have reminders enabled
    const { data: users } = await supabase
      .from('nutri_users')
      .select('*, nutri_user_preferences!left(evening_reminder)')
      .eq('onboarding_completed', true)
      .not('max_chat_id', 'is', null);

    if (!users?.length) return res.status(200).json({ ok: true, sent: 0 });

    let sent = 0;
    for (const u of users) {
      try {
        // Skip if user explicitly disabled evening reminders
        const prefs = (u as any).nutri_user_preferences;
        if (prefs && prefs.evening_reminder === false) continue;

        const chatId = u.max_chat_id || u.max_user_id;
        await sendDailySummary(u, chatId);
        sent++;
      } catch (err) {
        console.error('Evening reminder error for user:', u.id, err);
      }
    }

    return res.status(200).json({ ok: true, sent });
  } catch (err: any) {
    console.error('Evening cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
