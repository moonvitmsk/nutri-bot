import type { NutriUser } from '../max/types.js';
import { sendMessage, downloadImage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { activateQrCode } from '../db/subscriptions.js';
import { decodeQrFromBuffer, extractQrCode } from '../utils/qr-decoder.js';
import { mainMenu } from '../max/keyboard.js';

export async function handleQrPhoto(user: NutriUser, chatId: number, imageUrl: string) {
  await setContextState(user.id, 'idle');
  await sendMessage(chatId, 'Декодирую QR-код...');

  try {
    const imageBuffer = await downloadImage(imageUrl);
    const rawText = await decodeQrFromBuffer(imageBuffer);

    if (!rawText) {
      await sendMessage(chatId, 'Не удалось считать QR-код. Убедись, что код чёткий и хорошо освещён, и попробуй ещё раз.', await mainMenu());
      return;
    }

    const code = extractQrCode(rawText);
    if (!code) {
      await sendMessage(chatId, `Считан текст: "${rawText}", но это не похоже на QR-код Moonvit. Попробуй ещё раз.`, await mainMenu());
      return;
    }

    const result = await activateQrCode(user.id, code);
    if (result.success) {
      await sendMessage(chatId, `${result.message}\n\nТеперь тебе доступны все функции бота!`, await mainMenu());
    } else {
      await sendMessage(chatId, result.message, await mainMenu());
    }
  } catch (err) {
    console.error('QR decode error:', err);
    await sendMessage(chatId, 'Ошибка при обработке QR-кода. Попробуй ещё раз.', await mainMenu());
  }
}
