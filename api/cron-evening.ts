import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../src/db/supabase.js';
import { sendDailySummary } from '../src/handlers/daily-summary.js';
import { sendMessage } from '../src/max/api.js';
import { getWeekLogs } from '../src/db/food-logs.js';

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

        // Water reminder if below norm
        const waterGlasses = u.water_glasses || 0;
        const waterNorm = u.water_norm || 8;
        if (waterGlasses < waterNorm) {
          const remaining = waterNorm - waterGlasses;
          const waterMsgs = [
            `💧 Сегодня ${waterGlasses}/${waterNorm} стаканов. Допей ещё ${remaining}!`,
            `💧 Не забудь про воду! Осталось ${remaining} стаканов до нормы.`,
            `💧 Водный баланс: ${waterGlasses}/${waterNorm}. Ещё ${remaining} — и норма!`,
          ];
          await sendMessage(chatId, waterMsgs[Math.floor(Math.random() * waterMsgs.length)]);
        }

        await sendDailySummary(u, chatId);

        // Gamification: 3+ confirmed meals today → promo code
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('nutri_food_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .eq('confirmed', true)
          .gte('created_at', today);

        if ((count || 0) >= 3) {
          // Check if user already got a promo today
          const { data: existing } = await supabase
            .from('nutri_promo_rewards')
            .select('id')
            .eq('user_id', u.id)
            .gte('created_at', today)
            .limit(1);

          if (!existing?.length) {
            const code = `MOONVIT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            await supabase.from('nutri_promo_rewards').insert({
              user_id: u.id,
              code,
              discount_pct: 10,
              source: 'gamification_3meals',
            });

            const promoMsg = `🎉 Ты молодец! ${count} приёмов пищи за сегодня!\n\n🎁 Вот твой промокод на скидку 10% на продукты Moonvit:\n\n🔑 ${code}\n\nПродолжай в том же духе!`;
            await sendMessage(chatId, promoMsg);
          }
        }

        // Weekly report on Sundays
        const dayOfWeek = new Date().getDay(); // 0 = Sunday
        if (dayOfWeek === 0) {
          try {
            const weekLogs = await getWeekLogs(u.id);
            if (weekLogs.length >= 3) {
              const totalCal = weekLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
              const avgCal = Math.round(totalCal / 7);
              const avgP = Math.round(weekLogs.reduce((s: number, l: any) => s + (l.protein || 0), 0) / 7);
              const avgF = Math.round(weekLogs.reduce((s: number, l: any) => s + (l.fat || 0), 0) / 7);
              const avgC = Math.round(weekLogs.reduce((s: number, l: any) => s + (l.carbs || 0), 0) / 7);
              const msg = `\u{1F4CA} Итоги недели:\n\n\u{1F4C5} ${weekLogs.length} записей за 7 дней\n\u{1F525} Средние ккал: ${avgCal}/день\nБ${avgP} Ж${avgF} У${avgC}\n\nОткрой мини-приложение для подробных графиков! \u{1F4F1}`;
              await sendMessage(chatId, msg);
            }
          } catch (err) {
            console.error('Weekly report error:', u.id, err);
          }
        }

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
