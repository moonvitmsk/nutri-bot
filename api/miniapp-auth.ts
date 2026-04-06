// POST /api/miniapp-auth — validate MAX Web App initData, return user + all data
// Used by the Moonvit Mini App

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateInitData } from '../src/utils/miniapp-validate.js';
import { config } from '../src/config.js';
import { supabase } from '../src/db/supabase.js';
import { DAILY_NORMS_RU, getDailyNorm } from '../src/config/daily-norms-ru.js';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { initData } = req.body || {};
    if (!initData || typeof initData !== 'string') {
      return res.status(400).json({ error: 'initData required' });
    }

    // Validate HMAC signature
    const validation = validateInitData(initData, config.max.token);
    if (!validation.valid || !validation.user) {
      console.log('[miniapp-auth] Invalid initData');
      return res.status(401).json({ error: 'Invalid initData signature' });
    }

    const maxUserId = validation.user.id;
    console.log('[miniapp-auth] Validated user:', maxUserId);

    // ── Find user in DB ──
    const { data: user } = await supabase
      .from('nutri_users')
      .select('*')
      .eq('max_user_id', maxUserId)
      .single();

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден. Сначала запустите бот.',
      });
    }

    // ── Get last 14 days of food logs (for diary + today) ──
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: allLogs } = await supabase
      .from('nutri_food_logs')
      .select('id, description, calories, protein, fat, carbs, photo_url, ai_analysis, created_at')
      .eq('user_id', user.id)
      .eq('confirmed', true)
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(200);

    const logs = allLogs || [];

    // ── Accumulate today's vitamins from ai_analysis.micronutrients ──
    const today = new Date().toISOString().split('T')[0];
    const todayVitamins: Record<string, number> = {};

    for (const log of logs) {
      if (!log.created_at.startsWith(today)) continue;
      const micro = (log.ai_analysis as any)?.micronutrients;
      if (micro && typeof micro === 'object') {
        for (const [key, value] of Object.entries(micro)) {
          if (typeof value === 'number') {
            todayVitamins[key] = (todayVitamins[key] || 0) + value;
          }
        }
      }
    }

    // ── Build 7-day aggregated week stats ──
    const weekByDay: Record<string, { calories: number; protein: number; fat: number; carbs: number; count: number }> = {};

    const weekAgoTs = Date.now() - 7 * 86400000;
    for (const log of logs) {
      const logTs = new Date(log.created_at).getTime();
      if (logTs < weekAgoTs) continue;
      const date = log.created_at.split('T')[0];
      if (!weekByDay[date]) weekByDay[date] = { calories: 0, protein: 0, fat: 0, carbs: 0, count: 0 };
      weekByDay[date].calories += log.calories || 0;
      weekByDay[date].protein += log.protein || 0;
      weekByDay[date].fat += log.fat || 0;
      weekByDay[date].carbs += log.carbs || 0;
      weekByDay[date].count++;
    }

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const date = d.toISOString().split('T')[0];
      const day = weekByDay[date];
      return {
        date,
        calories: day?.calories || 0,
        protein: day?.protein || 0,
        fat: day?.fat || 0,
        carbs: day?.carbs || 0,
        logged: !!day,
      };
    });

    // ── Build vitamin norms based on user sex ──
    const sex = user.sex || 'male';
    const norms: Record<string, { name: string; unit: string; daily: number }> = {};
    for (const [key, norm] of Object.entries(DAILY_NORMS_RU)) {
      norms[key] = { name: norm.name, unit: norm.unit, daily: getDailyNorm(key, sex) };
    }

    // ── Get last 5 lab results ──
    const { data: labResults } = await supabase
      .from('nutri_lab_results')
      .select('id, created_at, deficiencies, ai_interpretation')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // ── Get weight history (last 90 days) ──
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: weightHistory } = await supabase
      .from('nutri_weight_logs')
      .select('id, weight_kg, note, created_at')
      .eq('user_id', user.id)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: true })
      .limit(90);

    // ── Response ──
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        sex: user.sex,
        age: user.age,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        goal: user.goal,
        goal_text: user.goal_text,
        daily_calories: user.daily_calories,
        daily_protein: user.daily_protein,
        daily_fat: user.daily_fat,
        daily_carbs: user.daily_carbs,
        water_glasses: user.water_glasses || 0,
        water_norm: user.water_norm || (user.weight_kg ? Math.ceil((user.weight_kg * 30) / 250) : 8),
        streak_days: user.streak_days || 0,
        subscription_type: user.subscription_type,
        onboarding_completed: user.onboarding_completed,
        streak_freeze_available: user.streak_freeze_available || 0,
        photos_today: user.photos_today || 0,
        avatar_url: user.avatar_url || null,
        premium_until: user.premium_until || null,
      },
      logs: logs.map(l => ({
        id: l.id,
        description: l.description,
        calories: l.calories || 0,
        protein: l.protein || 0,
        fat: l.fat || 0,
        carbs: l.carbs || 0,
        photo_url: l.photo_url,
        created_at: l.created_at,
        micronutrients: (l.ai_analysis as any)?.micronutrients || null,
        items: (l.ai_analysis as any)?.items || null,
        comment: (l.ai_analysis as any)?.comment || null,
      })),
      today_vitamins: todayVitamins,
      week,
      norms,
      lab_results: labResults || [],
      weight_history: weightHistory || [],
    });
  } catch (err: any) {
    console.error('[miniapp-auth] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
