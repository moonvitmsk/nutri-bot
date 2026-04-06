import type { MaxUpdate, NutriUser } from '../max/types.js';
import { findUserByMaxId, createUser, updateUser, setContextState } from '../db/users.js';
import { sendMessage } from '../max/api.js';
import { trackError } from '../services/error-tracker.js';
import { trackEvent, trackCommand, trackFeature } from '../db/events.js';
import { getTrialDaysRemaining } from '../db/subscriptions.js';
import { sanitizeDisplayName, sanitizeUserInput, sanitizePhone } from '../utils/sanitize.js';
import { canUseFeature } from '../db/subscriptions.js';
import { subscriptionInfo } from '../max/keyboard.js';
import { featureLocked } from '../utils/formatter.js';
import { handleCommand } from './commands.js';
import { handleCallback } from './callbacks.js';
import { handleOnboardingStep, transitionAfterWow, handlePhoneFirst, handlePhoneContact, handleProfileEdit } from './onboarding.js';
import { handleFoodPhoto } from './food-photo.js';
import { handleLabPhoto } from './lab-results.js';
import { handleQrPhoto } from './qr-code.js';
import { handleRestaurantMenu } from './restaurant-menu.js';
import { handleWeightCorrection } from './weight-correction.js';
import { handleChat } from './chat.js';
import { detectIntent } from './intent-detector.js';
import { handleVoice } from './voice.js';
import { handleLabDocument } from './document.js';
import { mainMenu } from '../max/keyboard.js';
import { getMsg } from '../config/bot-messages.js';

export async function routeUpdate(update: MaxUpdate): Promise<void> {
  try {
    await _routeUpdate(update);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('ROUTE_ERROR:', msg, err instanceof Error ? err.stack : '');
    await trackError('webhook', `routeUpdate error: ${msg}`, {
      update_type: update.update_type,
      chat_id: update.chat_id,
    }).catch(() => {});
  }
}

async function _routeUpdate(update: MaxUpdate): Promise<void> {
  // bot_started — create user and start onboarding
  if (update.update_type === 'bot_started') {
    const maxUser = update.user;
    if (!maxUser) return;
    const chatId = update.chat_id || maxUser.user_id;
    const rawName = maxUser.name || [maxUser.first_name, maxUser.last_name].filter(Boolean).join(' ') || undefined;
    const userName = rawName ? sanitizeDisplayName(rawName) : undefined;
    let user = await findUserByMaxId(maxUser.user_id);
    if (!user) {
      user = await createUser(maxUser.user_id, chatId, userName);
    }
    trackEvent(user.id, 'bot_started', 'action');
    await handleCommand(user, '/start', chatId);
    return;
  }

  // message_callback — inline button press
  if (update.update_type === 'message_callback' && update.callback) {
    const cb = update.callback;
    let user = await findUserByMaxId(cb.user.user_id);
    if (!user) {
      user = await createUser(cb.user.user_id, update.chat_id || cb.user.user_id, cb.user.name ? sanitizeDisplayName(cb.user.name) : undefined);
    }
    trackEvent(user.id, `callback_${cb.payload}`, 'action', { payload: cb.payload });
    await handleCallback(user, cb);
    return;
  }

  // message_created — text or image
  if (update.update_type === 'message_created' && update.message) {
    const msg = update.message;
    const chatId = msg.recipient.chat_id;
    let user = await findUserByMaxId(msg.sender.user_id);
    if (!user) {
      user = await createUser(msg.sender.user_id, chatId, msg.sender.name ? sanitizeDisplayName(msg.sender.name) : undefined);
    }

    // Update last active + track message
    await updateUser(user.id, { last_active_at: new Date().toISOString() } as any);

    // Trial/premium expiry warning (once per threshold)
    const daysLeft = getTrialDaysRemaining(user);
    if (daysLeft !== null && [7, 3, 1, 0].includes(daysLeft)) {
      const warnKey = `trial_warn_${daysLeft}`;
      if (!(user as any)[warnKey]) {
        const warnings: Record<number, string> = {
          7: `Напоминание: твоя подписка истекает через 7 дней. Используй промо-код или QR-код moonvit для продления.`,
          3: `Осталось 3 дня подписки! После этого некоторые функции станут недоступны.`,
          1: `Последний день подписки! Завтра глубокая консультация и анализы крови будут недоступны. /subscribe`,
          0: `Подписка истекла. Базовые функции работают. Для полного доступа: /subscribe`,
        };
        if (warnings[daysLeft]) {
          await sendMessage(chatId, warnings[daysLeft]);
        }
      }
    }
    const hasPhoto = !!msg.body.attachments?.find(a => a.type === 'image');
    const hasAudio = !!msg.body.attachments?.find(a => a.type === 'audio');
    const hasFile = !!msg.body.attachments?.find(a => a.type === 'file');
    const hasContact = !!msg.body.attachments?.find(a => a.type === 'contact');
    const msgType = hasPhoto ? 'photo' : hasAudio ? 'voice' : hasFile ? 'file' : hasContact ? 'contact' : 'text';
    trackEvent(user.id, `msg_${msgType}`, 'action', { text_len: msg.body.text?.length || 0 });

    // Contact attachment? (phone sharing — onboarding or freemium upgrade)
    const contactAttachment = msg.body.attachments?.find(a => a.type === 'contact');
    if (contactAttachment) {
      const p = contactAttachment.payload || {} as any;
      const rawPhone = p.vcfPhone || p.tampiPhone || p.vcf_info?.phone
        || p.phone || p.tel || '';
      const rawExtracted = rawPhone || Object.values(p)
        .filter(v => typeof v === 'string')
        .find(v => /\+?\d{10,}/.test(v as string)) || '';
      const extracted = sanitizePhone(rawExtracted as string);

      // Onboarding step 0 — phone-first flow
      if (!user.onboarding_completed && user.onboarding_step === 0) {
        if (extracted) {
          await handlePhoneFirst(user, extracted, chatId);
        } else {
          const { sendContactRequest } = await import('../max/api.js');
          await sendContactRequest(chatId, await getMsg('onboarding_phone_retry'));
        }
        return;
      }

      // A-5: Phone sharing for freemium upgrade — activate trial
      if (user.onboarding_completed && extracted) {
        const { updateUser: uu } = await import('../db/users.js');
        const trialStart = new Date().toISOString();
        await uu(user.id, {
          phone: extracted,
          subscription_type: 'trial',
          trial_started_at: trialStart,
        } as any);
        await sendMessage(chatId, await getMsg('msg_trial_activated'), await mainMenu());
        return;
      }
    }

    // Audio attachment → Whisper transcription
    const audioAttachment = msg.body.attachments?.find(a => a.type === 'audio');
    if (audioAttachment) {
      const audioUrl = audioAttachment.payload?.url || '';
      if (audioUrl) {
        await handleVoice(user, chatId, audioUrl);
      }
      return;
    }

    // File attachment → lab analysis (images/PDF) or polite decline
    const fileAttachment = msg.body.attachments?.find(a => a.type === 'file');
    if (fileAttachment) {
      const fileUrl = fileAttachment.payload?.url || '';
      const fileName = ((fileAttachment.payload as any)?.filename || '').toLowerCase();
      if (fileUrl && /\.(jpg|jpeg|png|webp|gif|bmp)$/.test(fileName)) {
        // Image file → treat as photo (food or lab based on context)
        if (user.context_state === 'awaiting_lab') {
          await handleLabPhoto(user, chatId, fileUrl);
        } else {
          await handleFoodPhoto(user, chatId, fileUrl);
        }
      } else if (fileUrl && /\.pdf$/.test(fileName)) {
        if (!canUseFeature(user, 'lab')) {
          await sendMessage(chatId, await featureLocked('lab'), subscriptionInfo());
        } else {
          await handleLabDocument(user, chatId, fileUrl);
        }
      } else {
        await sendMessage(chatId, await getMsg('msg_file_unsupported'), await mainMenu());
      }
      return;
    }

    // Video attachment → polite message
    const videoAttachment = msg.body.attachments?.find(a => a.type === 'video');
    if (videoAttachment) {
      await sendMessage(chatId, await getMsg('msg_video_unsupported'), await mainMenu());
      return;
    }

    // Sticker → joke
    const stickerAttachment = msg.body.attachments?.find(a => a.type === 'sticker');
    if (stickerAttachment) {
      await sendMessage(chatId, await getMsg('msg_sticker_response'));
      return;
    }

    // Share → ignore gracefully
    const shareAttachment = msg.body.attachments?.find(a => a.type === 'share');
    if (shareAttachment) {
      await sendMessage(chatId, await getMsg('msg_share_response'));
      return;
    }

    // Image attachment?
    const imageAttachment = msg.body.attachments?.find(a => a.type === 'image');
    if (imageAttachment) {
      const imageUrl = imageAttachment.payload?.url
        || (imageAttachment.payload?.photos && Object.values(imageAttachment.payload.photos).pop()?.url)
        || '';

      if (!imageUrl) return;

      // Reset weight correction state — user sent new photo instead of text
      if (user.context_state === 'awaiting_weight_correction') {
        await setContextState(user.id, 'idle');
      }

      if (user.context_state === 'awaiting_qr') {
        await handleQrPhoto(user, chatId, imageUrl);
        return;
      }
      if (user.context_state === 'awaiting_lab') {
        await handleLabPhoto(user, chatId, imageUrl);
        return;
      }
      if (user.context_state === 'awaiting_restaurant_menu') {
        await handleRestaurantMenu(user, chatId, imageUrl);
        return;
      }
      // Recipe from photo of products (fridge, shelf, etc.)
      if (user.context_state === 'awaiting_recipe_photo') {
        await setContextState(user.id, 'idle');
        // Analyze what's in the photo, then suggest recipes from those products
        const { analyzeFoodPhoto } = await import('../ai/vision.js');
        const { analysis } = await analyzeFoodPhoto(imageUrl);
        const products = analysis.items.map((i: any) => i.name).join(', ');
        await sendMessage(chatId, `Вижу: ${products}\n\nПодбираю рецепты из этих продуктов...`);
        const { handleRecipes } = await import('../services/recipe-recommender.js');
        await handleRecipes(user, chatId, `У пользователя есть ТОЛЬКО эти продукты: ${products}. Используй ИСКЛЮЧИТЕЛЬНО эти продукты + соль/перец/масло/вода. ЗАПРЕЩЕНО добавлять любые другие продукты.`);
        return;
      }
      // Phone-first: if step 0, user must share phone before anything
      if (!user.onboarding_completed && user.onboarding_step === 0) {
        const { sendContactRequest } = await import('../max/api.js');
        await sendContactRequest(chatId, await getMsg('onboarding_phone_before_photo'));
        return;
      }

      // Default: food photo
      await handleFoodPhoto(user, chatId, imageUrl);
      return;
    }

    const rawText = msg.body.text?.trim() || '';
    if (!rawText) return;
    const text = sanitizeUserInput(rawText);

    // Command?
    if (text.startsWith('/')) {
      await handleCommand(user, text, chatId);
      return;
    }

    // Food text description (add food without photo)?
    if (user.context_state === 'awaiting_food_text') {
      await setContextState(user.id, 'idle');
      const { handleFoodText } = await import('./food-text.js');
      await handleFoodText(user, chatId, text);
      return;
    }

    // Custom meal plan request?
    if (user.context_state === 'awaiting_mealplan_request') {
      await setContextState(user.id, 'idle');
      const { handleMealPlan } = await import('./meal-plan.js');
      await handleMealPlan(user, chatId, text);
      return;
    }

    // Custom deepcheck request?
    if (user.context_state === 'awaiting_deepcheck_request') {
      await setContextState(user.id, 'idle');
      const { handleDeepConsultCustom } = await import('./deep-consult.js');
      await handleDeepConsultCustom(user, chatId, text);
      return;
    }

    // Custom recipe request?
    if (user.context_state === 'awaiting_recipe_request') {
      await setContextState(user.id, 'idle');
      const { handleRecipesCustom } = await import('../services/recipe-recommender.js');
      await handleRecipesCustom(user, chatId, text);
      return;
    }

    // Weight correction for food photo?
    if (user.context_state === 'awaiting_weight_correction') {
      await handleWeightCorrection(user, text, chatId);
      return;
    }

    // Profile editing in progress?
    if (user.context_state?.startsWith('editing_')) {
      await handleProfileEdit(user, text, chatId);
      return;
    }

    // Onboarding in progress?
    if (!user.onboarding_completed) {
      await handleOnboardingStep(user, text, chatId);
      return;
    }

    // Try intent detection before falling through to AI chat
    const intent = detectIntent(text);
    if (intent) {
      switch (intent) {
        case 'food_photo':
          if (!canUseFeature(user, 'photo')) {
            await sendMessage(chatId, await featureLocked('photo'), subscriptionInfo());
            return;
          }
          await sendMessage(chatId, await getMsg('msg_intent_food'));
          return;
        case 'vitamins':
          await handleCommand(user, '/vitamins', chatId);
          return;
        case 'today':
          await handleCommand(user, '/today', chatId);
          return;
        case 'week':
          await handleCommand(user, '/week', chatId);
          return;
        case 'deepcheck':
          await handleCommand(user, '/deepcheck', chatId);
          return;
        case 'lab':
          await handleCommand(user, '/lab', chatId);
          return;
        case 'water':
          await handleCommand(user, '/water', chatId);
          return;
        case 'qr':
          await sendMessage(chatId, await getMsg('msg_send_qr_photo'));
          await setContextState(user.id, 'awaiting_qr');
          return;
        case 'editprofile':
          await handleCommand(user, '/editprofile', chatId);
          return;
        case 'profile':
          await handleCommand(user, '/profile', chatId);
          return;
        case 'subscribe':
          await handleCommand(user, '/subscribe', chatId);
          return;
        case 'help':
          await handleCommand(user, '/help', chatId);
          return;
        case 'deletedata':
          await handleCommand(user, '/deletedata', chatId);
          return;
        case 'start':
          await handleCommand(user, '/start', chatId);
          return;
      }
    }

    // No intent matched -- general AI chat
    await handleChat(user, text, chatId);
  }
}
