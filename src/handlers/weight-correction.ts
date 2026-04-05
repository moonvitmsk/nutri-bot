// Weight correction for food photo analysis
// User can reply with "300" (single item) or "1=300 2=150" (multiple items)

import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { getLastUnconfirmed, updateFoodLog } from '../db/food-logs.js';
import { confirmFood, mainMenu } from '../max/keyboard.js';
import { truncate } from '../utils/formatter.js';
import { getMsg } from '../config/bot-messages.js';

export async function handleWeightCorrection(user: NutriUser, text: string, chatId: number) {
  const log = await getLastUnconfirmed(user.id);
  if (!log || !log.ai_analysis) {
    await sendMessage(chatId, await getMsg('msg_weight_nothing'), await mainMenu());
    await setContextState(user.id, 'idle');
    return;
  }

  const analysis = log.ai_analysis as any;
  const items = analysis.items as any[];
  if (!items?.length) {
    await sendMessage(chatId, 'Нет блюд для редактирования.', await mainMenu());
    await setContextState(user.id, 'idle');
    return;
  }

  // Parse weight corrections
  const cleaned = text.replace(/г/gi, '').replace(/,/g, '.').trim();
  const corrections = new Map<number, number>();

  // Format: "1=300 2=150" or "300" (single item)
  const pairs = cleaned.split(/\s+/);
  if (pairs.length === 1 && /^\d+\.?\d*$/.test(pairs[0])) {
    // Single number — apply to first item (or all if single item)
    const weight = parseFloat(pairs[0]);
    if (weight > 0 && weight < 5000) {
      if (items.length === 1) {
        corrections.set(0, weight);
      } else {
        // If multiple items, apply to all proportionally? No, just item 1
        corrections.set(0, weight);
      }
    }
  } else {
    for (const pair of pairs) {
      const match = pair.match(/^(\d+)\s*=\s*(\d+\.?\d*)$/);
      if (match) {
        const idx = parseInt(match[1]) - 1; // 1-based → 0-based
        const weight = parseFloat(match[2]);
        if (idx >= 0 && idx < items.length && weight > 0 && weight < 5000) {
          corrections.set(idx, weight);
        }
      }
    }
  }

  if (corrections.size === 0) {
    await sendMessage(chatId, 'Не понял вес. Напиши число в граммах (например: 300) или с номерами (1=300 2=150)');
    return;
  }

  // Recalculate KBJU proportionally for corrected items
  let totalCal = 0, totalPro = 0, totalFat = 0, totalCarbs = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const newWeight = corrections.get(i);
    if (newWeight && item.portion_g > 0) {
      const ratio = newWeight / item.portion_g;
      item.portion_g = Math.round(newWeight);
      item.calories = Math.round(item.calories * ratio);
      item.protein = Math.round(item.protein * ratio * 10) / 10;
      item.fat = Math.round(item.fat * ratio * 10) / 10;
      item.carbs = Math.round(item.carbs * ratio * 10) / 10;
    }
    totalCal += item.calories;
    totalPro += item.protein;
    totalFat += item.fat;
    totalCarbs += item.carbs;
  }

  analysis.total = {
    calories: Math.round(totalCal),
    protein: Math.round(totalPro * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
  };

  // Update food log with corrected analysis
  await updateFoodLog(log.id, {
    calories: analysis.total.calories,
    protein: analysis.total.protein,
    fat: analysis.total.fat,
    carbs: analysis.total.carbs,
    ai_analysis: analysis,
  });

  await setContextState(user.id, 'idle');

  const itemLines = items.map((item: any) =>
    `- ${item.name} (~${item.portion_g}г): ${item.calories} ккал (Б${item.protein} Ж${item.fat} У${item.carbs})`
  ).join('\n');

  const msg = [
    'Вес обновлён:',
    itemLines,
    '',
    `Итого: ${analysis.total.calories} ккал | Б${analysis.total.protein} Ж${analysis.total.fat} У${analysis.total.carbs}`,
    '\nСохранить в дневник?',
  ].join('\n');

  await sendMessage(chatId, truncate(msg), confirmFood());
}
