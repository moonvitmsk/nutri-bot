// Mifflin-St Jeor equation for BMR + activity multiplier

interface MacroInput {
  sex: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: string;
}

interface MacroResult {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export function calculateMacros(input: MacroInput): MacroResult {
  // BMR (Mifflin-St Jeor)
  let bmr: number;
  if (input.sex === 'male') {
    bmr = 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age + 5;
  } else {
    bmr = 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age - 161;
  }

  // TDEE
  let tdee = bmr * ACTIVITY_MULTIPLIER[input.activity_level];

  // Goal adjustment
  if (input.goal === 'lose') tdee *= 0.85; // -15%
  else if (input.goal === 'gain') tdee *= 1.15; // +15%
  else if (input.goal === 'sport') tdee *= 1.1; // +10% for active lifestyle

  const calories = Math.round(tdee);
  const proteinMultiplier = input.goal === 'gain' ? 2.0 : input.goal === 'sport' ? 1.8 : 1.6;
  const protein = Math.round(input.weight_kg * proteinMultiplier);
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, fat, carbs };
}

export function formatMacros(m: MacroResult): string {
  return `${m.calories} ккал | Б: ${m.protein}г | Ж: ${m.fat}г | У: ${m.carbs}г`;
}

export function formatDaySummary(logs: { calories?: number | null; protein?: number | null; fat?: number | null; carbs?: number | null }[], target: MacroResult): string {
  let cal = 0, pro = 0, fa = 0, ca = 0;
  for (const l of logs) {
    cal += l.calories || 0;
    pro += l.protein || 0;
    fa += l.fat || 0;
    ca += l.carbs || 0;
  }
  const totals: MacroResult = { calories: cal, protein: pro, fat: fa, carbs: ca };
  const pct = (v: number, t: number) => t > 0 ? Math.round(v / t * 100) : 0;
  const bar = (v: number, t: number) => {
    if (t <= 0) return '░░░░░░░░░░ 0%';
    const p = Math.min(Math.round((v / t) * 100), 100);
    const filled = Math.round((p / 100) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${p}%`;
  };

  return [
    `Съедено: ${formatMacros(totals)}`,
    `Цель: ${formatMacros(target)}`,
    '',
    `🔥 Калории: ${bar(totals.calories, target.calories)}`,
    `🥩 Белок:   ${bar(totals.protein, target.protein)}`,
    `🧈 Жиры:    ${bar(totals.fat, target.fat)}`,
    `🍞 Углев:   ${bar(totals.carbs, target.carbs)}`,
  ].join('\n');
}
