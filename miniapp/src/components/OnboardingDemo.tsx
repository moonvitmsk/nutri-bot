import React, { useState } from 'react';

interface Props {
  onContinue: () => void;
}

const DEMO_SCREENS = [
  {
    title: 'Фото → КБЖУ за секунды',
    text: 'Сфотографируй любое блюдо — AI определит калории, белки, жиры, углеводы и 14 витаминов',
    visual: '📸 → 🤖 → 📊',
    example: '🍝 Паста карбонара: 520 ккал, Б24 Ж22 У52',
  },
  {
    title: 'Персональные рецепты',
    text: 'AI подбирает рецепты из доступных продуктов, учитывая твои дефициты витаминов',
    visual: '🥗 → 👨‍🍳 → 🎯',
    example: '3 рецепта за 30 мин с покрытием 80% нормы витамина D',
  },
  {
    title: '4 AI-агента для консультации',
    text: 'Глубокий разбор рациона: нутрициолог, диетолог, витаминолог и coach',
    visual: '🔬 → 🧠🧠🧠🧠',
    example: 'Полный отчёт по питанию за 5 минут',
  },
];

export default function OnboardingDemo({ onContinue }: Props) {
  const [step, setStep] = useState(0);

  const screen = DEMO_SCREENS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a1e', zIndex: 9999,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>{screen.visual}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{screen.title}</div>
      <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.6, marginBottom: 20 }}>{screen.text}</div>

      <div style={{
        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 14, padding: '12px 16px', marginBottom: 28,
        fontSize: 13, color: 'var(--accent-purple)', fontStyle: 'italic',
      }}>
        {screen.example}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        {DEMO_SCREENS.map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i === step ? 'var(--accent-purple)' : 'rgba(255,255,255,0.15)',
          }} />
        ))}
      </div>

      <button
        onClick={() => step < DEMO_SCREENS.length - 1 ? setStep(s => s + 1) : onContinue()}
        style={{
          width: '100%', padding: '14px', background: 'var(--accent-purple)',
          color: '#fff', border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {step < DEMO_SCREENS.length - 1 ? 'Далее' : 'Попробовать бесплатно'}
      </button>

      <button
        onClick={onContinue}
        style={{
          background: 'none', border: 'none', color: '#666',
          fontSize: 13, marginTop: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Пропустить
      </button>
    </div>
  );
}
