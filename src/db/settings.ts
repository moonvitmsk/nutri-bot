import { supabase } from './supabase.js';
import type { NutriSetting } from '../max/types.js';

const cache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL = 60_000; // 1 min

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const { data } = await supabase
    .from('nutri_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (data) {
    cache.set(key, { value: data.value, expires: Date.now() + CACHE_TTL });
    return data.value;
  }
  return null;
}

export async function setSetting(key: string, value: string, description?: string) {
  cache.delete(key);
  const { error } = await supabase
    .from('nutri_settings')
    .upsert({
      key,
      value,
      description: description || undefined,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function getAllSettings(): Promise<NutriSetting[]> {
  const { data } = await supabase
    .from('nutri_settings')
    .select('*')
    .order('key');
  return data || [];
}
