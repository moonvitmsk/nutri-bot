// C-7: Сканирование этикеток БАДов — фото → GPT-4.1 Vision OCR → JSON состав
import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { visionAnalysis } from '../ai/client.js';
import { saveMessage } from '../db/messages.js';
import { mainMenu } from '../max/keyboard.js';
import { vitaminDisclaimer } from '../utils/formatter.js';

import { SUPPLEMENT_OCR_PROMPT } from '../prompts/supplement-ocr.js';

export async function handleSupplementScan(user: NutriUser, chatId: number, imageUrl: string): Promise<void> {
  await sendMessage(chatId, 'Сканирую этикетку...');

  try {
    const { text, tokens } = await visionAnalysis(SUPPLEMENT_OCR_PROMPT, imageUrl);
    await saveMessage(user.id, 'assistant', text, tokens);
    await sendMessage(chatId, text + vitaminDisclaimer(), await mainMenu());
  } catch (err) {
    console.error('Supplement scan error:', err);
    await sendMessage(chatId, 'Не удалось прочитать этикетку. Убедись, что текст чёткий и хорошо освещённый.', await mainMenu());
  }
}
