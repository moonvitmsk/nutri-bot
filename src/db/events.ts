// User behavior event tracking - all actions, screens, features
import { supabase } from './supabase.js';

export type EventCategory = 'command' | 'action' | 'feature' | 'screen' | 'error' | 'conversion';

export async function trackEvent(
  userId: string,
  event: string,
  category: EventCategory = 'action',
  meta?: Record<string, unknown>,
  screen?: string,
) {
  try {
    await supabase.from('nutri_user_events').insert({
      user_id: userId,
      event,
      category,
      meta: meta || null,
      screen: screen || null,
    });
  } catch {
    // silent - never break user flow for analytics
  }
}

// Convenience wrappers
export const trackCommand = (userId: string, cmd: string, meta?: Record<string, unknown>) =>
  trackEvent(userId, cmd, 'command', meta);

export const trackFeature = (userId: string, feature: string, meta?: Record<string, unknown>) =>
  trackEvent(userId, feature, 'feature', meta);

export const trackScreen = (userId: string, screen: string) =>
  trackEvent(userId, `view_${screen}`, 'screen', undefined, screen);

export const trackConversion = (userId: string, action: string, meta?: Record<string, unknown>) =>
  trackEvent(userId, action, 'conversion', meta);

// Analytics queries
export async function getEventStats(days: number = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('nutri_user_events')
    .select('event, category, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  return data || [];
}

export async function getTopEvents(days: number = 7, limit: number = 20) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .rpc('nutri_top_events', { since_date: since, max_count: limit })
    .single();
  // Fallback: manual aggregation if RPC doesn't exist
  if (!data) {
    const events = await getEventStats(days);
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([event, count]) => ({ event, count }));
  }
  return data;
}

export async function getUserJourney(userId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('nutri_user_events')
    .select('event, category, meta, screen, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500);
  return data || [];
}
