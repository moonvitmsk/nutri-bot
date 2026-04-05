import { supabase } from './supabase.js';
import type { NutriFoodLog } from '../max/types.js';

export async function saveFoodLog(userId: string, data: Partial<NutriFoodLog>): Promise<NutriFoodLog> {
  const { data: row, error } = await supabase
    .from('nutri_food_logs')
    .insert({ user_id: userId, ...data })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function confirmFoodLog(id: string) {
  return supabase.from('nutri_food_logs').update({ confirmed: true }).eq('id', id);
}

export async function deleteFoodLog(id: string, userId: string) {
  return supabase.from('nutri_food_logs').delete().eq('id', id).eq('user_id', userId);
}

export async function getTodayLogs(userId: string): Promise<NutriFoodLog[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('nutri_food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .gte('created_at', today)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getWeekLogs(userId: string): Promise<NutriFoodLog[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('nutri_food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getLastUnconfirmed(userId: string): Promise<NutriFoodLog | null> {
  const { data } = await supabase
    .from('nutri_food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('confirmed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function deleteUnconfirmedLogs(userId: string) {
  await supabase.from('nutri_food_logs').delete().eq('user_id', userId).eq('confirmed', false);
}

export async function getPrevWeekLogs(userId: string): Promise<NutriFoodLog[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('nutri_food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .gte('created_at', twoWeeksAgo)
    .lt('created_at', weekAgo)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function updateFoodLog(id: string, data: Partial<NutriFoodLog>) {
  return supabase.from('nutri_food_logs').update(data).eq('id', id);
}

export async function getPhotosToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('nutri_food_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('photo_url', 'is', null)
    .gte('created_at', today);
  return count || 0;
}
