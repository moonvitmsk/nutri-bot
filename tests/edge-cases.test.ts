import { describe, it, expect } from 'vitest';
import { detectIntent } from '../src/handlers/intent-detector.js';
import { calculateMacros, formatDaySummary } from '../src/utils/nutrition.js';
import { formatProgressBar, truncate, splitMessage } from '../src/utils/formatter.js';
import { LRUCache } from '../src/services/cache.js';

describe('Edge cases from persona simulation', () => {
  describe('Intent detection edge cases', () => {
    it('handles extremely long message (2000+ chars)', () => {
      const longText = 'а'.repeat(2500);
      expect(detectIntent(longText)).toBeNull();
    });

    it('handles empty string', () => {
      expect(detectIntent('')).toBeNull();
    });

    it('handles unicode emoji-only messages', () => {
      expect(detectIntent('🍕🍔🌮')).toBeNull();
    });

    it('handles mixed language input', () => {
      expect(detectIntent('show me мой дневник please')).toBe('today');
    });

    it('handles SQL injection in free-text fields', () => {
      const sqli = "'; DROP TABLE nutri_users; --";
      expect(detectIntent(sqli)).toBeNull(); // should not match any intent
    });

    it('handles XSS in display name text', () => {
      const xss = '<script>alert("xss")</script> покажи дневник';
      expect(detectIntent(xss)).toBe('today');
    });

    it('handles command-like text in message', () => {
      expect(detectIntent('как мне удалить данные?')).toBe('deletedata');
    });

    it('detects water intent in casual speech', () => {
      expect(detectIntent('выпил стакан воды')).toBe('water');
    });

    it('detects stats/week intent', () => {
      expect(detectIntent('покажи статистику за неделю')).toBe('week');
    });
  });

  describe('Nutrition calculations edge cases', () => {
    it('handles minimum valid input', () => {
      const result = calculateMacros({
        sex: 'female', age: 10, height_cm: 100, weight_kg: 30,
        activity_level: 'sedentary', goal: 'maintain',
      });
      expect(result.calories).toBeGreaterThan(500);
      expect(result.calories).toBeLessThan(3000);
    });

    it('handles maximum valid input', () => {
      const result = calculateMacros({
        sex: 'male', age: 100, height_cm: 220, weight_kg: 200,
        activity_level: 'very_active', goal: 'gain',
      });
      expect(result.calories).toBeGreaterThan(1000);
      expect(result.protein).toBeGreaterThan(0);
    });

    it('formatDaySummary handles empty logs', () => {
      const result = formatDaySummary([], { calories: 2000, protein: 100, fat: 70, carbs: 250 });
      expect(result).toContain('0%');
    });

    it('formatDaySummary handles zero target without crash', () => {
      const result = formatDaySummary(
        [{ calories: 500, protein: 30, fat: 20, carbs: 50 }],
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      );
      expect(result).toBeDefined();
    });

    it('formatDaySummary handles null values in logs', () => {
      const result = formatDaySummary(
        [{ calories: null, protein: null, fat: null, carbs: null }],
        { calories: 2000, protein: 100, fat: 70, carbs: 250 },
      );
      expect(result).toContain('0%');
    });

    it('handles user with 100+ daily entries', () => {
      const manyLogs = Array.from({ length: 100 }, (_, i) => ({
        calories: 50, protein: 5, fat: 2, carbs: 8,
      }));
      const result = formatDaySummary(manyLogs, { calories: 2000, protein: 100, fat: 70, carbs: 250 });
      expect(result).toContain('Калории');
    });
  });

  describe('Progress bar edge cases', () => {
    it('handles 0/0 target', () => {
      const bar = formatProgressBar(0, 0);
      expect(bar).toContain('0%');
    });

    it('handles over 100%', () => {
      const bar = formatProgressBar(3000, 2000);
      expect(bar).toContain('100%');
    });

    it('handles negative current', () => {
      const bar = formatProgressBar(-100, 2000);
      expect(bar).toContain('0%');
    });

    it('shows correct emoji for different levels', () => {
      expect(formatProgressBar(1800, 2000)).toContain('✅'); // 90%
      expect(formatProgressBar(1000, 2000)).toContain('🟡'); // 50%
      expect(formatProgressBar(200, 2000)).toContain('🔴'); // 10%
    });
  });

  describe('Message formatting edge cases', () => {
    it('truncate handles message at exact limit', () => {
      const msg = 'a'.repeat(4000);
      const result = truncate(msg, 4000);
      expect(result.length).toBe(4000);
    });

    it('splitMessage splits very long text correctly', () => {
      const longText = Array.from({ length: 10 }, () => 'Paragraph. '.repeat(100)).join('\n\n');
      const parts = splitMessage(longText, 4000);
      expect(parts.length).toBeGreaterThan(1);
      for (const part of parts) {
        expect(part.length).toBeLessThanOrEqual(4000);
      }
    });
  });

  describe('LRU Cache edge cases', () => {
    it('returns undefined for missing key', () => {
      const cache = new LRUCache(10);
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('evicts oldest entry when full', () => {
      const cache = new LRUCache(2);
      cache.set('a', 1, 60000);
      cache.set('b', 2, 60000);
      cache.set('c', 3, 60000); // should evict 'a'
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('expires entries after TTL', async () => {
      const cache = new LRUCache(10);
      cache.set('x', 42, 1); // 1ms TTL
      await new Promise(r => setTimeout(r, 10));
      expect(cache.get('x')).toBeUndefined();
    });

    it('handles clear', () => {
      const cache = new LRUCache(10);
      cache.set('a', 1, 60000);
      cache.set('b', 2, 60000);
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('handles delete', () => {
      const cache = new LRUCache(10);
      cache.set('a', 1, 60000);
      cache.delete('a');
      expect(cache.get('a')).toBeUndefined();
    });
  });
});
