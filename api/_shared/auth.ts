// Shared auth + CORS for miniapp API endpoints
// Underscore-prefixed directory is NOT served as endpoint by Vercel

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateInitData } from '../../src/utils/miniapp-validate.js';
import { config } from '../../src/config.js';
import { supabase } from '../../src/db/supabase.js';

// ── In-memory rate limiter ──
const rateLimit = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(userId: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);

  if (!entry || now > entry.reset) {
    rateLimit.set(userId, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export interface AuthResult {
  user: any; // nutri_users row
  maxUserId: number;
}

/**
 * Validate initData from request body, look up user.
 * Returns null and sends error response if invalid.
 */
export async function validateAndGetUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthResult | null> {
  const { initData } = req.body || {};
  if (!initData || typeof initData !== 'string') {
    res.status(400).json({ error: 'initData required' });
    return null;
  }

  const validation = validateInitData(initData, config.max.token);
  if (!validation.valid || !validation.user) {
    res.status(401).json({ error: 'Invalid initData' });
    return null;
  }

  const maxUserId = validation.user.id;

  const { data: user } = await supabase
    .from('nutri_users')
    .select('*')
    .eq('max_user_id', maxUserId)
    .single();

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  return { user, maxUserId };
}
