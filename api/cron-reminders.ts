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

const WATER_MESSAGES = [
  '💧 Не забудь выпить стакан воды! Гидратация = энергия.',
  '💧 Время водички! Твоё тело скажет спасибо.',
  '💧 Напоминание: попей воды. Даже если не хочется — организму нужно.',
  '💧 Вода-вода! Выпей стакан прямо сейчас.',
  '💧 Гидратация — ключ к хорошему самочувствию. Пей воду!',
];

// Cron: runs at 06:00, 09:00, 12:00, 15:00, 18:00 UTC
// MSK = UTC+3, so: 09:00, 12:00, 15:00, 18:00, 21:00 MSK
// hour 6 (09 MSK) → morning food reminder
// hour 9,12,15 (12,15,18 MSK) → water reminder
// hour 18 (21 MSK) → evening food reminder
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (Vercel or pg_cron)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hour = new Date().getUTCHours();
  const isMorning = hour >= 5 && hour <= 8; // 08:00-11:00 MSK
  const isEvening = hour >= 17 && hour <= 20; // 20:00-23:00 MSK
  const isWaterTime = hour === 9 || hour === 12 || hour === 15; // 12:00, 15:00, 18:00 MSK

  if (isWaterTime) {
    return handleWaterReminder(res);
  }

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

async function handleWaterReminder(res: VercelResponse) {
  try {
    const { data: users } = await supabase
      .from('nutri_users')
      .select('id, max_chat_id, max_user_id, water_glasses, water_norm, name')
      .eq('onboarding_completed', true)
      .not('max_chat_id', 'is', null);

    if (!users?.length) return res.status(200).json({ ok: true, sent: 0, type: 'water' });

    let sent = 0;
    for (const u of users) {
      try {
        // Skip if already at or above water norm
        if ((u.water_glasses || 0) >= (u.water_norm || 8)) continue;

        const remaining = (u.water_norm || 8) - (u.water_glasses || 0);
        const chatId = u.max_chat_id || u.max_user_id;
        const msg = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];
        const personalMsg = `${msg}\n\n${u.water_glasses || 0}/${u.water_norm || 8} стаканов. Осталось ${remaining}.`;

        await sendMaxMessage(chatId, personalMsg);
        sent++;

        // Rate limit: 100ms between messages
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error('Water reminder error for user:', u.id, err);
      }
    }

    return res.status(200).json({ ok: true, sent, type: 'water' });
  } catch (err: any) {
    console.error('Water cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
