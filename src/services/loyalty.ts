import { supabase } from '../db/supabase.js';

export const POINTS = {
  log_food: 10,
  log_photo: 20,
  streak_7: 100,
  streak_30: 500,
  referral: 200,
  complete_profile: 50,
  first_recipe: 30,
  first_mealplan: 30,
} as const;

export async function addPoints(userId: string, action: keyof typeof POINTS, extra?: number): Promise<number> {
  const points = extra || POINTS[action];

  const { data } = await supabase.rpc('increment_points', {
    p_user_id: userId,
    p_points: points,
    p_action: action,
  }).single();

  // Fallback if RPC doesn't exist
  if (!data) {
    const { data: user } = await supabase
      .from('nutri_users')
      .select('loyalty_points')
      .eq('id', userId)
      .single();

    const newPoints = (user?.loyalty_points || 0) + points;
    await supabase.from('nutri_users').update({ loyalty_points: newPoints }).eq('id', userId);

    // Log the action
    await supabase.from('nutri_loyalty_log').insert({
      user_id: userId,
      action,
      points,
    }).then(() => {}, () => {}); // Table may not exist yet

    return newPoints;
  }

  return (data as any).new_total || 0;
}

export function getRewardTier(points: number): { tier: string; discount: number; next: number; nextTier: string } {
  if (points >= 5000) return { tier: 'Платиновый', discount: 20, next: 0, nextTier: 'Максимум!' };
  if (points >= 2000) return { tier: 'Золотой', discount: 15, next: 5000 - points, nextTier: 'Платиновый' };
  if (points >= 500) return { tier: 'Серебряный', discount: 10, next: 2000 - points, nextTier: 'Золотой' };
  return { tier: 'Бронзовый', discount: 5, next: 500 - points, nextTier: 'Серебряный' };
}
