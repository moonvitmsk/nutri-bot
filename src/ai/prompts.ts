import { getSetting } from '../db/settings.js';
import type { NutriUser } from '../max/types.js';
import { getAllProducts } from '../db/products.js';
import { CHAT_SYSTEM_BASE, CHAT_ED_SAFE_RULES, CHAT_UNDERAGE_RULES, getChatSystemPrompt } from '../prompts/chat-system.js';
import { FOOD_ANALYSIS_SYSTEM_PROMPT } from '../prompts/food-analysis.js';
import { RESTAURANT_MENU_PROMPT } from '../prompts/restaurant-menu.js';
import { LAB_ANALYSIS_PROMPT, SUPPLEMENT_OCR_PROMPT as OCR_PROMPT_NEW } from '../prompts/supplement-ocr.js';
import { AGENT_PROMPTS, CONTEXT_SUMMARY_PROMPT, QUALITY_CHECK_PROMPT, ONBOARDING_GREETING_PROMPT, getOnboardingGreetingForAge } from '../prompts/agents.js';

export async function getSystemPrompt(user: NutriUser): Promise<string> {
  const products = await getAllProducts();

  const productInfo = products.map(p =>
    `- ${p.name} (${p.slug}): ${p.key_ingredients.join(', ')}. Для: ${p.targets.join(', ')}`
  ).join('\n');

  const userProfile = user.onboarding_completed ? [
    `Пользователь: ${user.name || 'без имени'}, ${user.sex === 'male' ? 'М' : 'Ж'}, ${user.age} лет`,
    `Рост ${user.height_cm} см, вес ${user.weight_kg} кг`,
    `Цель: ${goalLabel(user.goal)}`,
    `Норма КБЖУ: ${user.daily_calories} ккал / Б${user.daily_protein} Ж${user.daily_fat} У${user.daily_carbs}`,
    user.allergies.length ? `Аллергии: ${user.allergies.join(', ')}` : null,
    user.chronic.length ? `Хронические: ${user.chronic.join(', ')}` : null,
    user.diet_pref ? `Предпочтения: ${user.diet_pref}` : null,
  ].filter(Boolean).join('\n') : 'Профиль не заполнен.';

  return [
    getChatSystemPrompt(user.age),
    '',
    'ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:',
    userProfile,
    '',
    'ПРОДУКТЫ MOONVIT (рекомендуй только при уместности):',
    productInfo,
    // Guard rails: age
    ...(user.age && user.age < 18 ? ['', CHAT_UNDERAGE_RULES] : []),
    // Guard rails: ED-safe mode
    ...(user.chronic?.includes('рпп') || user.chronic?.includes('булимия') || user.chronic?.includes('анорексия') ? ['', CHAT_ED_SAFE_RULES] : []),
  ].join('\n');
}

export async function getFoodVisionPrompt(): Promise<string> {
  return FOOD_ANALYSIS_SYSTEM_PROMPT;
}

export async function getLabVisionPrompt(): Promise<string> {
  return LAB_ANALYSIS_PROMPT;
}

export async function getRestaurantMenuPrompt(): Promise<string> {
  return RESTAURANT_MENU_PROMPT;
}

export async function getAgentPrompt(agent: 'dietolog' | 'health' | 'lifestyle' | 'report'): Promise<string> {
  return AGENT_PROMPTS[agent] || `Ты - агент ${agent}.`;
}

export function getContextSummaryPrompt(): string {
  return CONTEXT_SUMMARY_PROMPT;
}

export function getQualityCheckPrompt(): string {
  return QUALITY_CHECK_PROMPT;
}

export function getOnboardingGreetingPrompt(userAge?: number | null): string {
  return getOnboardingGreetingForAge(userAge);
}

function goalLabel(goal: string | null): string {
  return { lose: 'Похудеть', maintain: 'Поддержать', gain: 'Набрать' }[goal || ''] || 'Не указана';
}
