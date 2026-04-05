// G-3: Weekly meal planning
import type { NutriUser } from '../max/types.js';
import { sendMessage } from '../max/api.js';
import { chatCompletion } from '../ai/client.js';
import { mainMenu } from '../max/keyboard.js';
import { saveMessage } from '../db/messages.js';
import { canUseFeature } from '../db/subscriptions.js';
import { featureLocked } from '../utils/formatter.js';
import { subscriptionInfo } from '../max/keyboard.js';

const MAX_PART = 3500;

/** Show period selection before generating */
export async function askMealPlanPeriod(user: NutriUser, chatId: number) {
  if (!canUseFeature(user, 'deepcheck')) {
    await sendMessage(chatId, await featureLocked('meal_plan'), subscriptionInfo());
    return;
  }

  await sendMessage(chatId, 'На какой период составить план питания?', [
    [
      { type: 'callback', text: '🍽️ На сегодня', payload: 'mealplan_today' },
      { type: 'callback', text: '📅 На неделю', payload: 'mealplan_week' },
    ],
    [
      { type: 'callback', text: '📆 На месяц', payload: 'mealplan_month' },
      { type: 'callback', text: '✍️ Своё пожелание', payload: 'mealplan_custom' },
    ],
  ]);
}

export async function handleMealPlan(user: NutriUser, chatId: number, period = 'week') {
  if (!canUseFeature(user, 'deepcheck')) {
    await sendMessage(chatId, await featureLocked('meal_plan'), subscriptionInfo());
    return;
  }

  const periodLabels: Record<string, string> = {
    today: 'на сегодня',
    week: 'на неделю',
    month: 'на месяц (общие рекомендации)',
  };
  const periodLabel = periodLabels[period] || period;
  await sendMessage(chatId, `Составляю план питания ${periodLabel}... 20-30 секунд!`);

  const profileLines = [
    `${user.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${user.age} лет, ${user.weight_kg} кг`,
    `Цель: ${user.goal || 'не указана'}`,
    `Норма: ${user.daily_calories} ккал / Б${user.daily_protein}г Ж${user.daily_fat}г У${user.daily_carbs}г`,
    user.allergies?.length ? `Аллергии: ${user.allergies.join(', ')}` : '',
    user.diet_pref ? `Предпочтения: ${user.diet_pref}` : '',
  ].filter(Boolean).join('\n');

  const { MEAL_PLAN_SYSTEM_PROMPT } = await import('../prompts/recipes.js');
  const { getModelConfig } = await import('../config/models.js');
  const modelCfg = getModelConfig('meal_plan');
  const { text, tokens } = await chatCompletion([
    {
      role: 'system',
      content: MEAL_PLAN_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Профиль:\n${profileLines}\n\nСоставь план питания ${periodLabel}. ${user.goal_text ? `Пожелание пользователя: ${user.goal_text}` : ''}`.trim(),
    },
  ], modelCfg.model);

  await saveMessage(user.id, 'assistant', text, tokens);

  if (text.length <= MAX_PART) {
    await sendMessage(chatId, text, await mainMenu());
  } else {
    const parts: string[] = [];
    for (let i = 0; i < text.length; i += MAX_PART) {
      parts.push(text.slice(i, i + MAX_PART));
    }
    for (let i = 0; i < parts.length; i++) {
      await sendMessage(chatId, parts[i], i === parts.length - 1 ? await mainMenu() : undefined);
    }
  }
}
