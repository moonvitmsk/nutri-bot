import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { setContextState } from '../db/users.js';
import { saveMessage } from '../db/messages.js';
import { getRecentMessages } from '../db/messages.js';
import { getTodayLogs } from '../db/food-logs.js';
import { supabase } from '../db/supabase.js';
import { runDeepConsultation } from '../ai/agents.js';
import { mainMenu } from '../max/keyboard.js';
import { truncate, disclaimer } from '../utils/formatter.js';

/** Show deepcheck type selection */
export async function askDeepcheckType(user: NutriUser, chatId: number) {
  await sendMessage(chatId, 'Какую консультацию провести?', [
    [
      { type: 'callback', text: '🍽️ Анализ рациона', payload: 'deep_diet' },
      { type: 'callback', text: '💊 Витамины и дефициты', payload: 'deep_vitamins' },
    ],
    [
      { type: 'callback', text: '🏥 Разбор анализов', payload: 'deep_lab' },
      { type: 'callback', text: '🎯 Оценка прогресса', payload: 'deep_progress' },
    ],
    [
      { type: 'callback', text: '🔬 Полная проверка (все 4 агента)', payload: 'deep_full' },
    ],
    [
      { type: 'callback', text: '✍️ Свой вопрос', payload: 'deep_custom' },
    ],
  ]);
}

/** Handle custom deepcheck with user-provided focus */
export async function handleDeepConsultCustom(user: NutriUser, chatId: number, request: string) {
  await sendMessage(chatId, `Запускаю консультацию по теме: «${request.slice(0, 100)}»... 20-30 секунд.`);
  return handleDeepConsult(user, chatId, request);
}

export async function handleDeepConsult(user: NutriUser, chatId: number, focus?: string) {
  await setContextState(user.id, 'idle');

  try {
    // Build context from recent data
    const recentMsgs = await getRecentMessages(user.id, 20);
    const todayFood = await getTodayLogs(user.id);

    // Get latest lab results
    const { data: labResults } = await supabase
      .from('nutri_lab_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const context = [
      'ИСТОРИЯ ПИТАНИЯ СЕГОДНЯ:',
      todayFood.length
        ? todayFood.map(f => `${f.description}: ${f.calories} ккал`).join('\n')
        : 'Нет записей',
      '',
      labResults?.length ? `ПОСЛЕДНИЕ АНАЛИЗЫ:\n${labResults[0].ai_interpretation || 'Нет данных'}` : '',
      '',
      'ПОСЛЕДНИЕ ВОПРОСЫ:',
      recentMsgs.filter(m => m.role === 'user').slice(-5).map(m => m.content).join('\n'),
    ].filter(Boolean).join('\n');

    const { reports, finalReport, totalTokens } = await runDeepConsultation(user, context);

    // Save to DB
    await supabase.from('nutri_deep_consults').insert({
      user_id: user.id,
      agents_input: { context },
      agents_output: Object.fromEntries(reports.map(r => [r.agent, r.output])),
      final_report: finalReport,
    });

    const msg = truncate(finalReport + disclaimer());
    await saveMessage(user.id, 'assistant', msg, totalTokens);
    await sendMessage(chatId, msg, await mainMenu());
  } catch (err) {
    console.error('Deep consult error:', err);
    await sendMessage(chatId, 'Не удалось провести консультацию. Попробуй позже.', await mainMenu());
  }
}
