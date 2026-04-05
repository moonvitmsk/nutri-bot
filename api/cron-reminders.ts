import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const maxToken = process.env.MAX_BOT_TOKEN!;
const supabase = createClient(supabaseUrl, supabaseKey);

function sendMaxMessage(chatId: number, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ text });
    const opts = {
      hostname: 'platform-api.max.ru',
      path: `/messages?chat_id=${chatId}`,
      method: 'POST',
      headers: {
        'Authorization': maxToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Cron: runs every day at 09:00 and 21:00 Moscow (UTC+3 → 06:00 and 18:00 UTC)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (Vercel or pg_cron)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hour = new Date().getUTCHours();
  const isMorning = hour >= 5 && hour <= 8; // 08:00-11:00 MSK
  const isEvening = hour >= 17 && hour <= 20; // 20:00-23:00 MSK

  // Get active users (onboarding completed, active in last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: users } = await supabase
    .from('nutri_users')
    .select('max_chat_id, name, daily_calories, streak_days, weight_kg, goal')
    .eq('onboarding_completed', true)
    .gte('last_active_at', weekAgo)
    .limit(100);

  // Day of week for personalization
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
  const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  if (!users?.length) {
    return res.status(200).json({ ok: true, sent: 0, reason: 'no active users' });
  }

  let sent = 0;

  for (const user of users) {
    try {
      const name = user.name || 'друг';

      if (isMorning) {
        const streak = user.streak_days || 0;
        const goal = user.goal === 'lose' ? 'похудения' : user.goal === 'gain' ? 'набора' : 'здоровья';

        // Personalized by day of week + streak
        let morningMsg: string;
        if (dayOfWeek === 1) {
          morningMsg = `Доброе утро, ${name}! Понедельник — отличный старт недели для ${goal}. Сфоткай завтрак!`;
        } else if (dayOfWeek === 5) {
          morningMsg = `${name}, пятница! Впереди выходные — не забывай про рацион. Покажи завтрак!`;
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          morningMsg = `${name}, выходной — не повод забивать на питание. Отправь фото завтрака!`;
        } else if (streak >= 7) {
          morningMsg = `${name}, ${streak} дней подряд! Не ломай страйк — сфоткай завтрак!`;
        } else if (streak >= 3) {
          morningMsg = `Доброе утро, ${name}! Страйк ${streak} дней — продолжай! Покажи завтрак.`;
        } else {
          const morningMessages = [
            `Доброе утро, ${name}! Твоя норма ${user.daily_calories || '~2000'} ккал. Покажи завтрак!`,
            `Утро, ${name}! Новый день для ${goal}. Сфотографируй завтрак!`,
            `${name}, подъём! Отправь фото завтрака — начнём день правильно.`,
          ];
          morningMsg = morningMessages[Math.floor(Math.random() * morningMessages.length)];
        }
        await sendMaxMessage(user.max_chat_id, morningMsg);
        sent++;
      }

      if (isEvening) {
        // Get today's food log count
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase
          .from('nutri_food_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.max_chat_id)
          .gte('created_at', today);

        const meals = count || 0;
        const eveningMessages = [
          `${name}, итог дня: ${meals} приёмов пищи отслежено. ${meals === 0 ? 'Завтра будет лучше!' : 'Молодец!'}`,
          `Вечер, ${name}! Ты отслежил ${meals} приёмов пищи сегодня. Не забудь про воду!`,
          `${name}, день почти закончился. ${meals > 0 ? `${meals} фото еды — отличный контроль!` : 'Завтра сфоткай хотя бы завтрак!'}`,
        ];
        const msg = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
        await sendMaxMessage(user.max_chat_id, msg);
        sent++;
      }

      // Rate limit: 100ms between messages
      await new Promise(r => setTimeout(r, 100));
    } catch (err: any) {
      console.error(`Reminder failed for ${user.max_chat_id}:`, err?.message);
    }
  }

  return res.status(200).json({ ok: true, sent, type: isMorning ? 'morning' : 'evening' });
}
