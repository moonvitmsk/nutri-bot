import { describe, it, expect } from 'vitest';
import { splitMessage, truncate, featureLocked, disclaimer } from '../src/utils/formatter.js';

describe('splitMessage', () => {
  it('returns single part for short messages', () => {
    const result = splitMessage('short message');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('short message');
  });

  it('splits long messages into multiple parts', () => {
    const long = 'a'.repeat(5000);
    const result = splitMessage(long, 2000);
    expect(result.length).toBeGreaterThan(1);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(2000);
    }
  });

  it('tries to split at paragraph boundaries', () => {
    const text = 'First paragraph.\n\nSecond paragraph that is long enough to matter.\n\nThird paragraph.';
    const result = splitMessage(text, 50);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]).toContain('First paragraph.');
  });

  it('handles empty string', () => {
    const result = splitMessage('');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('');
  });
});

describe('truncate', () => {
  it('returns original if under limit', () => {
    expect(truncate('short')).toBe('short');
  });

  it('truncates long strings with ellipsis', () => {
    const long = 'a'.repeat(5000);
    const result = truncate(long, 100);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('featureLocked', () => {
  it('returns specific messages for known features', () => {
    expect(featureLocked('photo')).toContain('фото');
    expect(featureLocked('lab')).toContain('лабораторн');
    expect(featureLocked('deepcheck')).toContain('консультация');
  });

  it('returns generic message for unknown feature', () => {
    expect(featureLocked('unknown')).toContain('тариф');
  });
});

describe('disclaimer', () => {
  it('contains disclaimer text', () => {
    const result = disclaimer();
    expect(result).toContain('врач');
  });
});
