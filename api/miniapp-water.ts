// POST /api/miniapp-water — water glasses + weight + profile mutations
// Actions:
//   { initData, delta }           → water increment/decrement
//   { initData, weight_kg }       → log weight entry
//   { initData, streakFreeze }    → use streak freeze
//   { initData, promo }           → activate promo code
//   { initData, allergies }       → update allergies array
//   { initData, editProfile }     → update profile fields
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, validateAndGetUser, checkRateLimit } from './_shared/auth.js';
import { supabase } from '../src/db/supabase.js';
import { activatePromoCode } from '../src/db/subscriptions.js';
import { calculateMacros } from '../src/utils/nutrition.js';
import { getReferralStats } from '../src/db/referrals.js';

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

    // ── Track event (fire-and-forget from miniapp) ──
    if (req.body.trackEvent && typeof req.body.trackEvent === 'object') {
      const { event, category, meta } = req.body.trackEvent;
      if (typeof event === 'string') {
        await supabase.from('nutri_user_events').insert({
          user_id: auth.user.id,
          event,
          category: category || 'screen',
          meta: meta || null,
        });
      }
      return res.json({ ok: true });
    }

    // ── Delete lab result ──
    if (req.body.deleteLabId && typeof req.body.deleteLabId === 'string') {
      const { error } = await supabase
        .from('nutri_lab_results')
        .delete()
        .eq('id', req.body.deleteLabId)
        .eq('user_id', auth.user.id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true });
    }

    // ── Referral stats ──
    if (req.body.referralStats === true) {
      const stats = await getReferralStats(auth.user.id);
      const link = `https://max.ru/moonvit_bot?startapp=ref_${auth.user.max_user_id}`;
      return res.status(200).json({ ok: true, ...stats, link });
    }

    // ── Promo code activation ──
    if (req.body.promo && typeof req.body.promo === 'string') {
      const code = req.body.promo.trim().toUpperCase();
      if (code.length < 3 || code.length > 30) {
        return res.status(400).json({ error: 'Неверный формат промо-кода' });
      }
      const result = await activatePromoCode(auth.user.id, code);
      return res.status(200).json({ ok: result.success, message: result.message });
    }

    // ── Allergies update ──
    if (req.body.allergies !== undefined) {
      const allergies = Array.isArray(req.body.allergies) ? req.body.allergies.filter((a: any) => typeof a === 'string') : [];
      await supabase.from('nutri_users').update({ allergies }).eq('id', auth.user.id);
      return res.status(200).json({ ok: true, allergies });
    }

    // ── Avatar upload ──
    if (req.body.avatarBase64 && typeof req.body.avatarBase64 === 'string') {
      const base64 = req.body.avatarBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Фото слишком большое (макс. 2 МБ)' });
      }
      const fileName = `avatars/${auth.user.id}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('nutri-photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('nutri-photos').getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
      await supabase.from('nutri_users').update({ avatar_url: avatarUrl }).eq('id', auth.user.id);
      return res.status(200).json({ ok: true, avatar_url: avatarUrl });
    }

    // ── Profile edit ──
    if (req.body.editProfile && typeof req.body.editProfile === 'object') {
      const ep = req.body.editProfile;
      const updates: Record<string, any> = {};
      if (typeof ep.name === 'string' && ep.name.trim()) updates.name = ep.name.trim().slice(0, 50);
      if (ep.sex === 'male' || ep.sex === 'female') updates.sex = ep.sex;
      if (typeof ep.age === 'number' && ep.age >= 10 && ep.age <= 120) updates.age = ep.age;
      if (typeof ep.height_cm === 'number' && ep.height_cm >= 100 && ep.height_cm <= 250) updates.height_cm = ep.height_cm;
      if (typeof ep.weight_kg === 'number' && ep.weight_kg >= 20 && ep.weight_kg <= 400) updates.weight_kg = ep.weight_kg;
      if (typeof ep.goal === 'string') { updates.goal = ep.goal; updates.goal_text = ep.goal_text || ep.goal; }
      if (typeof ep.water_norm === 'number' && ep.water_norm >= 1 && ep.water_norm <= 30) updates.water_norm = ep.water_norm;
      if (typeof ep.avatar_url === 'string') updates.avatar_url = ep.avatar_url;

      // Recalculate macros if physical params changed
      if (updates.weight_kg || updates.height_cm || updates.age || updates.sex) {
        const u = { ...auth.user, ...updates };
        const macros = calculateMacros({
          sex: u.sex || 'male', age: u.age || 30,
          height_cm: u.height_cm || 170, weight_kg: u.weight_kg || 70,
          activity_level: u.activity_level || 'moderate', goal: u.goal || 'maintain',
        });
        updates.daily_calories = macros.calories;
        updates.daily_protein = macros.protein;
        updates.daily_fat = macros.fat;
        updates.daily_carbs = macros.carbs;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      await supabase.from('nutri_users').update(updates).eq('id', auth.user.id);
      return res.status(200).json({ ok: true, updates });
    }

    // ── Weight logging ──
    if (req.body.weight_kg !== undefined) {
      const weight = parseFloat(req.body.weight_kg);
      if (isNaN(weight) || weight < 20 || weight > 400) {
        return res.status(400).json({ error: 'weight_kg must be between 20 and 400' });
      }

      const { data: entry, error: insertErr } = await supabase
        .from('nutri_weight_logs')
        .insert({ user_id: auth.user.id, weight_kg: weight, note: req.body.note || null })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Also update user profile weight
      await supabase.from('nutri_users').update({ weight_kg: weight }).eq('id', auth.user.id);

      // Return last 90 days of weight history
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data: history } = await supabase
        .from('nutri_weight_logs')
        .select('id, weight_kg, note, created_at')
        .eq('user_id', auth.user.id)
        .gte('created_at', ninetyDaysAgo)
        .order('created_at', { ascending: true })
        .limit(90);

      return res.status(200).json({
        ok: true,
        weight_entry: entry,
        weight_history: history || [],
        current_weight: weight,
      });
    }

    // ── Streak freeze ──
    if (req.body.streakFreeze === true) {
      const available = auth.user.streak_freeze_available || 0;
      if (available <= 0) {
        return res.status(400).json({ error: 'no_freeze', comment: 'Нет доступных заморозок стрика' });
      }
      await supabase.from('nutri_users').update({
        streak_freeze_available: available - 1,
      }).eq('id', auth.user.id);
      return res.status(200).json({
        ok: true,
        streak_freeze_available: available - 1,
        comment: 'Стрик заморожен на 1 день',
      });
    }

    // ── Water delta (original) ──
    const delta = typeof req.body.delta === 'number' ? req.body.delta : 0;
    if (delta !== 1 && delta !== -1) {
      return res.status(400).json({ error: 'delta must be 1 or -1' });
    }

    const current = auth.user.water_glasses || 0;
    const next = Math.max(0, Math.min(30, current + delta));

    await supabase.from('nutri_users').update({ water_glasses: next }).eq('id', auth.user.id);

    const norm = auth.user.weight_kg ? Math.ceil((auth.user.weight_kg * 30) / 250) : 8;
    return res.status(200).json({ ok: true, water_glasses: next, water_norm: norm });
  } catch (err: any) {
    console.error('[miniapp-water]', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
