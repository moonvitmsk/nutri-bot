// C-4: Рекомендуемые суточные нормы витаминов и минералов
// Источник: МР 2.3.1.0253-21 (Россия)
// Для взрослых 18+ лет

export interface DailyNorm {
  name: string;
  unit: string;
  male: number;
  female: number;
}

export const DAILY_NORMS_RU: Record<string, DailyNorm> = {
  // Витамины
  vitamin_a: { name: 'Витамин A', unit: 'мкг', male: 900, female: 800 },
  vitamin_b1: { name: 'Витамин B1', unit: 'мг', male: 1.5, female: 1.3 },
  vitamin_b2: { name: 'Витамин B2', unit: 'мг', male: 1.8, female: 1.6 },
  vitamin_b3: { name: 'Витамин B3 (PP)', unit: 'мг', male: 20, female: 18 },
  vitamin_b5: { name: 'Витамин B5', unit: 'мг', male: 5, female: 5 },
  vitamin_b6: { name: 'Витамин B6', unit: 'мг', male: 2.0, female: 1.8 },
  vitamin_b7: { name: 'Биотин (B7)', unit: 'мкг', male: 50, female: 50 },
  vitamin_b9: { name: 'Фолиевая кислота (B9)', unit: 'мкг', male: 400, female: 400 },
  vitamin_b12: { name: 'Витамин B12', unit: 'мкг', male: 3.0, female: 3.0 },
  vitamin_c: { name: 'Витамин C', unit: 'мг', male: 100, female: 90 },
  vitamin_d: { name: 'Витамин D', unit: 'мкг', male: 15, female: 15 },
  vitamin_e: { name: 'Витамин E', unit: 'мг', male: 15, female: 12 },
  vitamin_k: { name: 'Витамин K', unit: 'мкг', male: 120, female: 100 },

  // Минералы
  calcium: { name: 'Кальций', unit: 'мг', male: 1000, female: 1000 },
  iron: { name: 'Железо', unit: 'мг', male: 10, female: 18 },
  magnesium: { name: 'Магний', unit: 'мг', male: 400, female: 350 },
  zinc: { name: 'Цинк', unit: 'мг', male: 12, female: 10 },
  selenium: { name: 'Селен', unit: 'мкг', male: 70, female: 55 },
  iodine: { name: 'Йод', unit: 'мкг', male: 150, female: 150 },
  phosphorus: { name: 'Фосфор', unit: 'мг', male: 800, female: 800 },
  potassium: { name: 'Калий', unit: 'мг', male: 2500, female: 2500 },
  chromium: { name: 'Хром', unit: 'мкг', male: 50, female: 50 },
  manganese: { name: 'Марганец', unit: 'мг', male: 2.0, female: 2.0 },
  copper: { name: 'Медь', unit: 'мг', male: 1.0, female: 1.0 },
  fiber: { name: 'Клетчатка', unit: 'г', male: 25, female: 25 },
};

export function getDailyNorm(nutrientKey: string, sex: 'male' | 'female' | null): number {
  const norm = DAILY_NORMS_RU[nutrientKey];
  if (!norm) return 0;
  return norm[sex || 'male'];
}

export function getNutrientStatus(
  nutrientKey: string,
  amount: number,
  sex: 'male' | 'female' | null,
): 'deficient' | 'low' | 'normal' | 'excess' {
  const norm = getDailyNorm(nutrientKey, sex);
  if (norm === 0) return 'normal';
  const pct = amount / norm;
  if (pct < 0.5) return 'deficient';
  if (pct < 0.8) return 'low';
  if (pct <= 2.0) return 'normal';
  return 'excess';
}

export function formatNutrientStatus(status: 'deficient' | 'low' | 'normal' | 'excess'): string {
  switch (status) {
    case 'deficient': return '🔴';
    case 'low': return '🟡';
    case 'normal': return '🟢';
    case 'excess': return '⚠️';
  }
}
