// POST /api/miniapp-water — increment/decrement water glasses
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, validateAndGetUser } from './_shared/auth.js';
import { supabase } from '../src/db/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await validateAndGetUser(req, res);
    if (!auth) return;

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
