// G-1: Recipe recommendations with infographic cards
import type { NutriUser } from '../max/types.js';
import { sendMessage, uploadImage, sendMessageWithImage } from '../max/api.js';
import { chatCompletion } from '../ai/client.js';
import { mainMenu } from '../max/keyboard.js';
import { saveMessage } from '../db/messages.js';
import { getTodayNutrients } from './vitamin-tracker.js';
import { DAILY_NORMS_RU, getDailyNorm } from '../config/daily-norms-ru.js';
import { generateRecipeCardPng, type RecipeCardData } from './recipe-card.js';
import { trackError } from './error-tracker.js';

function formatRecipesText(recipes: RecipeCardData[]): string {
  return recipes.map((r, i) => {
    const ings = r.ingredients.map(ing => `- ${ing.name} — ${ing.amount}`).join('\n');
    const steps = r.steps.map((s, si) => `${si + 1}. ${s}`).join('\n');
    return [
      `**${i + 1}. ${r.name}** | ${r.time_min} мин | ~${r.cost_rub}\u20BD`,
      r.why,
      '',
      'Ингредиенты:',
      ings,
      '',
      steps,
      '',
      `КБЖУ: ${r.kbju.calories} ккал | Б${r.kbju.protein} Ж${r.kbju.fat} У${r.kbju.carbs}`,
      r.covers || '',
    ].filter(Boolean).join('\n');
  }).join('\n\n---\n\n');
}

/** Show recipe options before generating */
export async function askRecipeOptions(user: NutriUser, chatId: number) {
  // Auto-detect meal by Moscow time
  const moscowHour = new Date(Date.now() + 3 * 60 * 60 * 1000).getUTCHours();
  const autoMeal = moscowHour < 11 ? 'завтрак' : moscowHour < 15 ? 'обед' : moscowHour < 18 ? 'полдник' : 'ужин';

  await sendMessage(chatId, `Сейчас время для: ${autoMeal}. Что приготовим?`, [
    [
      { type: 'callback', text: '🌅 Завтрак', payload: 'recipe_breakfast' },
      { type: 'callback', text: '🍲 Обед', payload: 'recipe_lunch' },
      { type: 'callback', text: '🌙 Ужин', payload: 'recipe_dinner' },
    ],
    [
      { type: 'callback', text: '🍎 Перекус', payload: 'recipe_snack' },
      { type: 'callback', text: '🎲 Что-нибудь вкусное', payload: 'recipe_any' },
    ],
    [
      { type: 'callback', text: '📸 У меня есть продукты (фото)', payload: 'recipe_photo' },
      { type: 'callback', text: '✍️ Напишу что есть', payload: 'recipe_custom' },
    ],
  ]);
}

/** Handle custom recipe request with user's ingredients or wishes */
export async function handleRecipesCustom(user: NutriUser, chatId: number, request: string) {
  return handleRecipes(user, chatId, request);
}

export async function handleRecipes(user: NutriUser, chatId: number, context?: string) {
  await sendMessage(chatId, 'Подбираю рецепты с инфографикой... секунду!');

  const nutrients = await getTodayNutrients(user.id);
  const deficiencies = Object.keys(DAILY_NORMS_RU)
    .filter(key => {
      const norm = getDailyNorm(key, user.sex);
      return norm > 0 && ((nutrients[key] || 0) / norm) < 0.5;
    })
    .map(key => DAILY_NORMS_RU[key]?.name || key)
    .slice(0, 3);

  const profileLines = [
    `${user.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${user.age} лет`,
    `Цель: ${user.goal || 'не указана'}`,
    user.allergies?.length ? `Аллергии: ${user.allergies.join(', ')}` : '',
    user.diet_pref ? `Предпочтения: ${user.diet_pref}` : '',
    deficiencies.length ? `Дефициты сегодня: ${deficiencies.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  try {
    const { RECIPE_JSON_PROMPT } = await import('../prompts/recipes.js');
    const { getModelConfig } = await import('../config/models.js');
    const modelCfg = getModelConfig('recipe');
    const { text, tokens } = await chatCompletion([
      { role: 'system', content: RECIPE_JSON_PROMPT },
      { role: 'user', content: `Профиль:\n${profileLines}\n\n${context ? `ОБЯЗАТЕЛЬНОЕ ОГРАНИЧЕНИЕ: ${context}\nРецепты ДОЛЖНЫ строго следовать этому ограничению.\n\n` : ''}Предложи 3 РАЗНЫХ рецепта. Рецепты должны отличаться по типу блюда.` },
    ], modelCfg.model);

    // Clean AI response: strip markdown code blocks
    let cleanText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Try to parse structured recipes
    let recipes: RecipeCardData[] | null = null;
    try {
      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        let jsonStr = match[0];
        // Fix common AI JSON errors: ingredient without "amount" key
        // e.g. {"name":"груша","200"} → {"name":"груша","amount":"200"}
        jsonStr = jsonStr.replace(
          /("name"\s*:\s*"[^"]*")\s*,\s*"([^"]*)"(\s*})/g,
          '$1,"amount":"$2"$3'
        );
        // Fix trailing commas before } or ]
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
          recipes = parsed.recipes;
        }
      }
    } catch (parseErr) {
      console.error('RECIPE_JSON_PARSE_ERROR:', parseErr instanceof Error ? parseErr.message : String(parseErr));
    }

    if (recipes?.length) {
      // Normalize: ensure every ingredient has name + amount as strings
      for (const r of recipes) {
        r.ingredients = (r.ingredients || []).map((ing: any) => ({
          name: String(ing.name || ''),
          amount: String(ing.amount || ing.weight || ing.quantity || ''),
        }));
      }

      // Send all recipes as text
      const textVersion = formatRecipesText(recipes);
      const fullText = textVersion;
      await saveMessage(user.id, 'assistant', fullText, tokens);
      await sendMessage(chatId, fullText, await mainMenu());
    } else {
      // Fallback: NEVER send raw JSON to user
      const isRawJson = cleanText.startsWith('{') || cleanText.startsWith('[');
      if (isRawJson) {
        await trackError('recipe', `JSON parse failed, raw JSON not sent`, { user_id: user.max_user_id, text_preview: cleanText.slice(0, 200) });
        await sendMessage(chatId, 'Рецепты готовы, но произошла ошибка форматирования. Попробуй ещё раз!', await mainMenu());
      } else {
        await saveMessage(user.id, 'assistant', cleanText, tokens);
        await sendMessage(chatId, cleanText, await mainMenu());
      }
    }
  } catch (err) {
    await trackError('recipe', `Recipe error: ${err instanceof Error ? err.message : String(err)}`, { user_id: user.max_user_id });
    await sendMessage(chatId, 'Не удалось подобрать рецепты. Попробуй позже.', await mainMenu());
  }
}
