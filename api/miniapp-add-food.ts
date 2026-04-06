// POST /api/miniapp-add-food — multiplex endpoint for food + AI features
// { initData, text }         → text AI analysis, save confirmed
// { initData, imageBase64 }  → photo Vision analysis, save UNconfirmed, return result for review
// { initData, confirmLogId } → confirm a pending log
// { initData, recipe, meal }  → recipe generation (meal = breakfast/lunch/dinner/snack)
// { initData, mealplan, period } → meal plan (period = today/week)
// { initData, chat }          → free-form AI nutritionist chat
// { initData, deep_consult, focus? } → 4-agent deep consultation
// { initData, restaurant_photo } → restaurant menu photo analysis (base64)
// { initData, lab_photo }       → lab results photo analysis (base64)
// { initData, lab_pdf }         → lab results PDF analysis (base64 encoded PDF)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, validateAndGetUser, checkRateLimit } from './_shared/auth.js';
import { saveFoodLog, confirmFoodLog, updateFoodLog } from '../src/db/food-logs.js';
import { chatCompletion } from '../src/ai/client.js';
import { analyzeFoodPhoto, analyzeLabPhoto, analyzeRestaurantMenu } from '../src/ai/vision.js';
import { updateUser } from '../src/db/users.js';
import { canUseFeature, getPhotosRemaining } from '../src/db/subscriptions.js';
import { runDeepConsultation } from '../src/ai/agents.js';
import { getTodayLogs } from '../src/db/food-logs.js';
import { supabase } from '../src/db/supabase.js';

const FOOD_PROMPT = `Ты AI-нутрициолог. Пользователь описал приём пищи текстом. Верни JSON:
{
  "description": "Краткое название блюда (макс 40 символов)",
  "items": [{"name":"...","weight_g":0,"calories":0,"protein":0,"fat":0,"carbs":0}],
  "total": {"calories":0,"protein":0,"fat":0,"carbs":0},
  "micronutrients": {"vitamin_a":0,"vitamin_c":0,"vitamin_d":0,"vitamin_e":0,"vitamin_b1":0,"vitamin_b2":0,"vitamin_b6":0,"vitamin_b12":0,"vitamin_b9":0,"iron":0,"calcium":0,"magnesium":0,"zinc":0,"selenium":0},
  "comment": "Короткий комментарий нутрициолога (1-2 предложения)"
}
Все числа — числа (не строки). Витамины в стандартных единицах (мкг для A/D/B12/B9/Se, мг для остальных).
Отвечай ТОЛЬКО JSON, без markdown.`;

const MAX_BASE64_LENGTH = 2_000_000;

const RECIPE_PROMPT = `Ты — Moonvit. Предложи 3 рецепта. Верни ТОЛЬКО чистый JSON (без markdown-блоков).
ФОРМАТ JSON:
{"recipes":[{"name":"Название до 35 символов","time_min":25,"cost_rub":350,"why":"Почему этот рецепт — 1 предложение","ingredients":[{"name":"Продукт","amount":"200г"}],"steps":["Шаг 1","Шаг 2"],"kbju":{"calories":420,"protein":38,"fat":24,"carbs":12},"covers":"Витамин D — 80% нормы"}]}
Правила:
- 3 РАЗНЫХ рецепта, 5-8 ингредиентов, 3-5 шагов
- Время < 30 мин, продукты из Пятёрочки/Магнита
- КБЖУ на 1 порцию
- Учти аллергии и предпочтения
- Если указан приём пищи — рецепты для него
- Верни ТОЛЬКО JSON`;

const MEALPLAN_PROMPT = `Ты — Moonvit. Составь план питания.
Для каждого дня:
**[День]**
🌅 Завтрак: [блюдо] (~[ккал])
🍎 Перекус: [блюдо] (~[ккал])
🍽 Обед: [блюдо] (~[ккал])
🍎 Полдник: [блюдо] (~[ккал])
🌙 Ужин: [блюдо] (~[ккал])
Итого: ~[ккал] ккал

В конце — шоппинг-лист.
Правила: 3 приёма + 2 перекуса, ±10% от нормы КБЖУ, российские продукты, разнообразие, тон дружеский.`;

const CHAT_PROMPT = `Ты — Moonvit, AI-нутрициолог. Дерзкий, но заботливый.
- Кратко: 2-4 предложения, если не просят подробнее
- Дерзко, но по-доброму. Без занудства.
- Эмодзи: 1-2 на сообщение
- Сначала рекомендуй ЕДУ, потом витамины/БАДы
- Не давай медицинских назначений
- Не пиши больше 2000 символов
- Учитывай профиль и дефициты пользователя`;

function buildLogResponse(log: any, items: any[], micronutrients: any, comment: string) {
  return {
    id: log.id,
    description: log.description,
    calories: log.calories || 0,
    protein: log.protein || 0,
    fat: log.fat || 0,
    carbs: log.carbs || 0,
    photo_url: null,
    created_at: log.created_at,
    micronutrients,
    items,
    comment,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await validateAndGetUser(req, res);
    if (!auth) return;

    if (!checkRateLimit(String(auth.maxUserId))) {
      return res.status(429).json({ ok: false, error: 'Слишком много запросов. Подожди минуту.' });
    }

    const { text, imageBase64, confirmLogId, updatedItems, updatedTotals, recipe, meal, mealplan, period, chat, deep_consult, focus, restaurant_photo, lab_photo, lab_pdf, exclude_recipes, editLogId, updates, fridge_photo, voiceBase64 } = req.body || {};

    // ── Voice transcription (Whisper) ──
    if (voiceBase64 && typeof voiceBase64 === 'string') {
      const { openai } = await import('../src/ai/client.js');
      const { toFile } = await import('openai');
      const base64 = voiceBase64.replace(/^data:audio\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ ok: false, error: 'Аудио слишком большое (макс 10 МБ)' });
      }
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: await toFile(buffer, 'audio.webm', { type: 'audio/webm' }),
        language: 'ru',
      });
      const transcript = transcription.text?.trim();
      if (!transcript) {
        return res.json({ ok: false, error: 'Не удалось разобрать речь' });
      }
      return res.json({ ok: true, transcript });
    }

    // ── Edit mode: update time/category of existing log ──
    if (editLogId && typeof editLogId === 'string') {
      const upd: Record<string, any> = {};
      if (updates?.created_at) upd.created_at = updates.created_at;
      if (updates?.category) upd.category = updates.category;
      const { error } = await supabase
        .from('nutri_food_logs')
        .update(upd)
        .eq('id', editLogId)
        .eq('user_id', auth.user.id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true });
    }

    // ── Fridge photo mode: identify ingredients and generate recipes ──
    if (fridge_photo && typeof fridge_photo === 'string') {
      if (!fridge_photo.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      if (fridge_photo.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: 'Image too large' });
      }
      // Use Vision to identify ingredients
      const { analysis } = await analyzeFoodPhoto(fridge_photo);
      const ingredients = (analysis.items || []).map((i: any) => i.name);

      // Generate recipes from those ingredients
      const u = auth.user;
      const profileLines = [
        `${u.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${u.age} лет, ${u.weight_kg} кг`,
        `Цель: ${u.goal_text || u.goal || 'не указана'}`,
        `Норма: ${u.daily_calories} ккал / Б${u.daily_protein}г Ж${u.daily_fat}г У${u.daily_carbs}г`,
      ].join('\n');
      const { text: aiRaw } = await chatCompletion([
        { role: 'system', content: RECIPE_PROMPT },
        { role: 'user', content: `Профиль:\n${profileLines}\n\nВ холодильнике найдены продукты: ${ingredients.join(', ')}. Предложи 3 рецепта из этих ингредиентов.` },
      ], 'gpt-4.1-mini');

      let recipes: any[] = [];
      try {
        const cleaned = aiRaw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
          recipes = parsed.recipes || [];
        }
      } catch { /* empty */ }

      return res.status(200).json({ ok: true, ingredients, recipes });
    }

    // ── Confirm mode: confirm a pending unconfirmed log (with optional updated portions) ──
    if (confirmLogId && typeof confirmLogId === 'string') {
      // If user edited portions, update the log before confirming
      if (updatedTotals && typeof updatedTotals === 'object') {
        await updateFoodLog(confirmLogId, {
          calories: Math.round(updatedTotals.calories || 0),
          protein: Math.round(updatedTotals.protein || 0),
          fat: Math.round(updatedTotals.fat || 0),
          carbs: Math.round(updatedTotals.carbs || 0),
        });
      }
      if (updatedItems && Array.isArray(updatedItems)) {
        // Update ai_analysis.items with edited weights
        const { data: existing } = await (await import('../src/db/supabase.js')).supabase
          .from('nutri_food_logs')
          .select('ai_analysis')
          .eq('id', confirmLogId)
          .single();
        if (existing) {
          const aiAnalysis = (existing.ai_analysis as any) || {};
          aiAnalysis.items = updatedItems;
          await updateFoodLog(confirmLogId, { ai_analysis: aiAnalysis } as any);
        }
      }
      await confirmFoodLog(confirmLogId);
      return res.status(200).json({ ok: true, confirmed: true });
    }

    // ── Recipe mode: generate 3 recipes ──
    if (recipe === true || typeof recipe === 'string') {
      const u = auth.user;
      const mealType = typeof meal === 'string' ? meal : '';
      const profileLines = [
        `${u.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${u.age} лет, ${u.weight_kg} кг`,
        `Цель: ${u.goal_text || u.goal || 'не указана'}`,
        `Норма: ${u.daily_calories} ккал / Б${u.daily_protein}г Ж${u.daily_fat}г У${u.daily_carbs}г`,
      ].join('\n');

      const excludeHint = Array.isArray(exclude_recipes) && exclude_recipes.length > 0
        ? `\nНЕ предлагай эти рецепты (уже были): ${exclude_recipes.join(', ')}`
        : '';

      const { text: aiRaw } = await chatCompletion([
        { role: 'system', content: RECIPE_PROMPT },
        { role: 'user', content: `Профиль:\n${profileLines}\n\n${mealType ? `Приём пищи: ${mealType}. ` : ''}${typeof recipe === 'string' && recipe.length > 3 ? recipe : 'Предложи 3 рецепта.'}${excludeHint}` },
      ], 'gpt-4.1-mini');

      try {
        const cleaned = aiRaw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          let jsonStr = match[0].replace(/,\s*([}\]])/g, '$1');
          const parsed = JSON.parse(jsonStr);
          return res.status(200).json({ ok: true, recipes: parsed.recipes || [] });
        }
      } catch { /* fallback below */ }
      return res.status(200).json({ ok: true, recipes: [], raw: aiRaw });
    }

    // ── Meal plan mode ──
    if (mealplan === true || typeof mealplan === 'string') {
      const u = auth.user;
      const p = typeof period === 'string' ? period : 'week';
      const profileLines = [
        `${u.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${u.age} лет, ${u.weight_kg} кг`,
        `Цель: ${u.goal_text || u.goal || 'не указана'}`,
        `Норма: ${u.daily_calories} ккал / Б${u.daily_protein}г Ж${u.daily_fat}г У${u.daily_carbs}г`,
      ].join('\n');

      const periodLabel = p === 'today' ? 'на сегодня (5 приёмов)' : 'на неделю';
      const { text: aiRaw } = await chatCompletion([
        { role: 'system', content: MEALPLAN_PROMPT },
        { role: 'user', content: `Профиль:\n${profileLines}\n\nСоставь план питания ${periodLabel}.` },
      ], 'gpt-4.1-mini');

      return res.status(200).json({ ok: true, mealplan: aiRaw });
    }

    // ── Chat mode: free-form AI nutritionist ──
    if (chat && typeof chat === 'string' && chat.trim().length >= 2) {
      const u = auth.user;
      const profileContext = [
        `Профиль: ${u.sex === 'male' ? 'М' : 'Ж'}, ${u.age} лет, ${u.weight_kg} кг, цель: ${u.goal_text || u.goal || '?'}`,
        `Норма: ${u.daily_calories} ккал / Б${u.daily_protein} Ж${u.daily_fat} У${u.daily_carbs}`,
      ].join('\n');

      const { text: aiRaw } = await chatCompletion([
        { role: 'system', content: `${CHAT_PROMPT}\n\n${profileContext}` },
        { role: 'user', content: chat.trim().slice(0, 1000) },
      ], 'gpt-4.1-mini');

      return res.status(200).json({ ok: true, reply: aiRaw });
    }

    // ── Deep consultation mode: 4-agent analysis ──
    if (deep_consult === true) {
      const u = auth.user;
      const todayFood = await getTodayLogs(u.id);
      const foodContext = todayFood.length
        ? todayFood.map((f: any) => `${f.description}: ${f.calories} ккал`).join('\n')
        : 'Нет записей за сегодня';

      // Get latest lab results
      const { data: labResults } = await supabase
        .from('nutri_lab_results')
        .select('ai_interpretation')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const context = [
        'ИСТОРИЯ ПИТАНИЯ СЕГОДНЯ:', foodContext, '',
        labResults?.length ? `ПОСЛЕДНИЕ АНАЛИЗЫ:\n${labResults[0].ai_interpretation || 'Нет'}` : '',
        typeof focus === 'string' && focus ? `\nФОКУС: ${focus}` : '',
      ].filter(Boolean).join('\n');

      const { finalReport } = await runDeepConsultation(u, context);
      return res.status(200).json({ ok: true, report: finalReport });
    }

    // ── Restaurant menu photo analysis ──
    if (restaurant_photo && typeof restaurant_photo === 'string') {
      if (!restaurant_photo.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      if (restaurant_photo.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: 'Image too large' });
      }
      const { analysis } = await analyzeRestaurantMenu(restaurant_photo);
      if (analysis.not_menu) {
        return res.status(200).json({ ok: false, error: 'not_menu', comment: analysis.comment || 'Это не меню' });
      }
      return res.status(200).json({ ok: true, dishes: analysis.dishes, tip: analysis.tip });
    }

    // ── Lab results PDF analysis ──
    if (lab_pdf && typeof lab_pdf === 'string') {
      const MAX_PDF_SIZE = 5_000_000; // ~3.75MB decoded
      if (lab_pdf.length > MAX_PDF_SIZE) {
        return res.status(413).json({ error: 'PDF too large, max ~3.75MB' });
      }

      const pdfBuffer = Buffer.from(lab_pdf, 'base64');
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(pdfBuffer);
      const pdfText = parsed.text;

      if (!pdfText || pdfText.trim().length < 10) {
        return res.status(200).json({ ok: false, error: 'empty_pdf', comment: 'PDF пустой или не содержит текста. Попробуйте фото.' });
      }

      const sex = auth.user.sex === 'female' ? 'женщина' : 'мужчина';
      const userCtx = `ПРОФИЛЬ ПАЦИЕНТА: ${sex}, ${auth.user.age || '?'} лет, ${auth.user.weight_kg || '?'} кг.`;

      const LAB_PDF_PROMPT = `Проанализируй результаты анализов крови, извлечённые из PDF. Извлеки ключевые маркеры.

${userCtx} Учти возраст и пол при интерпретации референсов.

## ФОРМАТ ОТВЕТА (JSON)
{
  "markers": [
    {"name": "Гемоглобин", "value": "125", "unit": "г/л", "reference": "120-160", "status": "normal"},
    {"name": "Витамин D (25-OH)", "value": "15", "unit": "нг/мл", "reference": "30-100", "status": "low"}
  ],
  "interpretation": "Краткая интерпретация (2-3 предложения). Что в норме, что нет.",
  "recommendations": "Что делать: питание, потом добавки"
}

## STATUS
- "normal" — в пределах референса
- "low" — ниже нормы
- "high" — выше нормы

## ПРАВИЛА
- Ты НЕ врач. Интерпретируй осторожно.
- Рекомендации: сначала еда, потом добавки
- Отвечай ТОЛЬКО JSON`;

      const { text: aiRaw } = await chatCompletion([
        { role: 'system', content: LAB_PDF_PROMPT },
        { role: 'user', content: `Результаты анализов (извлечено из PDF):\n\n${pdfText.slice(0, 4000)}` },
      ], 'gpt-4.1-mini');

      let markers: any[] = [];
      let interpretation = '';
      try {
        const cleaned = aiRaw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          markers = result.markers || [];
          interpretation = [result.interpretation, result.recommendations].filter(Boolean).join('\n\n');
          if (result.see_doctor) interpretation += '\n\n⚠️ Рекомендуется обратиться к врачу.';
        }
      } catch {
        // Don't show raw JSON to user
        interpretation = 'Анализ завершён. Маркеры извлечены из PDF.';
      }

      const deficiencies = markers.filter((m: any) => m.status === 'low').map((m: any) => m.name);
      await supabase.from('nutri_lab_results').insert({
        user_id: auth.user.id,
        markers,
        ai_interpretation: interpretation,
        deficiencies,
        source: 'pdf',
      });

      return res.status(200).json({ ok: true, markers, interpretation, deficiencies });
    }

    // ── Lab results photo analysis ──
    if (lab_photo && typeof lab_photo === 'string') {
      if (!lab_photo.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      if (lab_photo.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: 'Image too large' });
      }
      const { markers, interpretation } = await analyzeLabPhoto(lab_photo, {
        sex: auth.user.sex, age: auth.user.age, weight_kg: auth.user.weight_kg,
      });

      // Save lab results to DB
      const deficiencies = markers.filter(m => m.status === 'low').map(m => m.name);
      await supabase.from('nutri_lab_results').insert({
        user_id: auth.user.id,
        markers,
        ai_interpretation: interpretation,
        deficiencies,
      });

      return res.status(200).json({ ok: true, markers, interpretation, deficiencies });
    }

    // ── Photo mode: analyze + save UNconfirmed ──
    if (imageBase64 && typeof imageBase64 === 'string') {
      // Check daily photo limit
      if (!canUseFeature(auth.user, 'photo')) {
        const remaining = getPhotosRemaining(auth.user);
        return res.status(429).json({
          error: 'photo_limit',
          comment: `Лимит фото на сегодня исчерпан (${remaining} осталось). Попробуй завтра или опиши еду текстом.`,
        });
      }

      if (!imageBase64.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format, expected data:image/... URI' });
      }
      if (imageBase64.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: 'Image too large, max ~1.5MB' });
      }

      const { analysis } = await analyzeFoodPhoto(imageBase64);

      // Increment photos_today counter
      await updateUser(auth.user.id, { photos_today: (auth.user.photos_today || 0) + 1 } as any);

      if (analysis.not_food) {
        return res.status(200).json({
          ok: false,
          error: 'not_food',
          comment: analysis.comment || 'Это не похоже на еду',
        });
      }

      // Handle water/drink detection
      const isDrink = (analysis as any).is_drink === true;

      const total = analysis.total;
      const description = isDrink
        ? analysis.items.map(i => i.name).join(', ').slice(0, 80) || 'Напиток'
        : analysis.items.map(i => i.name).join(', ').slice(0, 80) || 'Приём пищи';
      const micronutrients = analysis.micronutrients || {};
      const items = analysis.items.map(i => ({
        name: i.name, weight_g: i.portion_g,
        calories: i.calories, protein: i.protein, fat: i.fat, carbs: i.carbs,
        is_drink: !!(i as any).is_drink,
        volume_ml: (i as any).volume_ml || null,
      }));

      // Save as UNconfirmed — user must confirm in UI
      const log = await saveFoodLog(auth.user.id, {
        description,
        calories: Math.round(total.calories || 0),
        protein: Math.round(total.protein || 0),
        fat: Math.round(total.fat || 0),
        carbs: Math.round(total.carbs || 0),
        confirmed: false,
        ai_analysis: { items: analysis.items, micronutrients, comment: analysis.comment || '' },
      });

      return res.status(200).json({
        ok: true,
        pending: true,
        is_drink: isDrink,
        photos_remaining: getPhotosRemaining({ ...auth.user, photos_today: (auth.user.photos_today || 0) + 1 }),
        log: buildLogResponse(log, items, micronutrients, analysis.comment || ''),
      });
    }

    // ── Text mode: analyze + save confirmed ──
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({ error: 'text, imageBase64, or confirmLogId required' });
    }

    const { text: raw } = await chatCompletion([
      { role: 'system', content: FOOD_PROMPT },
      { role: 'user', content: text.trim().slice(0, 500) },
    ], 'gpt-4.1-mini');

    let parsed: any;
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({ error: 'AI response parsing failed', raw });
    }

    const total = parsed.total || {};
    const description = parsed.description || text.trim().slice(0, 40);
    const micronutrients = parsed.micronutrients || {};

    const log = await saveFoodLog(auth.user.id, {
      description,
      calories: Math.round(total.calories || 0),
      protein: Math.round(total.protein || 0),
      fat: Math.round(total.fat || 0),
      carbs: Math.round(total.carbs || 0),
      confirmed: true,
      ai_analysis: { items: parsed.items || [], micronutrients, comment: parsed.comment || '' },
    });

    return res.status(200).json({
      ok: true,
      log: buildLogResponse(log, parsed.items || [], micronutrients, parsed.comment || ''),
    });
  } catch (err: any) {
    console.error('[miniapp-add-food]', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
