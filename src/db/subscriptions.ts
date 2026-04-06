import { supabase } from './supabase.js';
import { updateUser } from './users.js';
import { config } from '../config.js';
import type { NutriUser, NutriQrCode } from '../max/types.js';

export function getSubscriptionStatus(user: NutriUser): 'free' | 'trial' | 'premium' {
  if (user.subscription_type === 'premium') {
    if (user.premium_until && new Date(user.premium_until) > new Date()) return 'premium';
    return 'free';
  }
  if (user.subscription_type === 'trial') {
    const trialEnd = new Date(user.trial_started_at);
    trialEnd.setDate(trialEnd.getDate() + config.freeTrialDays);
    if (trialEnd > new Date()) return 'trial';
    return 'free';
  }
  return 'free';
}

// Photo limits: 5/day free, 10/day trial, 20/day premium
const FREE_PHOTOS_PER_DAY = 5;

export function canUseFeature(user: NutriUser, feature: 'chat' | 'photo' | 'lab' | 'deepcheck'): boolean {
  const sub = getSubscriptionStatus(user);
  switch (feature) {
    case 'chat':
      if (sub === 'free') return user.messages_today < config.limits.freeMessagesPerDay;
      return true;
    case 'photo':
      if (sub === 'free') return user.photos_today < FREE_PHOTOS_PER_DAY;
      if (sub === 'trial') return user.photos_today < config.limits.trialPhotosPerDay;
      return user.photos_today < config.limits.premiumPhotosPerDay;
    case 'lab':
      return sub === 'premium' || sub === 'trial';
    case 'deepcheck':
      return sub === 'trial' || sub === 'premium';
  }
}

export function getPhotosRemaining(user: NutriUser): number {
  const sub = getSubscriptionStatus(user);
  if (sub === 'free') return Math.max(0, FREE_PHOTOS_PER_DAY - user.photos_today);
  if (sub === 'trial') return Math.max(0, config.limits.trialPhotosPerDay - user.photos_today);
  return Math.max(0, config.limits.premiumPhotosPerDay - user.photos_today);
}

export function needsPhoneSharing(user: NutriUser): boolean {
  const sub = getSubscriptionStatus(user);
  return sub === 'free' && user.photos_today >= FREE_PHOTOS_PER_DAY;
}

export async function activateQrCode(userId: string, qrCode: string): Promise<{ success: boolean; message: string }> {
  const { data: qr } = await supabase
    .from('nutri_qr_codes')
    .select('*')
    .eq('code', qrCode)
    .single();

  if (!qr) return { success: false, message: 'QR-код не найден в базе.' };
  if (qr.activated_by) return { success: false, message: 'Этот QR-код уже использован.' };

  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + 30);

  await supabase
    .from('nutri_qr_codes')
    .update({ activated_by: userId, activated_at: new Date().toISOString() })
    .eq('id', qr.id);

  await updateUser(userId, {
    subscription_type: 'premium',
    premium_until: premiumUntil.toISOString(),
  } as any);

  return { success: true, message: `Premium активирован до ${premiumUntil.toLocaleDateString('ru-RU')}!` };
}

export async function generateQrCodes(count: number, sku: string, batchId: string): Promise<NutriQrCode[]> {
  const codes = Array.from({ length: count }, () => ({
    code: `MV-${sku.toUpperCase()}-${randomCode(8)}`,
    sku,
    batch_id: batchId,
  }));
  const { data, error } = await supabase
    .from('nutri_qr_codes')
    .insert(codes)
    .select();
  if (error) throw error;
  return data;
}

function randomCode(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// H-2: Promo code activation
export async function activatePromoCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
  const { data: promo } = await supabase
    .from('nutri_promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (!promo) return { success: false, message: 'Промо-код не найден.' };
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) return { success: false, message: 'Промо-код уже использован максимальное число раз.' };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { success: false, message: 'Промо-код истёк.' };

  const days = promo.days || 7;
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + days);

  await supabase
    .from('nutri_promo_codes')
    .update({ used_count: promo.used_count + 1 })
    .eq('id', promo.id);

  await updateUser(userId, {
    subscription_type: 'premium',
    premium_until: premiumUntil.toISOString(),
  } as any);

  return { success: true, message: `Premium активирован на ${days} дней (до ${premiumUntil.toLocaleDateString('ru-RU')})!` };
}

export async function getQrStats() {
  const { count: total } = await supabase.from('nutri_qr_codes').select('*', { count: 'exact', head: true });
  const { count: activated } = await supabase
    .from('nutri_qr_codes')
    .select('*', { count: 'exact', head: true })
    .not('activated_by', 'is', null);
  return { total: total || 0, activated: activated || 0, remaining: (total || 0) - (activated || 0) };
}
