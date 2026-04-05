import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { saveMessage } from '../db/messages.js';
import { supabase } from '../db/supabase.js';
import { analyzeLabPhoto } from '../ai/vision.js';
import { getDeficiencyProducts } from '../db/products.js';
import { mainMenu } from '../max/keyboard.js';
import { splitMessage, labDisclaimer, vitaminDisclaimer } from '../utils/formatter.js';

export async function handleLabPhoto(user: NutriUser, chatId: number, imageUrl: string) {
  await sendMessage(chatId, 'Секунду, разбираю документ...');
  await setContextState(user.id, 'idle');

  try {
    const { markers, interpretation, tokens } = await analyzeLabPhoto(imageUrl);

    // Check if AI detected non-blood-test document
    const fullText = interpretation.toLowerCase();
    const isImaging = fullText.includes('"type": "imaging"') || fullText.includes('"type":"imaging"')
      || fullText.includes('мрт') || fullText.includes('кт ') || fullText.includes('рентген') || fullText.includes('узи');
    const isOther = fullText.includes('"type": "other"') || fullText.includes('"type":"other"');

    if (isImaging) {
      const msg = 'Это снимок (МРТ/КТ/рентген/УЗИ), а не анализы. Тут я тебе не помощник — серьёзно, иди к врачу. Я считаю калории и разбираю анализы крови, а не читаю снимки.\n\nОтправь мне результаты анализов крови — вот их я разберу по полочкам.';
      await saveMessage(user.id, 'assistant', msg, tokens);
      await sendMessage(chatId, msg, await mainMenu());
      return;
    }

    if (isOther && !markers.length) {
      const msg = 'Это не похоже на результаты анализов. Отправь мне фото анализов крови, биохимии или гормонов — я их разберу и скажу, что к чему.';
      await saveMessage(user.id, 'assistant', msg, tokens);
      await sendMessage(chatId, msg, await mainMenu());
      return;
    }

    // Blood test analysis
    const lowMarkers = markers.filter(m => m.status === 'low');
    const highMarkers = markers.filter(m => m.status === 'high');
    const deficiencyKeys = lowMarkers.map(m => m.name.toLowerCase().replace(/\s+/g, '_'));

    let vitaminRecs = '';
    for (const key of deficiencyKeys.slice(0, 3)) {
      const products = await getDeficiencyProducts(key);
      if (products.length) {
        const top = products[0];
        vitaminRecs += `\n- ${top.name}: ${top.reason}`;
      }
    }

    const msg = [
      'Разбор анализов:',
      '',
      markers.length ? markers.map(m => {
        const icon = m.status === 'normal' ? '✅' : m.status === 'low' ? '⬇️' : '⬆️';
        return `${icon} ${m.name}: ${m.value} ${m.unit} (норма: ${m.reference})`;
      }).join('\n') : '',
      '',
      interpretation,
      lowMarkers.length ? `\nСниженные: ${lowMarkers.map(m => m.name).join(', ')}` : '',
      highMarkers.length ? `\nПовышенные: ${highMarkers.map(m => m.name).join(', ')}` : '',
      vitaminRecs ? `\nЧем можно помочь:${vitaminRecs}${vitaminDisclaimer()}` : '',
      labDisclaimer(),
    ].filter(Boolean).join('\n');

    await supabase.from('nutri_lab_results').insert({
      user_id: user.id,
      photo_url: imageUrl,
      parsed_data: { markers },
      ai_interpretation: interpretation,
      deficiencies: deficiencyKeys,
      recommendations: vitaminRecs ? { text: vitaminRecs } : null,
    });

    await saveMessage(user.id, 'assistant', msg, tokens);
    const parts = splitMessage(msg);
    for (const part of parts) {
      await sendMessage(chatId, part, parts.indexOf(part) === parts.length - 1 ? await mainMenu() : undefined);
    }
  } catch (err) {
    console.error('Lab analysis error:', err);
    await sendMessage(chatId, 'Не удалось разобрать документ. Убедись, что текст читаемый, и попробуй ещё раз.', await mainMenu());
  }
}
