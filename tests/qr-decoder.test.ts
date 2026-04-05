import { describe, it, expect } from 'vitest';
import { extractQrCode } from '../src/utils/qr-decoder.js';

describe('extractQrCode', () => {
  it('extracts MV-format code', () => {
    const result = extractQrCode('MV-MENS-MULTI-ABC12345');
    expect(result).toBe('MV-MENS-MULTI-ABC12345');
  });

  it('extracts from URL with code param', () => {
    const result = extractQrCode('https://t.me/moonvit_bot?code=MV-SLEEP-XYZ789');
    expect(result).toBe('MV-SLEEP-XYZ789');
  });

  it('extracts short alphanumeric codes', () => {
    const result = extractQrCode('ABC123');
    expect(result).toBe('ABC123');
  });

  it('returns null for long text', () => {
    const result = extractQrCode('This is a very long text that is definitely not a QR code and should not be returned');
    expect(result).toBeNull();
  });

  it('uppercases result', () => {
    const result = extractQrCode('mv-test-abc');
    expect(result).toBe('MV-TEST-ABC');
  });

  it('handles empty string', () => {
    const result = extractQrCode('');
    expect(result).toBeNull();
  });

  // Additional coverage
  it('extracts MV code embedded in longer text', () => {
    const result = extractQrCode('Scan your MV-OMEGA3-AA1234 product code now');
    expect(result).toBe('MV-OMEGA3-AA1234');
  });

  it('returns null for plain URL without code param', () => {
    const result = extractQrCode('https://moonvit.ru/products/omega3');
    expect(result).toBeNull();
  });

  it('extracts code param from URL with multiple params', () => {
    const result = extractQrCode('https://t.me/moonvit_bot?ref=promo&code=MV-ZINC-BB9999&utm=cpc');
    expect(result).toBe('MV-ZINC-BB9999');
  });

  it('handles code exactly at 49 char boundary', () => {
    // 49 chars of uppercase alphanum+dash = valid
    const code = 'A'.repeat(49);
    const result = extractQrCode(code);
    expect(result).toBe(code);
  });

  it('returns null for 50+ char plain string', () => {
    const code = 'A'.repeat(50);
    const result = extractQrCode(code);
    expect(result).toBeNull();
  });

  it('returns null for string with spaces (not alphanumeric-dash)', () => {
    const result = extractQrCode('HELLO WORLD');
    expect(result).toBeNull();
  });

  it('returns null for string with special chars', () => {
    const result = extractQrCode('AB!CD@EF');
    expect(result).toBeNull();
  });

  it('handles lowercase MV code (case-insensitive match)', () => {
    const result = extractQrCode('mv-sleep-xyz');
    expect(result).toBe('MV-SLEEP-XYZ');
  });

  it('prefers MV-prefix match over URL code param', () => {
    // MV match happens first in logic
    const result = extractQrCode('MV-IRON-CC0001?code=OTHER-CODE');
    expect(result).toBe('MV-IRON-CC0001');
  });

  // Security: injection attempts in QR content
  it('handles script injection attempt — returns null or safe code', () => {
    const result = extractQrCode('<script>alert(1)</script>');
    expect(result).toBeNull();
  });

  it('handles SQL injection in QR text — returns null', () => {
    const result = extractQrCode("'; DROP TABLE users; --");
    expect(result).toBeNull();
  });

  it('handles path traversal attempt — returns null', () => {
    const result = extractQrCode('../../etc/passwd');
    expect(result).toBeNull();
  });

  it('trims whitespace from short codes', () => {
    const result = extractQrCode('  ABC123  ');
    expect(result).toBe('ABC123');
  });
});
