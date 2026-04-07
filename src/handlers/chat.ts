import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { updateUser } from '../db/users.js';
import { saveMessage } from '../db/messages.js';
import { canUseFeature } from '../db/subscriptions.js';
import { chatCompletion } from '../ai/client.js';
import { getSystemPrompt } from '../ai/prompts.js';
import { buildChatHistory, maybeSummarize } from '../ai/context.js';
import { mainMenu } from '../max/keyboard.js';
import { splitMessage, featureLocked } from '../utils/formatter.js';
import { extractInsights, getInsightsForPrompt } from '../services/user-insights.js';
import { calculateMacros, formatMacros } from '../utils/nutrition.js';

interface ProfileChange {
  field: string;
  value: any;
  display: string;
}

function detectProfileUpdate(text: string): ProfileChange | null {
  const lower = text.toLowerCase().trim();

  // Name: "зови меня X", "называй меня X", "моё имя X", "я — X"
  let m = lower.match(/(?:зови|называй|зовут)\s+(?:меня\s+)?(.{2,30})/);
  if (m) return { field: 'name', value: m[1].trim(), display: `Имя: ${m[1].trim()}` };
  m = lower.match(/(?:моё?\s+имя|я\s*[-–—]\s*)(.{2,30})/);
  if (m) return { field: 'name', value: m[1].trim(), display: `Имя: ${m[1].trim()}` };

  // Weight: "вешу 75", "мой вес 75", "сбросил до 70", "вес теперь 68"
  m = lower.match(/(?:вешу|мой вес|вес теперь|сбросил[а]? до|набрал[а]? до)\s*(\d{2,3}(?:[.,]\d)?)/);
  if (m) {
    const w = parseFloat(m[1].replace(',', '.'));
    if (w >= 30 && w <= 300) return { field: 'weight_kg', value: w, display: `Вес: ${w} кг` };
  }

  // Age: "мне 35 лет", "мой возраст 35"
  m = lower.match(/(?:мне|мой возраст)\s*(\d{1,3})\s*(?:год|лет)/);
  if (m) {
    const age = parseInt(m[1]);
    if (age >= 10 && age <= 120) return { field: 'age', value: age, display: `Возраст: ${age}` };
  }

  // Height: "мой рост 175", "рост 180 см"
  m = lower.match(/(?:мой\s+)?рост\s*(\d{3})\s*(?:см)?/);
  if (m) {
    const h = parseInt(m[1]);
    if (h >= 100 && h <= 250) return { field: 'height_cm', value: h, display: `Рост: ${h} см` };
  }

  return null;
}

async function applyProfileUpdate(user: NutriUser, change: ProfileChange, chatId: number) {
  const updates: Record<string, any> = { [change.field]: change.value };

  // Recalculate macros if physical param changed
  if (['weight_kg', 'height_cm', 'age'].includes(change.field)) {
    const u = { ...user, ...updates };
    const macros = calculateMacros({
      sex: u.sex || 'male',
      age: u.age || 30,
      height_cm: u.height_cm || 170,
      weight_kg: u.weight_kg || 70,
      activity_level: u.activity_level || 'moderate',
      goal: u.goal || 'maintain',
    });
    updates.daily_calories = macros.calories;
    updates.daily_protein = macros.protein;
    updates.daily_fat = macros.fat;
    updates.daily_carbs = macros.carbs;
  }

  await updateUser(user.id, updates);
  await sendMessage(chatId, `Запомнил! ${change.display}`);
}

export async function handleChat(user: NutriUser, text: string, chatId: number) {
  // P0 fix: answer the last question THEN show limit, instead of blocking without response
  const atChatLimit = !canUseFeature(user, 'chat');
  if (atChatLimit && user.messages_today > 0) {
    // User already used some messages — this is their last one. Let it through but warn.
    // The actual blocking happens below after the response.
  } else if (atChatLimit) {
    await sendMessage(chatId, await featureLocked('chat_limit'));
    return;
  }

  // Detect profile update requests before AI chat
  const profileUpdate = detectProfileUpdate(text);
  if (profileUpdate) {
    await applyProfileUpdate(user, profileUpdate, chatId);
    // Don't return — let AI also respond naturally
  }

  // Save user message
  await saveMessage(user.id, 'user', text);

  // Maybe summarize old context
  await maybeSummarize(user.id);

  // Build messages with user insights context
  const [systemPrompt, insightsContext, history] = await Promise.all([
    getSystemPrompt(user),
    getInsightsForPrompt(user.id),
    buildChatHistory(user.id),
  ]);
  const fullSystemPrompt = systemPrompt + insightsContext;
  const messages = [
    { role: 'system' as const, content: fullSystemPrompt },
    ...history,
  ];

  try {
    const { text: reply, tokens } = await chatCompletion(messages);

    await saveMessage(user.id, 'assistant', reply, tokens);
    await updateUser(user.id, { messages_today: user.messages_today + 1 } as any);

    // Async: извлечь ключевые факты (не блокирует ответ)
    extractInsights(user.id, text, reply).catch(() => {});
    const parts = splitMessage(reply);
    for (const part of parts) {
      await sendMessage(chatId, part);
    }

    // P0 fix: warn about approaching/reached limit AFTER answering
    if (atChatLimit) {
      await sendMessage(chatId, '⚠️ Лимит сообщений на сегодня исчерпан. Завтра всё обновится!\n\nДля безлимитного общения поделись номером → 30 дней Trial, или /subscribe');
    } else {
      const remaining = 15 - (user.messages_today + 1);
      if (remaining === 3 || remaining === 1) {
        await sendMessage(chatId, `_Осталось ${remaining} сообщений на сегодня_`);
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    await sendMessage(chatId, 'Произошла ошибка. Попробуй ещё раз.', await mainMenu());
  }
}
