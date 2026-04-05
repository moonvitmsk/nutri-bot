import { supabase } from './supabase.js';
import type { NutriMessage } from '../max/types.js';

export async function saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, tokensUsed?: number) {
  const { data, error } = await supabase
    .from('nutri_messages')
    .insert({ user_id: userId, role, content, tokens_used: tokensUsed || null })
    .select()
    .single();
  if (error) throw error;
  return data as NutriMessage;
}

export async function getRecentMessages(userId: string, limit = 10): Promise<NutriMessage[]> {
  const { data } = await supabase
    .from('nutri_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

export async function getMessageCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('nutri_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

export async function deleteUserMessages(userId: string) {
  await supabase.from('nutri_messages').delete().eq('user_id', userId);
}

export async function getMessagesToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('nutri_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', today);
  return count || 0;
}
