// B-6: Мультиагентная оценка качества ответов
// Второй вызов мини-модели для скоринга ответа основной модели (0-10)
import { chatCompletion } from '../ai/client.js';
import { supabase } from '../db/supabase.js';

import { getQualityCheckPrompt } from '../ai/prompts.js';
const QUALITY_PROMPT = getQualityCheckPrompt();

export async function scoreResponse(
  userMessage: string,
  botResponse: string,
  userId: string,
): Promise<number> {
  try {
    const { text } = await chatCompletion([
      { role: 'system', content: QUALITY_PROMPT },
      { role: 'user', content: `Вопрос пользователя: ${userMessage}\n\nОтвет бота: ${botResponse}` },
    ], 'gpt-4.1-nano');

    const score = parseInt(text.trim());
    if (isNaN(score) || score < 0 || score > 10) return -1;

    // Log to DB
    // Non-critical, don't fail on insert error
    try {
      await supabase.from('nutri_quality_scores').insert({
        user_id: userId,
        user_message: userMessage.slice(0, 500),
        bot_response: botResponse.slice(0, 500),
        score,
      });
    } catch { /* ignore */ }

    return score;
  } catch {
    return -1;
  }
}
