import { describe, it, expect } from 'vitest';
import { calculateMacros, formatMacros, formatDaySummary } from '../src/utils/nutrition.js';

describe('calculateMacros', () => {
  it('calculates for male losing weight', () => {
    const result = calculateMacros({
      sex: 'male', age: 30, height_cm: 180, weight_kg: 85,
      activity_level: 'moderate', goal: 'lose',
    });
    expect(result.calories).toBeGreaterThan(1800);
    expect(result.calories).toBeLessThan(2800);
    expect(result.protein).toBeGreaterThan(100);
    expect(result.fat).toBeGreaterThan(40);
    expect(result.carbs).toBeGreaterThan(100);
  });

  it('calculates for female maintaining weight', () => {
    const result = calculateMacros({
      sex: 'female', age: 25, height_cm: 165, weight_kg: 60,
      activity_level: 'light', goal: 'maintain',
    });
    expect(result.calories).toBeGreaterThan(1400);
    expect(result.calories).toBeLessThan(2200);
    expect(result.protein).toBeGreaterThan(60);
  });

  it('calculates higher calories for gain goal', () => {
    const maintain = calculateMacros({
      sex: 'male', age: 25, height_cm: 175, weight_kg: 70,
      activity_level: 'active', goal: 'maintain',
    });
    const gain = calculateMacros({
      sex: 'male', age: 25, height_cm: 175, weight_kg: 70,
      activity_level: 'active', goal: 'gain',
    });
    expect(gain.calories).toBeGreaterThan(maintain.calories);
  });

  it('calculates lower calories for lose goal', () => {
    const maintain = calculateMacros({
      sex: 'female', age: 30, height_cm: 170, weight_kg: 65,
      activity_level: 'moderate', goal: 'maintain',
    });
    const lose = calculateMacros({
      sex: 'female', age: 30, height_cm: 170, weight_kg: 65,
      activity_level: 'moderate', goal: 'lose',
    });
    expect(lose.calories).toBeLessThan(maintain.calories);
  });

  it('higher activity = more calories', () => {
    const sedentary = calculateMacros({
      sex: 'male', age: 30, height_cm: 180, weight_kg: 80,
      activity_level: 'sedentary', goal: 'maintain',
    });
    const active = calculateMacros({
      sex: 'male', age: 30, height_cm: 180, weight_kg: 80,
      activity_level: 'very_active', goal: 'maintain',
    });
    expect(active.calories).toBeGreaterThan(sedentary.calories);
  });

  it('male BMR is higher than female BMR with same params', () => {
    const params = { age: 30, height_cm: 175, weight_kg: 70, activity_level: 'moderate' as const, goal: 'maintain' as const };
    const male = calculateMacros({ sex: 'male', ...params });
    const female = calculateMacros({ sex: 'female', ...params });
    expect(male.calories).toBeGreaterThan(female.calories);
  });

  it('gain goal uses higher protein multiplier', () => {
    const maintain = calculateMacros({
      sex: 'male', age: 25, height_cm: 175, weight_kg: 80,
      activity_level: 'moderate', goal: 'maintain',
    });
    const gain = calculateMacros({
      sex: 'male', age: 25, height_cm: 175, weight_kg: 80,
      activity_level: 'moderate', goal: 'gain',
    });
    // gain uses 2.0g/kg vs 1.6g/kg
    expect(gain.protein).toBeGreaterThan(maintain.protein);
  });

  it('returns rounded integers', () => {
    const result = calculateMacros({
      sex: 'male', age: 28, height_cm: 178, weight_kg: 75,
      activity_level: 'light', goal: 'maintain',
    });
    expect(Number.isInteger(result.calories)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);
    expect(Number.isInteger(result.carbs)).toBe(true);
  });

  it('all activity levels produce distinct calorie values', () => {
    const levels = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
    const calories = levels.map(a => calculateMacros({
      sex: 'male', age: 30, height_cm: 175, weight_kg: 75,
      activity_level: a, goal: 'maintain',
    }).calories);
    const unique = new Set(calories);
    expect(unique.size).toBe(5);
    // Must be strictly ascending
    for (let i = 1; i < calories.length; i++) {
      expect(calories[i]).toBeGreaterThan(calories[i - 1]);
    }
  });

  it('fat macro is ~25% of calories / 9 kcal', () => {
    const result = calculateMacros({
      sex: 'male', age: 30, height_cm: 180, weight_kg: 80,
      activity_level: 'moderate', goal: 'maintain',
    });
    const expectedFat = Math.round(result.calories * 0.25 / 9);
    expect(result.fat).toBe(expectedFat);
  });

  it('macros calorie sum is close to total calories', () => {
    const result = calculateMacros({
      sex: 'female', age: 35, height_cm: 162, weight_kg: 58,
      activity_level: 'active', goal: 'lose',
    });
    const sum = result.protein * 4 + result.fat * 9 + result.carbs * 4;
    // Allow ±50 kcal rounding error
    expect(Math.abs(sum - result.calories)).toBeLessThanOrEqual(50);
  });

  it('very_active lose goal produces reasonable calories', () => {
    const result = calculateMacros({
      sex: 'male', age: 22, height_cm: 185, weight_kg: 90,
      activity_level: 'very_active', goal: 'lose',
    });
    expect(result.calories).toBeGreaterThan(2000);
    expect(result.calories).toBeLessThan(5000);
  });
});

describe('formatMacros', () => {
  it('formats correctly', () => {
    const result = formatMacros({ calories: 2000, protein: 150, fat: 67, carbs: 220 });
    expect(result).toContain('2000');
    expect(result).toContain('150');
    expect(result).toContain('67');
    expect(result).toContain('220');
  });

  it('includes unit labels', () => {
    const result = formatMacros({ calories: 1800, protein: 120, fat: 60, carbs: 200 });
    expect(result).toContain('ккал');
    expect(result).toContain('Б:');
    expect(result).toContain('Ж:');
    expect(result).toContain('У:');
  });

  it('handles zero values', () => {
    const result = formatMacros({ calories: 0, protein: 0, fat: 0, carbs: 0 });
    expect(result).toContain('0');
  });

  it('returns a string', () => {
    const result = formatMacros({ calories: 2200, protein: 160, fat: 70, carbs: 240 });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });
});

describe('formatDaySummary', () => {
  it('summarizes food logs', () => {
    const logs = [
      { calories: 500, protein: 30, fat: 20, carbs: 50 },
      { calories: 700, protein: 40, fat: 25, carbs: 80 },
    ];
    const target = { calories: 2000, protein: 150, fat: 70, carbs: 250 };
    const result = formatDaySummary(logs, target);
    expect(result).toContain('1200');
    expect(result).toContain('60%');
  });

  it('handles empty logs', () => {
    const result = formatDaySummary([], { calories: 2000, protein: 100, fat: 70, carbs: 250 });
    expect(result).toContain('0');
  });

  it('handles null values in logs', () => {
    const logs = [
      { calories: null, protein: 30, fat: null, carbs: 50 },
    ];
    const target = { calories: 2000, protein: 100, fat: 70, carbs: 250 };
    const result = formatDaySummary(logs, target);
    expect(result).toContain('0%');
  });

  it('shows съедено and цель lines', () => {
    const logs = [{ calories: 1000, protein: 80, fat: 40, carbs: 100 }];
    const target = { calories: 2000, protein: 150, fat: 70, carbs: 250 };
    const result = formatDaySummary(logs, target);
    expect(result).toContain('Съедено');
    expect(result).toContain('Цель');
    expect(result).toContain('Калории');
  });

  it('calculates 100% when eaten equals target', () => {
    const target = { calories: 2000, protein: 150, fat: 70, carbs: 250 };
    const logs = [target];
    const result = formatDaySummary(logs, target);
    expect(result).toContain('100%');
  });

  it('handles target calories zero without crash', () => {
    const result = formatDaySummary(
      [{ calories: 500, protein: 30, fat: 20, carbs: 50 }],
      { calories: 0, protein: 100, fat: 70, carbs: 250 }
    );
    // pct(500, 0) = 0, should not throw
    expect(result).toContain('0%');
  });

  it('sums multiple logs correctly', () => {
    const logs = [
      { calories: 300, protein: 20, fat: 10, carbs: 40 },
      { calories: 400, protein: 25, fat: 15, carbs: 50 },
      { calories: 500, protein: 35, fat: 20, carbs: 60 },
    ];
    const target = { calories: 2000, protein: 150, fat: 70, carbs: 250 };
    const result = formatDaySummary(logs, target);
    expect(result).toContain('1200'); // 300+400+500
  });
});
