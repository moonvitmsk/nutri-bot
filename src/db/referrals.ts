// H-3: Referral system
import { supabase } from './supabase.js';
import { updateUser } from './users.js';

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

  // Reward both: +7 days premium
  const premiumDays = 7;
  for (const uid of [referrer.id, referredUserId]) {
    const { data: u } = await supabase.from('nutri_users').select('premium_until').eq('id', uid).single();
    const currentEnd = u?.premium_until ? new Date(u.premium_until) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    base.setDate(base.getDate() + premiumDays);

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

export async function getReferralStats(userId: string): Promise<{ total: number; activated: number }> {
  const { count: total } = await supabase
    .from('nutri_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const { count: activated } = await supabase
    .from('nutri_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('reward_given', true);

  return { total: total || 0, activated: activated || 0 };
}
