// G-4: PDF-based lab result parsing
import { createRequire } from 'module';
import { downloadFile, sendMessage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { analyzeLabText } from '../ai/vision.js';
import type { NutriUser } from '../max/types.js';
import { mainMenu } from '../max/keyboard.js';
import { splitMessage, labDisclaimer, vitaminDisclaimer } from '../utils/formatter.js';
import { saveMessage } from '../db/messages.js';
import { supabase } from '../db/supabase.js';
import { getDeficiencyProducts } from '../db/products.js';

const require = createRequire(import.meta.url);

export async function handleLabDocument(user: NutriUser, chatId: number, fileUrl: string) {
  await sendMessage(chatId, 'Скачиваю и разбираю PDF... 10-20 секунд.');
  await setContextState(user.id, 'idle');

  try {
    const buffer = await downloadFile(fileUrl);

    let pdfText = '';
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      pdfText = pdfData.text?.trim() || '';
    } catch {
      await sendMessage(chatId, 'Не смог прочитать этот PDF — попробуй сфотографировать страницу с результатами и отправить фото!', await mainMenu());
      return;
    }

    if (!pdfText || pdfText.length < 30) {
      await sendMessage(chatId, 'PDF пустой или защищён паролем. Сфотографируй бланк анализов — это работает надёжнее!', await mainMenu());
      return;
    }

    const { markers, interpretation, tokens } = await analyzeLabText(pdfText.slice(0, 3000));

    const lowMarkers = markers.filter(m => m.status === 'low');
    const highMarkers = markers.filter(m => m.status === 'high');
    const deficiencyKeys = lowMarkers.map(m => m.name.toLowerCase().replace(/\s+/g, '_'));

    let vitaminRecs = '';
    for (const key of deficiencyKeys.slice(0, 3)) {
      const products = await getDeficiencyProducts(key);
      if (products.length) {
        vitaminRecs += `\n- ${products[0].name}: ${products[0].reason}`;
      }
    }

    const msg = [
      'Разбор анализов (из PDF):',
      '',
      markers.length
        ? markers.map(m => {
            const icon = m.status === 'normal' ? '✅' : m.status === 'low' ? '⬇️' : '⬆️';
            return `${icon} ${m.name}: ${m.value} ${m.unit} (норма: ${m.reference})`;
          }).join('\n')
        : 'Показатели не обнаружены — убедись, что PDF содержит бланк анализов.',
      '',
      interpretation,
      lowMarkers.length ? `\nСниженные: ${lowMarkers.map(m => m.name).join(', ')}` : '',
      highMarkers.length ? `\nПовышенные: ${highMarkers.map(m => m.name).join(', ')}` : '',
      vitaminRecs ? `\nЧем можно помочь:${vitaminRecs}${vitaminDisclaimer()}` : '',
      labDisclaimer(),
    ].filter(Boolean).join('\n');

    try {
      await supabase.from('nutri_lab_results').insert({
        user_id: user.id,
        parsed_data: { markers },
        ai_interpretation: interpretation,
        deficiencies: deficiencyKeys,
      });
    } catch { /* non-critical */ }

    await saveMessage(user.id, 'assistant', msg, tokens);
    const parts = splitMessage(msg);
    for (let i = 0; i < parts.length; i++) {
      await sendMessage(chatId, parts[i], i === parts.length - 1 ? await mainMenu() : undefined);
    }
  } catch (err) {
    console.error('PDF analysis error:', err);
    await sendMessage(chatId, 'Не удалось обработать PDF. Попробуй ещё раз или сфотографируй страницу анализов.', await mainMenu());
  }
}
