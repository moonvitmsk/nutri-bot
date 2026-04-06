import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { updateUser } from '../db/users.js';
import { saveFoodLog, deleteUnconfirmedLogs } from '../db/food-logs.js';
import { saveMessage } from '../db/messages.js';
import { canUseFeature, getPhotosRemaining, getSubscriptionStatus, needsPhoneSharing } from '../db/subscriptions.js';
import { analyzeFoodPhoto } from '../ai/vision.js';
import { confirmFood, mainMenu } from '../max/keyboard.js';
import { featureLocked, truncate } from '../utils/formatter.js';
import { sendContactRequest } from '../max/api.js';
import { trackError } from '../services/error-tracker.js';
import { getMsg } from '../config/bot-messages.js';

export async function handleFoodPhoto(user: NutriUser, chatId: number, imageUrl: string) {
  if (!canUseFeature(user, 'photo')) {
    // A-5 + A-6: If free limit exhausted, explain why + prompt phone sharing
    if (needsPhoneSharing(user)) {
      await sendMessage(chatId, await getMsg('msg_free_exhausted'));
      await sendContactRequest(chatId, await getMsg('msg_free_exhausted_button'));
      return;
    }
    await sendMessage(chatId, await featureLocked('photo_limit'));
    return;
  }

  // Fire-and-forget: don't block photo analysis if message delivery fails
  sendMessage(chatId, await getMsg('msg_analyzing_photo')).catch(() => {});

  try {
    const { analysis, tokens } = await analyzeFoodPhoto(imageUrl);

    const items = analysis.items.map((i: any) =>
      `- ${i.name} (~${i.portion_g}г): ${i.calories} ккал (Б${i.protein} Ж${i.fat} У${i.carbs})`
    ).join('\n');

    const total = analysis.total;
    const msg = [
      'Распознано:',
      items || '(не удалось распознать)',
      '',
      `Итого: ${total.calories} ккал | Б${total.protein} Ж${total.fat} У${total.carbs}`,
      analysis.comment ? `\n${analysis.comment}` : '',
      await getMsg('msg_weight_hint'),
    ].join('\n');

    // Micronutrients: use AI estimates (always available), enrich from DB if possible
    if (!analysis.micronutrients || Object.keys(analysis.micronutrients).length === 0) {
      // AI didn't return micronutrients — try DB lookup as fallback
      try {
        const { lookupNutrients } = await import('../services/vitamin-tracker.js');
        const foodItems = analysis.items.map((i: any) => ({ name: i.name, weight_grams: i.portion_g }));
        const micro = await lookupNutrients(foodItems);
        if (Object.keys(micro).length > 0) {
          (analysis as any).micronutrients = micro;
        }
      } catch { /* nutrient db not available, skip */ }
    }

    // Cancel any previous unconfirmed logs before saving new one
    await deleteUnconfirmedLogs(user.id);

    // Save unconfirmed log
    await saveFoodLog(user.id, {
      photo_url: imageUrl,
      description: analysis.items.map(i => i.name).join(', '),
      calories: total.calories,
      protein: total.protein,
      fat: total.fat,
      carbs: total.carbs,
      ai_analysis: analysis as any,
    });

    await saveMessage(user.id, 'assistant', msg, tokens);
    // Increment both daily counter and total freemium counter
    const updates: Record<string, any> = { photos_today: user.photos_today + 1 };
    const sub = getSubscriptionStatus(user);
    if (sub === 'free') {
      updates.free_analyses_used = ((user as any).free_analyses_used || 0) + 1;
    }
    await updateUser(user.id, updates);

    // Show remaining daily photo analyses
    let extra = '';
    const remaining = getPhotosRemaining({ ...user, photos_today: user.photos_today + 1 });
    if (remaining >= 0 && remaining <= 3) {
      extra = `\n\n_Осталось ${remaining} фото-анализов на сегодня_`;
    }
    await sendMessage(chatId, truncate(msg + extra), confirmFood());
  } catch (err) {
    await trackError('ai', `Food photo error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
    await sendMessage(chatId, await getMsg('msg_photo_error'), await mainMenu());
  }
}
