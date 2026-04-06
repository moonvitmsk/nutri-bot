// C-5: Вечерний итог дня — КБЖУ + витамины с индикаторами (text only)
import type { NutriUser } from '../max/types.js';
import { sendMessage, sendMessageWithImage } from '../max/api.js';
import { mainMenu } from '../max/keyboard.js';
import { getTodayLogs } from '../db/food-logs.js';
import { formatDaySummary } from '../utils/nutrition.js';
import { getTodayNutrients, formatVitaminSummary } from '../services/vitamin-tracker.js';
import { vitaminDisclaimer } from '../utils/formatter.js';

export async function sendDailySummary(user: NutriUser, chatId: number): Promise<void> {
  const logs = await getTodayLogs(user.id);

  if (!logs.length) {
    await sendMessage(chatId, `${user.name || 'Друг'}, сегодня ни одной записи. Не забывай фоткать еду — я всё посчитаю!`);
    return;
  }

  const target = {
    calories: user.daily_calories || 2000,
    protein: user.daily_protein || 100,
    fat: user.daily_fat || 70,
    carbs: user.daily_carbs || 250,
  };

  // Sum actual intake
  let cal = 0, pro = 0, fa = 0, ca = 0;
  for (const l of logs) {
    cal += l.calories || 0;
    pro += l.protein || 0;
    fa += l.fat || 0;
    ca += l.carbs || 0;
  }

  // GIF report disabled — text only
  const imageToken: string | null = null;

  const macroSummary = formatDaySummary(logs, target);
  const nutrients = await getTodayNutrients(user.id);
  const hasNutrients = Object.keys(nutrients).length > 0;

  const parts = [
    `Итоги дня, ${user.name || 'друг'}:`,
    '',
    macroSummary,
  ];

  if (hasNutrients) {
    parts.push('');
    parts.push(formatVitaminSummary(nutrients, user.sex));
    parts.push(vitaminDisclaimer());
  }

  parts.push('');
  parts.push('Спокойной ночи!');

  const menu = await mainMenu();
  const text = parts.join('\n');

  if (imageToken) {
    await sendMessageWithImage(chatId, text, imageToken, menu);
  } else {
    await sendMessage(chatId, text, menu);
  }
}
