// Add food by text description — AI analyzes macros without photo
import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { saveFoodLog, deleteUnconfirmedLogs } from '../db/food-logs.js';
import { saveMessage } from '../db/messages.js';
import { chatCompletion } from '../ai/client.js';
import { confirmFood, mainMenu } from '../max/keyboard.js';
import { truncate } from '../utils/formatter.js';
import { trackError } from '../services/error-tracker.js';
import { getMsg } from '../config/bot-messages.js';

const FOOD_TEXT_PROMPT = `Ты — AI-нутрициолог. Пользователь описал текстом, что он ел. Оцени КБЖУ + микронутриенты.
Верни СТРОГО JSON (без markdown):
{
  "items": [{"name": "название", "portion_g": число, "calories": число, "protein": число, "fat": число, "carbs": число, "fiber": число}],
  "total": {"calories": число, "protein": число, "fat": число, "carbs": число, "fiber": число},
  "micronutrients": {
    "vitamin_a": мкг, "vitamin_c": мг, "vitamin_d": мкг, "vitamin_e": мг,
    "vitamin_b1": мг, "vitamin_b2": мг, "vitamin_b6": мг, "vitamin_b12": мкг,
    "iron": мг, "calcium": мг, "magnesium": мг, "zinc": мг,
    "potassium": мг, "sodium": мг, "phosphorus": мг, "selenium": мкг,
    "folate": мкг, "omega3": г
  },
  "comment": "краткий комментарий"
}
Если описание неясное — додумай типичную порцию. Оцени все микронутриенты приблизительно. Всегда возвращай JSON.`;

export async function handleFoodText(user: NutriUser, chatId: number, text: string) {
  // Fire-and-forget: don't block food analysis if message delivery fails
  sendMessage(chatId, 'Считаю КБЖУ по описанию...').catch(() => {});

  try {
    const { text: aiResponse, tokens } = await chatCompletion([
      { role: 'system', content: FOOD_TEXT_PROMPT },
      { role: 'user', content: text },
    ], 'gpt-4.1-mini');

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const analysis = JSON.parse(jsonMatch[0]);
    const total = analysis.total;

    const items = analysis.items.map((i: any) =>
      `- ${i.name} (~${i.portion_g}г): ${i.calories} ккал (Б${i.protein} Ж${i.fat} У${i.carbs})`
    ).join('\n');

    const msg = [
      'По описанию:',
      items || '(не удалось распознать)',
      '',
      `Итого: ${total.calories} ккал | Б${total.protein} Ж${total.fat} У${total.carbs}`,
      analysis.comment ? `\n${analysis.comment}` : '',
      await getMsg('msg_weight_hint'),
    ].join('\n');

    await deleteUnconfirmedLogs(user.id);

    await saveFoodLog(user.id, {
      description: text.slice(0, 500),
      calories: total.calories,
      protein: total.protein,
      fat: total.fat,
      carbs: total.carbs,
      ai_analysis: analysis as any,
    });

    await saveMessage(user.id, 'assistant', msg, tokens);
    await sendMessage(chatId, truncate(msg), confirmFood());
  } catch (err) {
    await trackError('ai', `Food text error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
    await sendMessage(chatId, 'Не удалось оценить КБЖУ. Попробуй описать подробнее или отправь фото.', await mainMenu());
  }
}
