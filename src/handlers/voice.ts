import type { NutriUser } from '../max/types.js';
import { openai } from '../ai/client.js';
import { sendMessage, downloadFile } from '../max/api.js';
import { saveMessage } from '../db/messages.js';
import { getSetting } from '../db/settings.js';
import { handleChat } from './chat.js';
import { handleCommand } from './commands.js';
import { detectIntent } from './intent-detector.js';
import { handleOnboardingStep } from './onboarding.js';
import { canUseFeature } from '../db/subscriptions.js';
import { subscriptionInfo } from '../max/keyboard.js';
import { featureLocked } from '../utils/formatter.js';
import { setContextState } from '../db/users.js';
import { getMsg } from '../config/bot-messages.js';
import { toFile } from 'openai';

export async function handleVoice(user: NutriUser, chatId: number, audioUrl: string): Promise<void> {
  try {
    const audioBuffer = await downloadFile(audioUrl);
    const model = await getSetting('ai_model_transcription') || 'whisper-1';

    const transcription = await openai.audio.transcriptions.create({
      model,
      file: await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' }),
      language: 'ru',
    });

    const text = transcription.text?.trim();
    if (!text) {
      await sendMessage(chatId, 'Не удалось разобрать голосовое сообщение. Попробуй ещё раз или напиши текстом.');
      return;
    }

    await saveMessage(user.id, 'user', `[голосовое] ${text}`, 0);

    // Onboarding in progress — pass transcribed text
    if (!user.onboarding_completed) {
      await handleOnboardingStep(user, text, chatId);
      return;
    }

    // Command?
    if (text.startsWith('/')) {
      await handleCommand(user, text, chatId);
      return;
    }

    // Intent detection
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

    // No intent — general AI chat
    await handleChat(user, text, chatId);
  } catch (err) {
    console.error('Voice handling error:', err);
    await sendMessage(chatId, 'Не удалось обработать голосовое сообщение. Попробуй ещё раз или напиши текстом.');
  }
}
