// C-2: Пайплайн витаминного анализа
// Фото → Vision (идентификация) → lookup в nutri_nutrient_db → расчёт витаминов

import { supabase } from '../db/supabase.js';
import { DAILY_NORMS_RU, getDailyNorm, getNutrientStatus, formatNutrientStatus } from '../config/daily-norms-ru.js';
import { getRecommendation } from '../config/moonvit-deficiency-map.js';
import type { NutriUser } from '../max/types.js';

interface FoodItem {
  name: string;
  weight_grams: number;
}

interface NutrientProfile {
  [key: string]: number;
}

// Lookup food items in nutri_nutrient_db, return aggregated micronutrients
export async function lookupNutrients(items: FoodItem[]): Promise<NutrientProfile> {
  const totals: NutrientProfile = {};

  for (const item of items) {
    // Full-text search in Russian
    const { data } = await supabase
      .from('nutri_nutrient_db')
      .select('micronutrients, calories, protein, fat, carbs')
      .textSearch('food_name_ru', item.name.split(' ').join(' & '), { type: 'plain' })
      .limit(1);

    if (!data?.length) {
      // Fallback: ILIKE search
      const { data: fallback } = await supabase
        .from('nutri_nutrient_db')
        .select('micronutrients')
        .ilike('food_name_ru', `%${item.name.split(' ')[0]}%`)
        .limit(1);
      if (fallback?.length) {
        accumulateNutrients(totals, fallback[0].micronutrients as Record<string, number>, item.weight_grams);
      }
      continue;
    }

    accumulateNutrients(totals, data[0].micronutrients as Record<string, number>, item.weight_grams);
  }

  return totals;
}

function accumulateNutrients(totals: NutrientProfile, micro: Record<string, number>, weightG: number) {
  // DB stores per 100g, scale by actual weight
  const scale = weightG / 100;
  for (const [key, value] of Object.entries(micro)) {
    if (typeof value === 'number') {
      totals[key] = (totals[key] || 0) + Math.round(value * scale * 100) / 100;
    }
  }
}

// Get today's accumulated nutrients for a user
export async function getTodayNutrients(userId: string): Promise<NutrientProfile> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('nutri_food_logs')
    .select('ai_analysis')
    .eq('user_id', userId)
    .gte('created_at', today)
    .eq('confirmed', true);

  const totals: NutrientProfile = {};
  if (!data) return totals;

  for (const log of data) {
    const micro = (log.ai_analysis as any)?.micronutrients;
    if (micro && typeof micro === 'object') {
      for (const [key, value] of Object.entries(micro)) {
        if (typeof value === 'number') {
          totals[key] = (totals[key] || 0) + value;
        }
      }
    }
  }

  return totals;
}

// C-5: Format evening vitamin summary
export function formatVitaminSummary(nutrients: NutrientProfile, sex: 'male' | 'female' | null): string {
  const lines: string[] = ['Витамины и минералы за сегодня:'];
  const deficiencies: string[] = [];

  // Check key nutrients
  const keyNutrients = [
    'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e',
    'vitamin_b1', 'vitamin_b2', 'vitamin_b6', 'vitamin_b12',
    'vitamin_b9', 'iron', 'calcium', 'magnesium', 'zinc', 'selenium', 'fiber',
  ];

  for (const key of keyNutrients) {
    const norm = DAILY_NORMS_RU[key];
    if (!norm) continue;

    const amount = nutrients[key] || 0;
    const dailyNorm = getDailyNorm(key, sex);
    const pct = dailyNorm > 0 ? Math.round((amount / dailyNorm) * 100) : 0;
    const status = getNutrientStatus(key, amount, sex);
    const icon = formatNutrientStatus(status);

    lines.push(`${icon} ${norm.name}: ${Math.round(amount * 10) / 10} ${norm.unit} (${pct}% нормы)`);

    if (status === 'deficient' || status === 'low') {
      deficiencies.push(key);
    }
  }

  // C-6: Add recommendations for deficiencies
  if (deficiencies.length > 0) {
    lines.push('');
    lines.push('Рекомендации:');
    for (const def of deficiencies.slice(0, 3)) {
      const rec = getRecommendation(def);
      if (rec.moonvit) {
        const buyLink = rec.moonvit.purchase_url ? ` → ${rec.moonvit.purchase_url}` : '';
        lines.push(`- ${rec.moonvit.product}: ${rec.moonvit.reason}${buyLink}`);
      }
      if (rec.food) {
        lines.push(`- ${rec.food}`);
      }
    }
  }

  return lines.join('\n');
}
