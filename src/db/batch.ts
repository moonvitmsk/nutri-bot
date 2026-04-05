import { supabase } from './supabase.js';

export interface UserFullProfile {
  id: string;
  max_user_id: number;
  max_chat_id: number;
  name: string | null;
  age: number | null;
  sex: string | null;
  phone: string | null;
  subscription_type: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  context_state: string | null;
  messages_today: number;
  photos_today: number;
  streak_days: number;
  free_analyses_used: number;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string | null;
  last_active_at: string | null;
}

/**
 * Get user full profile in a single query.
 * Replaces separate getUser + getSubscription + getPreferences calls.
 */
export async function getUserFullProfile(userId: string): Promise<UserFullProfile | null> {
  const { data, error } = await supabase
    .from('nutri_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserFullProfile;
}

/**
 * Update multiple user activity fields in a single UPSERT.
 * Replaces separate updateStreak + addXP + incrementPhotos calls.
 */
export async function updateUserActivity(
  userId: string,
  updates: Partial<{
    messages_today: number;
    photos_today: number;
    streak_days: number;
    free_analyses_used: number;
    last_active_at: string;
    updated_at: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('nutri_users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[batch] updateUserActivity failed:', error.message);
  }
}

/**
 * Batch insert rows into any table.
 * Replaces insert-in-loop patterns.
 */
export async function batchInsert(
  table: string,
  rows: Record<string, any>[]
): Promise<{ count: number; error: string | null }> {
  if (rows.length === 0) return { count: 0, error: null };

  const { error } = await supabase.from(table).insert(rows);
  return {
    count: error ? 0 : rows.length,
    error: error?.message ?? null,
  };
}
