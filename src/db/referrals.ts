// H-3: Referral system with level-based rewards
import { supabase } from './supabase.js';
import { updateUser } from './users.js';

export type ReferralLevel = 'bronze' | 'silver' | 'gold';

export function getReferralLevel(totalReferrals: number): { level: ReferralLevel; name: string; next: number; reward: string } {
  if (totalReferrals >= 20) return { level: 'gold', name: '\u{1F947} Золото', next: 0, reward: '+30 дней Premium за каждого' };
  if (totalReferrals >= 10) return { level: 'silver', name: '\u{1F948} Серебро', next: 20 - totalReferrals, reward: '+14 дней Premium за каждого' };
  if (totalReferrals >= 3) return { level: 'bronze', name: '\u{1F949} Бронза', next: 10 - totalReferrals, reward: '+7 дней Premium за каждого' };
  return { level: 'bronze', name: 'Новичок', next: 3 - totalReferrals, reward: '+7 дней Premium за каждого' };
}

export function getReferralPremiumDays(level: ReferralLevel): number {
  switch (level) {
    case 'gold': return 30;
    case 'silver': return 14;
    case 'bronze': return 7;
  }
}

export async function createReferralLink(userId: string, maxUserId: number): Promise<string> {
  return `https://max.ru/moonvit_bot?startapp=ref_${maxUserId}`;
}

export async function processReferral(referrerMaxId: number, referredUserId: string, referredMaxId: number): Promise<boolean> {
  // Find referrer
  const { data: referrer } = await supabase
    .from('nutri_users')
    .select('id')
    .eq('max_user_id', referrerMaxId)
    .single();

  if (!referrer) return false;

  // Check if already referred
  const { data: existing } = await supabase
    .from('nutri_referrals')
    .select('id')
    .eq('referred_max_id', referredMaxId)
    .single();

  if (existing) return false; // Already referred

  // Create referral record
  await supabase.from('nutri_referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    referrer_max_id: referrerMaxId,
    referred_max_id: referredMaxId,
  });

  // Get referrer's total referrals to determine level
  const { count: referrerTotal } = await supabase
    .from('nutri_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id);

  const { level } = getReferralLevel(referrerTotal || 0);
  const premiumDays = getReferralPremiumDays(level);

  // Reward referrer with level-based days, referred always gets 7
  for (const [uid, days] of [[referrer.id, premiumDays], [referredUserId, 7]] as [string, number][]) {
    const { data: u } = await supabase.from('nutri_users').select('premium_until').eq('id', uid).single();
    const currentEnd = u?.premium_until ? new Date(u.premium_until) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    base.setDate(base.getDate() + days);

    await updateUser(uid, {
      subscription_type: 'premium',
      premium_until: base.toISOString(),
    } as any);
  }

  // Mark reward as given
  await supabase.from('nutri_referrals')
    .update({ reward_given: true })
    .eq('referred_max_id', referredMaxId);

  return true;
}

export async function getReferralStats(userId: string): Promise<{ total: number; activated: number; level: ReturnType<typeof getReferralLevel> }> {
  const { count: total } = await supabase
    .from('nutri_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const { count: activated } = await supabase
    .from('nutri_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('reward_given', true);

  return { total: total || 0, activated: activated || 0, level: getReferralLevel(total || 0) };
}
