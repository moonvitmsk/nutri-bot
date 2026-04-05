import { describe, it, expect } from 'vitest';
import { getDailyNorm, getNutrientStatus, formatNutrientStatus, DAILY_NORMS_RU } from '../src/config/daily-norms-ru.js';

describe('DAILY_NORMS_RU', () => {
  it('has vitamin C norms', () => {
    expect(DAILY_NORMS_RU.vitamin_c.male).toBe(100);
    expect(DAILY_NORMS_RU.vitamin_c.female).toBe(90);
  });

  it('has B12 norms higher than international', () => {
    expect(DAILY_NORMS_RU.vitamin_b12.male).toBe(3.0);
  });

  it('has biotin at 50mcg (higher than international 30mcg)', () => {
    expect(DAILY_NORMS_RU.vitamin_b7.male).toBe(50);
  });

  it('has iron norms differing by sex', () => {
    expect(DAILY_NORMS_RU.iron.female).toBeGreaterThan(DAILY_NORMS_RU.iron.male);
  });
});

describe('getDailyNorm', () => {
  it('returns norm for known nutrient', () => {
    expect(getDailyNorm('vitamin_c', 'male')).toBe(100);
    expect(getDailyNorm('vitamin_c', 'female')).toBe(90);
  });

  it('returns 0 for unknown nutrient', () => {
    expect(getDailyNorm('unknown', 'male')).toBe(0);
  });

  it('defaults to male if sex is null', () => {
    expect(getDailyNorm('vitamin_c', null)).toBe(100);
  });
});

describe('getNutrientStatus', () => {
  it('marks deficient when under 50%', () => {
    expect(getNutrientStatus('vitamin_c', 40, 'male')).toBe('deficient');
  });

  it('marks low when 50-80%', () => {
    expect(getNutrientStatus('vitamin_c', 70, 'male')).toBe('low');
  });

  it('marks normal when 80-200%', () => {
    expect(getNutrientStatus('vitamin_c', 100, 'male')).toBe('normal');
    expect(getNutrientStatus('vitamin_c', 180, 'male')).toBe('normal');
  });

  it('marks excess when over 200%', () => {
    expect(getNutrientStatus('vitamin_c', 250, 'male')).toBe('excess');
  });
});

describe('formatNutrientStatus', () => {
  it('returns red for deficient', () => {
    expect(formatNutrientStatus('deficient')).toContain('🔴');
  });

  it('returns yellow for low', () => {
    expect(formatNutrientStatus('low')).toContain('🟡');
  });

  it('returns green for normal', () => {
    expect(formatNutrientStatus('normal')).toContain('🟢');
  });
});
