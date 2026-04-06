/**
 * Seed script for nutri_nutrient_db
 * Inserts basic nutrient data for common Russian foods.
 *
 * The table schema used by src/services/vitamin-tracker.ts:
 *   food_name_ru  text (full-text indexed)
 *   calories      numeric
 *   protein       numeric
 *   fat           numeric
 *   carbs         numeric
 *   micronutrients jsonb   — per 100 g
 *
 * Run with: npx tsx scripts/seed-nutrient-db.ts
 */

interface NutrientRow {
  food_name_ru: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  micronutrients: Record<string, number>;
}

const NUTRIENTS: NutrientRow[] = [
  {
    food_name_ru: 'Гречка',
    calories: 343, protein: 13.3, fat: 3.4, carbs: 68,
    micronutrients: { vitamin_b1: 0.43, vitamin_b6: 0.4, iron: 6.7, magnesium: 200, zinc: 2.0 },
  },
  {
    food_name_ru: 'Овсянка',
    calories: 342, protein: 12.3, fat: 6.1, carbs: 59,
    micronutrients: { vitamin_b1: 0.49, iron: 3.6, magnesium: 116, zinc: 2.5 },
  },
  {
    food_name_ru: 'Творог 5%',
    calories: 121, protein: 17.2, fat: 5.0, carbs: 1.8,
    micronutrients: { vitamin_b2: 0.3, vitamin_b12: 1.0, calcium: 164, phosphorus: 220 },
  },
  {
    food_name_ru: 'Куриная грудка',
    calories: 165, protein: 31.0, fat: 3.6, carbs: 0,
    micronutrients: { vitamin_b6: 0.6, vitamin_b12: 0.3, zinc: 1.0, selenium: 27 },
  },
  {
    food_name_ru: 'Яйцо куриное',
    calories: 157, protein: 12.7, fat: 10.6, carbs: 1.1,
    micronutrients: { vitamin_a: 160, vitamin_d: 2.0, vitamin_b12: 1.8, iron: 1.8, selenium: 30 },
  },
  {
    food_name_ru: 'Лосось',
    calories: 208, protein: 20.4, fat: 13.4, carbs: 0,
    micronutrients: { vitamin_d: 11.0, vitamin_b12: 3.2, omega3: 2.0, selenium: 37 },
  },
  {
    food_name_ru: 'Капуста белокочанная',
    calories: 25, protein: 1.3, fat: 0.1, carbs: 4.7,
    micronutrients: { vitamin_c: 45, vitamin_k: 76, vitamin_b9: 43 },
  },
  {
    food_name_ru: 'Свёкла',
    calories: 43, protein: 1.6, fat: 0.1, carbs: 8.8,
    micronutrients: { iron: 0.8, vitamin_b9: 109, manganese: 0.33 },
  },
  {
    food_name_ru: 'Банан',
    calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8,
    micronutrients: { vitamin_b6: 0.42, vitamin_c: 8.7, potassium: 358, magnesium: 27 },
  },
  {
    food_name_ru: 'Яблоко',
    calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8,
    micronutrients: { vitamin_c: 4.6, potassium: 107 },
  },
  {
    food_name_ru: 'Кефир 2.5%',
    calories: 50, protein: 2.8, fat: 2.5, carbs: 3.8,
    micronutrients: { vitamin_b2: 0.17, vitamin_b12: 0.4, calcium: 120 },
  },
  {
    food_name_ru: 'Хлеб ржаной',
    calories: 210, protein: 6.8, fat: 1.2, carbs: 41.8,
    micronutrients: { vitamin_b1: 0.18, iron: 3.3, fiber: 5.8 },
  },
  {
    food_name_ru: 'Рис белый',
    calories: 130, protein: 2.7, fat: 0.3, carbs: 28,
    micronutrients: { vitamin_b1: 0.07, manganese: 0.5 },
  },
  {
    food_name_ru: 'Картофель',
    calories: 77, protein: 2.0, fat: 0.1, carbs: 17,
    micronutrients: { vitamin_c: 20, vitamin_b6: 0.3, potassium: 421 },
  },
  {
    food_name_ru: 'Молоко 2.5%',
    calories: 52, protein: 2.8, fat: 2.5, carbs: 4.7,
    micronutrients: { vitamin_d: 0.05, vitamin_b2: 0.17, calcium: 120 },
  },
  {
    food_name_ru: 'Говядина',
    calories: 250, protein: 26.0, fat: 16.0, carbs: 0,
    micronutrients: { vitamin_b12: 2.5, iron: 2.6, zinc: 6.3 },
  },
  {
    food_name_ru: 'Брокколи',
    calories: 34, protein: 2.8, fat: 0.4, carbs: 7,
    micronutrients: { vitamin_c: 89, vitamin_k: 102, vitamin_b9: 63 },
  },
  {
    food_name_ru: 'Тунец консервированный',
    calories: 116, protein: 26.0, fat: 0.8, carbs: 0,
    micronutrients: { vitamin_d: 5.7, vitamin_b12: 2.2, selenium: 80 },
  },
  {
    food_name_ru: 'Миндаль',
    calories: 576, protein: 21.0, fat: 49.9, carbs: 21.6,
    micronutrients: { vitamin_e: 25.6, magnesium: 270, calcium: 252 },
  },
  {
    food_name_ru: 'Шпинат',
    calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6,
    micronutrients: { vitamin_a: 469, vitamin_c: 28, iron: 2.7, magnesium: 79 },
  },
];

console.log('Nutrient DB seed data prepared.');
console.log(`${NUTRIENTS.length} products ready for insertion.`);
console.log('');
console.log('All values are per 100 g (matches vitamin-tracker.ts scale logic).');
console.log('To insert, uncomment the Supabase section below and run:');
console.log('  npx tsx scripts/seed-nutrient-db.ts');

// Uncomment to actually insert:
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
// (async () => {
//   for (const row of NUTRIENTS) {
//     const { error } = await supabase
//       .from('nutri_nutrient_db')
//       .upsert(row, { onConflict: 'food_name_ru' });
//     if (error) console.error(`Error inserting ${row.food_name_ru}:`, error.message);
//     else console.log(`  ✓ ${row.food_name_ru}`);
//   }
//   console.log('Done.');
// })();
