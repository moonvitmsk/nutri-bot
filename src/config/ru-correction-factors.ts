// C-3: Сезонные и кулинарные коэффициенты для российских продуктов
// Источник: данные НИИ питания РАМН

export interface CorrectionFactor {
  nutrient: string;
  factor: number;
  reason: string;
}

// Тепличные овощи (зима, ноябрь-апрель)
export const GREENHOUSE_FACTORS: CorrectionFactor[] = [
  { nutrient: 'vitamin_c', factor: 0.55, reason: 'Тепличные овощи: витамин C -30-50%' },
  { nutrient: 'vitamin_a', factor: 0.65, reason: 'Тепличные: каротиноиды -20-40%' },
];

// Термическая обработка
export const COOKING_FACTORS: Record<string, CorrectionFactor[]> = {
  boiling: [
    { nutrient: 'vitamin_c', factor: 0.5, reason: 'Варка: витамин C -40-60%' },
    { nutrient: 'vitamin_b1', factor: 0.7, reason: 'Варка: B1 -25-35%' },
    { nutrient: 'vitamin_b9', factor: 0.6, reason: 'Варка: фолиевая кислота -30-50%' },
  ],
  frying: [
    { nutrient: 'vitamin_c', factor: 0.3, reason: 'Жарка: витамин C -60-80%' },
    { nutrient: 'vitamin_b1', factor: 0.6, reason: 'Жарка: B1 -30-45%' },
    { nutrient: 'vitamin_e', factor: 0.7, reason: 'Жарка: витамин E -20-30%' },
  ],
  steaming: [
    { nutrient: 'vitamin_c', factor: 0.75, reason: 'Пар: витамин C -15-30%' },
    { nutrient: 'vitamin_b1', factor: 0.85, reason: 'Пар: B1 -10-20%' },
  ],
  raw: [],
};

export function isGreenhouseSeason(): boolean {
  const month = new Date().getMonth(); // 0-11
  return month >= 10 || month <= 3; // Nov-Apr
}

export function applyCorrectionFactors(
  micronutrients: Record<string, number>,
  cookingMethod: string = 'raw',
  isVegetable: boolean = false,
): Record<string, number> {
  const result = { ...micronutrients };

  // Apply cooking corrections
  const factors = COOKING_FACTORS[cookingMethod] || [];
  for (const f of factors) {
    if (result[f.nutrient]) {
      result[f.nutrient] = Math.round(result[f.nutrient] * f.factor * 100) / 100;
    }
  }

  // Apply greenhouse correction for vegetables in winter
  if (isVegetable && isGreenhouseSeason()) {
    for (const f of GREENHOUSE_FACTORS) {
      if (result[f.nutrient]) {
        result[f.nutrient] = Math.round(result[f.nutrient] * f.factor * 100) / 100;
      }
    }
  }

  return result;
}
