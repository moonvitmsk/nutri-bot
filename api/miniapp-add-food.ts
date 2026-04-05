// POST /api/miniapp-add-food — add food via text description (AI analysis)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, validateAndGetUser } from './_shared/auth.js';
import { saveFoodLog } from '../src/db/food-logs.js';
import { chatCompletion } from '../src/ai/client.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await validateAndGetUser(req, res);
    if (!auth) return;

    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({ error: 'text required (min 2 chars)' });
    }

    // AI analysis
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

    // Save to DB
    const log = await saveFoodLog(auth.user.id, {
      description,
      calories: Math.round(total.calories || 0),
      protein: Math.round(total.protein || 0),
      fat: Math.round(total.fat || 0),
      carbs: Math.round(total.carbs || 0),
      confirmed: true,
      ai_analysis: {
        items: parsed.items || [],
        micronutrients,
        comment: parsed.comment || '',
      },
    });

    return res.status(200).json({
      ok: true,
      log: {
        id: log.id,
        description: log.description,
        calories: log.calories || 0,
        protein: log.protein || 0,
        fat: log.fat || 0,
        carbs: log.carbs || 0,
        photo_url: null,
        created_at: log.created_at,
        micronutrients,
        items: parsed.items || [],
        comment: parsed.comment || '',
      },
    });
  } catch (err: any) {
    console.error('[miniapp-add-food]', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
