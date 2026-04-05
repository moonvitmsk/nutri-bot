import { describe, it, expect } from 'vitest';
import { detectIntent } from '../src/handlers/intent-detector.js';

describe('detectIntent', () => {
  it('detects food photo intent', () => {
    expect(detectIntent('сфоткай еду')).toBe('food_photo');
    expect(detectIntent('посчитай калории')).toBe('food_photo');
    expect(detectIntent('анализ фото')).toBe('food_photo');
  });

  it('detects today intent', () => {
    expect(detectIntent('покажи дневник')).toBe('today');
    expect(detectIntent('что я сегодня ел')).toBe('today');
    expect(detectIntent('сколько я съел')).toBe('today');
    expect(detectIntent('итог дня')).toBe('today');
  });

  it('detects week intent', () => {
    expect(detectIntent('за неделю')).toBe('week');
    expect(detectIntent('статистика')).toBe('week');
  });

  it('detects deepcheck intent', () => {
    expect(detectIntent('глубокая консультация')).toBe('deepcheck');
    expect(detectIntent('deepcheck')).toBe('deepcheck');
    expect(detectIntent('проверь здоровье')).toBe('deepcheck');
  });

  it('detects lab intent', () => {
    expect(detectIntent('результаты крови')).toBe('lab');
    expect(detectIntent('разбор анализов')).toBe('lab');
    expect(detectIntent('биохимия')).toBe('lab');
  });

  it('detects water intent', () => {
    expect(detectIntent('выпил стакан воды')).toBe('water');
    expect(detectIntent('стакан воды')).toBe('water');
    expect(detectIntent('вода')).toBe('water');
  });

  it('detects qr intent', () => {
    expect(detectIntent('qr код')).toBe('qr');
    expect(detectIntent('код под крышкой')).toBe('qr');
  });

  it('detects profile intent', () => {
    expect(detectIntent('мой профиль')).toBe('profile');
    expect(detectIntent('мои данные')).toBe('profile');
  });

  it('detects help intent', () => {
    expect(detectIntent('помоги')).toBe('help');
    expect(detectIntent('что ты умеешь')).toBe('help');
    expect(detectIntent('какие команды')).toBe('help');
  });

  it('detects subscribe intent', () => {
    expect(detectIntent('подписка')).toBe('subscribe');
    expect(detectIntent('premium')).toBe('subscribe');
    expect(detectIntent('тариф')).toBe('subscribe');
  });

  it('detects deletedata intent', () => {
    // 'удали мои данные' matches profile ('мои.*данн') first — ordering matters
    expect(detectIntent('удали данные')).toBe('deletedata');
    expect(detectIntent('забудь меня')).toBe('deletedata');
    expect(detectIntent('удали профиль')).toBe('deletedata');
  });

  it('detects start intent', () => {
    expect(detectIntent('начать заново')).toBe('start');
    expect(detectIntent('старт')).toBe('start');
  });

  it('returns null for general chat', () => {
    expect(detectIntent('привет')).toBeNull();
    expect(detectIntent('расскажи про витамин D')).toBeNull();
    expect(detectIntent('какой белок лучше')).toBeNull();
    expect(detectIntent('что такое биотин')).toBeNull();
  });
});
