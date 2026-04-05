// Restaurant menu photo analysis — estimate calories for each dish on the menu
import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { saveMessage } from '../db/messages.js';
import { analyzeRestaurantMenu } from '../ai/vision.js';
import { mainMenu } from '../max/keyboard.js';
import { truncate, splitMessage } from '../utils/formatter.js';
import { trackError } from '../services/error-tracker.js';
import { getMsg } from '../config/bot-messages.js';

export async function handleRestaurantMenu(user: NutriUser, chatId: number, imageUrl: string) {
  await sendMessage(chatId, await getMsg('msg_analyzing_menu'));
  await setContextState(user.id, 'idle');

  try {
    const { analysis, tokens } = await analyzeRestaurantMenu(imageUrl);

    if (analysis.not_menu) {
      await sendMessage(chatId, analysis.comment || 'Это не похоже на меню ресторана. Сфотографируй страницу меню.', await mainMenu());
      return;
    }

    const lines: string[] = ['Блюда из меню:'];
    for (const dish of analysis.dishes) {
      const weight = dish.weight_g ? `${dish.weight_g}г` : '~порция';
      const price = dish.price ? ` | ${dish.price}₽` : '';
      lines.push(`\n${dish.name} (${weight}${price})`);
      lines.push(`  ${dish.calories} ккал | Б${dish.protein} Ж${dish.fat} У${dish.carbs}`);
      if (dish.note) lines.push(`  _${dish.note}_`);
    }

    if (analysis.tip) {
      lines.push('', analysis.tip);
    }

    lines.push('', 'Сфотографируй свою порцию — запишу в дневник!');

    const msg = lines.join('\n');
    await saveMessage(user.id, 'assistant', msg, tokens);

    const parts = splitMessage(msg);
    for (const part of parts) {
      await sendMessage(chatId, truncate(part), await mainMenu());
    }
  } catch (err) {
    await trackError('ai', `Restaurant menu error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
    await sendMessage(chatId, 'Не удалось разобрать меню. Попробуй сфотографировать ближе и чётче.', await mainMenu());
  }
}
