import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../src/db/supabase.js';

const startTime = Date.now();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for admin dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const checks: Record<string, any> = {};

  // Supabase connectivity + latency
  const sbStart = Date.now();
  try {
    const { error } = await supabase.from('nutri_settings').select('key').limit(1);
    checks.supabase = {
      status: error ? 'error' : 'ok',
      latency_ms: Date.now() - sbStart,
    };
  } catch {
    checks.supabase = { status: 'error', latency_ms: Date.now() - sbStart };
  }

  // OpenAI key
  checks.openai_key = { status: process.env.OPENAI_API_KEY ? 'ok' : 'error' };

  // MAX token
  checks.max_token = { status: process.env.MAX_BOT_TOKEN ? 'ok' : 'error' };

  // Error rate last hour
  let errorsHour = 0;
  try {
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabase
      .from('nutri_error_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hourAgo);
    errorsHour = count ?? 0;
  } catch { /* ignore */ }
  checks.error_rate_1h = {
    status: errorsHour > 50 ? 'warning' : 'ok',
    count: errorsHour,
    threshold: 50,
  };

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  let stats = { total_users: 0, dau: 0, messages_today: 0, errors_today: 0 };

  try {
    const [totalRes, dauRes, msgRes, errRes] = await Promise.all([
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }),
      supabase.from('nutri_users').select('*', { count: 'exact', head: true }).gte('updated_at', today),
      supabase.from('nutri_messages').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('nutri_error_log').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);
    stats = {
      total_users: totalRes.count ?? 0,
      dau: dauRes.count ?? 0,
      messages_today: msgRes.count ?? 0,
      errors_today: errRes.count ?? 0,
    };
  } catch { /* best effort */ }

  const healthy = checks.supabase?.status === 'ok' && checks.openai_key?.status === 'ok' && checks.max_token?.status === 'ok';

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    version: '2.0.0',
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
    checks,
    stats,
    timestamp: new Date().toISOString(),
  });
}
