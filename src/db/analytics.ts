// J-1: Onboarding funnel tracking
import { supabase } from './supabase.js';

export type FunnelEvent =
  | 'bot_started'
  | 'wow_photo_sent'
  | 'profile_mode_selected'
  | 'name_entered'
  | 'sex_selected'
  | 'age_entered'
  | 'height_entered'
  | 'weight_entered'
  | 'goal_selected'
  | 'onboarding_completed'
  | 'first_food_photo'
  | 'phone_shared'
  | 'skip_to_profile';

export async function trackFunnelEvent(userId: string, event: FunnelEvent, meta?: Record<string, unknown>) {
  try {
    await supabase.from('nutri_funnel_events').insert({
      user_id: userId,
      event,
      meta: meta || null,
    });
  } catch (err) {
    console.error('Funnel tracking error:', err);
  }
}

export async function getFunnelStats() {
  const { data } = await supabase
    .from('nutri_funnel_events')
    .select('event')
    .order('created_at', { ascending: false });

  if (!data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.event] = (counts[row.event] || 0) + 1;
  }
  return counts;
}
