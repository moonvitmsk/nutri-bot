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
  const atLimit = !canUseFeature(user, 'photo');

  if (atLimit) {
    // P0 fix: still analyze the photo so user sees the result, but don't save to diary
    sendMessage(chatId, 'Анализирую фото... (лимит исчерпан — результат будет показан, но не сохранён)').catch(() => {});
    try {
      const { analysis } = await analyzeFoodPhoto(imageUrl);
      const items = analysis.items.map((i: any) =>
        `- ${i.name} (~${i.portion_g}г): ${i.calories} ккал (Б${i.protein} Ж${i.fat} У${i.carbs})`
      ).join('\n');
      const total = analysis.total;
      const previewMsg = [
        'Распознано:',
        items || '(не удалось распознать)',
        '',
        `Итого: ${total.calories} ккал | Б${total.protein} Ж${total.fat} У${total.carbs}`,
        '',
        '⚠️ Лимит фото-анализов исчерпан — запись не сохранена.',
        needsPhoneSharing(user)
          ? 'Поделись номером телефона → 30 дней без лимитов!'
          : 'Используй /addfood для добавления текстом или продли подписку: /subscribe',
      ].join('\n');
      if (needsPhoneSharing(user)) {
        await sendMessage(chatId, previewMsg);
        await sendContactRequest(chatId, await getMsg('msg_free_exhausted_button'));
      } else {
        await sendMessage(chatId, previewMsg, await mainMenu());
      }
    } catch {
      await sendMessage(chatId, await featureLocked('photo_limit'));
    }
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

    // Show remaining daily photo analyses + feature discovery hints
    let extra = '';
    const remaining = getPhotosRemaining({ ...user, photos_today: user.photos_today + 1 });
    if (remaining >= 0 && remaining <= 3) {
      extra = `\n\n_Осталось ${remaining} фото-анализов на сегодня_`;
    }
    // P1: Feature discovery hints — one per milestone, not every photo (v1.1.2 fix: hint overload)
    const photoCount = user.photos_today + 1;
    const totalPhotos = ((user as any).free_analyses_used || 0) + photoCount;
    if (photoCount === 3 && totalPhotos <= 5) {
      extra += '\n\n_Совет: попробуй /vitamins — посмотри какие витамины ты уже набрал сегодня!_';
    } else if (photoCount === 5 && totalPhotos <= 10) {
      extra += '\n\n_Совет: /recipes — подберу рецепты под твои дефициты и аллергии!_';
    } else if (photoCount === 8 && totalPhotos <= 15) {
      extra += '\n\n_Открой мини-приложение (/app) — там графики, бейджи и челленджи!_';
    }
    await sendMessage(chatId, truncate(msg + extra), confirmFood());
  } catch (err) {
    await trackError('ai', `Food photo error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
    await sendMessage(chatId, await getMsg('msg_photo_error'), await mainMenu());
  }
}
