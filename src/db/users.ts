import { supabase } from './supabase.js';
import type { NutriUser } from '../max/types.js';

export async function findUserByMaxId(maxUserId: number): Promise<NutriUser | null> {
  const { data, error } = await supabase
    .from('nutri_users')
    .select('*')
    .eq('max_user_id', maxUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('findUserByMaxId error:', maxUserId, error.message);
    return null;
  }
  return data;
}

export async function createUser(maxUserId: number, chatId: number, name?: string): Promise<NutriUser> {
  // Upsert to prevent duplicates — if user already exists, update chat_id and name
  const { data, error } = await supabase
    .from('nutri_users')
    .upsert(
      { max_user_id: maxUserId, max_chat_id: chatId, name: name || null },
      { onConflict: 'max_user_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(id: string, updates: Partial<NutriUser>): Promise<NutriUser> {
  const { data, error } = await supabase
    .from('nutri_users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setContextState(id: string, state: string) {
  return updateUser(id, { context_state: state } as any);
}

export async function incrementMessagesToday(id: string) {
  // Atomic increment to avoid race conditions
  try {
    const { error } = await supabase.rpc('increment_field', { user_uuid: id, field_name: 'messages_today' });
    if (error) throw error;
  } catch {
    // Fallback if RPC not available
    const user = await findUserById(id);
    if (!user) return;
    await updateUser(id, { messages_today: user.messages_today + 1 } as any);
  }
}

export async function findUserById(id: string): Promise<NutriUser | null> {
  const { data } = await supabase
    .from('nutri_users')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function updateStreak(user: import('../max/types.js').NutriUser): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];
  const last = user.last_food_date;

  if (last === today) return null; // already recorded today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = last === yesterday ? (user.streak_days || 0) + 1 : 1;

  await updateUser(user.id, { streak_days: newStreak, last_food_date: today } as any);

  if (newStreak === 3) return `🔥 3 дня подряд! Отличный старт — ты формируешь полезную привычку!`;
  if (newStreak === 7) return `🏆 7 дней подряд! Целая неделя заботы о себе — так держать!`;
  if (newStreak === 14) return `💪 2 недели подряд! Ты настоящий чемпион по здоровому питанию!`;
  if (newStreak === 30) return `🌟 30 дней! Месяц осознанного питания — это уже образ жизни!`;
  if (newStreak > 1 && newStreak % 10 === 0) return `🔥 ${newStreak} дней подряд! Продолжай в том же духе!`;
  return null;
}

export async function resetDailyCounters() {
  await supabase
    .from('nutri_users')
    .update({ messages_today: 0, photos_today: 0, water_glasses: 0 })
    .or('messages_today.gt.0,photos_today.gt.0,water_glasses.gt.0');
}

export async function deleteUserData(id: string) {
  // L-5 + 152-ФЗ: Full deletion from ALL tables
  const { data: user } = await supabase.from('nutri_users').select('max_user_id').eq('id', id).single();
  const maxUserId = user?.max_user_id || 0;

  // All tables that may contain user data
  const tables = [
    'nutri_messages',
    'nutri_food_logs',
    'nutri_lab_results',
    'nutri_deep_consults',
    'nutri_funnel_events',
    'nutri_user_preferences',
    'nutri_user_achievements',
    'nutri_user_xp',
    'nutri_streaks',
    'nutri_user_challenges',
    'nutri_ab_assignments',
    'nutri_ab_tests',
    'nutri_referrals',
    'nutri_daily_aggregates',
    'nutri_quality_scores',
    'nutri_user_context',
    'nutri_ai_metrics',
    'nutri_error_log',
  ];

  const clearedTables: string[] = [];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', id);
    if (!error) clearedTables.push(table);
  }

  // Also clear referrals where user is referrer
  await supabase.from('nutri_referrals').delete().eq('referrer_id', id);

  // Delete user record last
  await supabase.from('nutri_users').delete().eq('id', id);
  clearedTables.push('nutri_users');

  // Log deletion (no PII, just fact and date)
  try {
    await supabase.from('nutri_deletion_log').insert({
      deleted_at: new Date().toISOString(),
      tables_cleaned: clearedTables.length,
    });
  } catch {
    // Don't fail on log insert
  }
}

export async function listUsers(opts: { limit?: number; offset?: number; subscription?: string }) {
  let q = supabase
    .from('nutri_users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 50) - 1);
  if (opts.subscription) q = q.eq('subscription_type', opts.subscription);
  return q;
}

export async function getUserStats() {
  const { count: total } = await supabase.from('nutri_users').select('*', { count: 'exact', head: true });
  const today = new Date().toISOString().split('T')[0];
  const { count: activeToday } = await supabase
    .from('nutri_users')
    .select('*', { count: 'exact', head: true })
    .gte('last_active_at', today);
  const { count: trial } = await supabase
    .from('nutri_users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_type', 'trial');
  const { count: premium } = await supabase
    .from('nutri_users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_type', 'premium');
  return { total: total || 0, activeToday: activeToday || 0, trial: trial || 0, premium: premium || 0 };
}
