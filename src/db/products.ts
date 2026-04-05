import { supabase } from './supabase.js';
import type { NutriProduct, NutriDeficiencyMap } from '../max/types.js';

export async function getAllProducts(): Promise<NutriProduct[]> {
  const { data } = await supabase
    .from('nutri_moonvit_products')
    .select('*')
    .eq('active', true)
    .order('name');
  return data || [];
}

export async function getProductBySlug(slug: string): Promise<NutriProduct | null> {
  const { data } = await supabase
    .from('nutri_moonvit_products')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

export async function getDeficiencyProducts(deficiencyKey: string): Promise<(NutriDeficiencyMap & { product?: NutriProduct })[]> {
  const { data: maps } = await supabase
    .from('nutri_deficiency_map')
    .select('*')
    .eq('deficiency_key', deficiencyKey)
    .order('priority');
  if (!maps?.length) return [];

  const slugs = maps.map(m => m.product_slug).filter(Boolean);
  const { data: products } = await supabase
    .from('nutri_moonvit_products')
    .select('*')
    .in('slug', slugs);

  const productMap = new Map((products || []).map(p => [p.slug, p]));
  return maps.map(m => ({
    ...m,
    product: m.product_slug ? productMap.get(m.product_slug) || undefined : undefined,
  }));
}

export async function upsertProduct(product: Partial<NutriProduct> & { slug: string }) {
  const { error } = await supabase
    .from('nutri_moonvit_products')
    .upsert({ ...product, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  if (error) throw error;
}

export async function getAllDeficiencies(): Promise<NutriDeficiencyMap[]> {
  const { data } = await supabase
    .from('nutri_deficiency_map')
    .select('*')
    .order('deficiency_key, priority');
  return data || [];
}
