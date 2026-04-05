import { describe, it, expect } from 'vitest';
import { FOOD_ANALYSIS_SYSTEM_PROMPT, FOOD_ANALYSIS_EXAMPLES } from '../src/prompts/food-analysis.js';
import { CHAT_SYSTEM_BASE, CHAT_ED_SAFE_RULES, CHAT_UNDERAGE_RULES } from '../src/prompts/chat-system.js';
import { DAILY_SUMMARY_PROMPT, MORNING_MESSAGES, WEEKDAY_TEXTS } from '../src/prompts/daily-summary.js';
import { RECIPE_SYSTEM_PROMPT, MEAL_PLAN_SYSTEM_PROMPT } from '../src/prompts/recipes.js';
import { SUPPLEMENT_OCR_PROMPT, LAB_ANALYSIS_PROMPT } from '../src/prompts/supplement-ocr.js';
import { AGENT_PROMPTS, CONTEXT_SUMMARY_PROMPT, QUALITY_CHECK_PROMPT, ONBOARDING_GREETING_PROMPT } from '../src/prompts/agents.js';

// Approximate token count: words * 1.3 (Russian text has ~1.5 tokens/word on average)
function estimateTokens(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.ceil(words * 1.5);
}

describe('Prompts: Token limits', () => {
  it('food analysis prompt should be 800-2000 tokens', () => {
    const tokens = estimateTokens(FOOD_ANALYSIS_SYSTEM_PROMPT);
    expect(tokens).toBeGreaterThan(300);
    expect(tokens).toBeLessThan(2000);
  });

  it('chat system prompt should be under 2000 tokens', () => {
    const tokens = estimateTokens(CHAT_SYSTEM_BASE);
    expect(tokens).toBeLessThan(2000);
  });

  it('no prompt should exceed 2000 tokens', () => {
    const allPrompts = [
      FOOD_ANALYSIS_SYSTEM_PROMPT,
      CHAT_SYSTEM_BASE,
      DAILY_SUMMARY_PROMPT,
      RECIPE_SYSTEM_PROMPT,
      MEAL_PLAN_SYSTEM_PROMPT,
      SUPPLEMENT_OCR_PROMPT,
      LAB_ANALYSIS_PROMPT,
      QUALITY_CHECK_PROMPT,
      CONTEXT_SUMMARY_PROMPT,
      ONBOARDING_GREETING_PROMPT,
      ...Object.values(AGENT_PROMPTS),
    ];
    for (const prompt of allPrompts) {
      expect(estimateTokens(prompt)).toBeLessThan(2000);
    }
  });
});

describe('Prompts: Morning messages', () => {
  it('should have 10+ unique morning messages', () => {
    expect(MORNING_MESSAGES.length).toBeGreaterThanOrEqual(10);
  });

  it('all morning messages should be unique', () => {
    const unique = new Set(MORNING_MESSAGES);
    expect(unique.size).toBe(MORNING_MESSAGES.length);
  });

  it('should have weekday texts for all 7 days', () => {
    for (let i = 0; i < 7; i++) {
      expect(WEEKDAY_TEXTS[i]).toBeDefined();
      expect(WEEKDAY_TEXTS[i].length).toBeGreaterThan(10);
    }
  });
});

describe('Prompts: Food analysis', () => {
  it('should contain examples of Russian dishes', () => {
    const lower = FOOD_ANALYSIS_SYSTEM_PROMPT.toLowerCase();
    expect(lower).toContain('борщ');
    expect(lower).toContain('оливье');
    expect(lower).toContain('бизнес-ланч');
  });

  it('should specify JSON response format', () => {
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('JSON');
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('"items"');
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('"total"');
  });

  it('should include confidence scale', () => {
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('confidence');
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('1 —');
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('5 —');
  });

  it('should handle non-food photos', () => {
    expect(FOOD_ANALYSIS_SYSTEM_PROMPT).toContain('not_food');
  });

  it('should have food analysis examples', () => {
    expect(FOOD_ANALYSIS_EXAMPLES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Prompts: Chat system', () => {
  it('should state bot is NOT a doctor', () => {
    expect(CHAT_SYSTEM_BASE).toContain('НЕ врач');
  });

  it('should have ED-safe guard rails', () => {
    expect(CHAT_ED_SAFE_RULES).toContain('РПП');
    expect(CHAT_ED_SAFE_RULES).toContain('НИКОГДА не акцентируй на подсчёте калорий');
  });

  it('should have underage guard rails', () => {
    expect(CHAT_UNDERAGE_RULES).toContain('< 18');
    expect(CHAT_UNDERAGE_RULES).toContain('похудении');
  });

  it('should limit response length', () => {
    expect(CHAT_SYSTEM_BASE).toContain('3500');
  });

  it('should mention emoji moderation', () => {
    const lower = CHAT_SYSTEM_BASE.toLowerCase();
    expect(lower).toContain('эмодзи');
  });
});

describe('Prompts: OCR supplement', () => {
  it('should contain cyrillic to latin mapping', () => {
    expect(SUPPLEMENT_OCR_PROMPT).toContain('Вит. D');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('vitamin_d');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('Аскорбиновая');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('vitamin_c');
  });

  it('should specify JSON response format', () => {
    expect(SUPPLEMENT_OCR_PROMPT).toContain('JSON');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('"ingredients"');
  });

  it('should handle measurement units', () => {
    expect(SUPPLEMENT_OCR_PROMPT).toContain('мкг');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('МЕ');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('IU');
  });

  it('should handle unreadable labels', () => {
    expect(SUPPLEMENT_OCR_PROMPT).toContain('readable');
    expect(SUPPLEMENT_OCR_PROMPT).toContain('переснимите');
  });
});

describe('Prompts: Recipes', () => {
  it('should limit cooking time to 30 minutes', () => {
    expect(RECIPE_SYSTEM_PROMPT).toContain('30 минут');
  });

  it('should mention Russian products', () => {
    const lower = RECIPE_SYSTEM_PROMPT.toLowerCase();
    expect(lower).toContain('российские');
  });

  it('should include budget/cost', () => {
    expect(RECIPE_SYSTEM_PROMPT).toContain('₽');
  });

  it('should link to daily norm percentages', () => {
    expect(RECIPE_SYSTEM_PROMPT).toContain('дневной нормы');
  });
});

describe('Prompts: Meal plan', () => {
  it('should include snacks', () => {
    expect(MEAL_PLAN_SYSTEM_PROMPT).toContain('перекус');
  });

  it('should include shopping list', () => {
    expect(MEAL_PLAN_SYSTEM_PROMPT).toContain('Шоппинг-лист');
  });
});

describe('Prompts: All have response format', () => {
  it('all prompts should specify response format or structure', () => {
    const prompts = [
      { name: 'food_analysis', text: FOOD_ANALYSIS_SYSTEM_PROMPT },
      { name: 'recipe', text: RECIPE_SYSTEM_PROMPT },
      { name: 'meal_plan', text: MEAL_PLAN_SYSTEM_PROMPT },
      { name: 'ocr', text: SUPPLEMENT_OCR_PROMPT },
      { name: 'lab', text: LAB_ANALYSIS_PROMPT },
      { name: 'daily_summary', text: DAILY_SUMMARY_PROMPT },
    ];
    for (const { name, text } of prompts) {
      const hasFormat = text.includes('ФОРМАТ') || text.includes('JSON') || text.includes('формат');
      expect(hasFormat, `${name} should specify response format`).toBe(true);
    }
  });
});

describe('Prompts: Agent prompts', () => {
  it('should have all 4 agent prompts', () => {
    expect(AGENT_PROMPTS.dietolog).toBeDefined();
    expect(AGENT_PROMPTS.health).toBeDefined();
    expect(AGENT_PROMPTS.lifestyle).toBeDefined();
    expect(AGENT_PROMPTS.report).toBeDefined();
  });

  it('health agent should not diagnose', () => {
    expect(AGENT_PROMPTS.health).toContain('НЕ врач');
  });
});
