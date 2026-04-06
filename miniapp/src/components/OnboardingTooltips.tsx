import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

const TIPS = [
  {
    title: 'Записывай еду',
    text: 'Сфотографируй блюдо или напиши текстом — AI определит КБЖУ',
    icon: '📸',
    position: 'bottom' as const,
  },
  {
    title: 'Следи за прогрессом',
    text: 'Кольца показывают калории и макронутриенты за день',
    icon: '🎯',
    position: 'top' as const,
  },
  {
    title: 'AI-помощник',
    text: 'Рецепты, план питания, анализы — всё в разделе moonvit AI',
    icon: '🤖',
    position: 'center' as const,
  },
];

export default function OnboardingTooltips({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const tip = TIPS[step];
  const isLast = step === TIPS.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={(e) => e.target === e.currentTarget && !isLast && setStep(s => s + 1)}
    >
      <div style={{
        background: '#1a1a2e', borderRadius: 20, padding: 28,
        maxWidth: 320, width: '100%', textAlign: 'center',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{tip.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{tip.title}</div>
        <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.5, marginBottom: 20 }}>{tip.text}</div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {TIPS.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === step ? 'var(--accent-purple)' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <button
          onClick={() => {
            if (isLast) {
              setVisible(false);
              onComplete();
            } else {
              setStep(s => s + 1);
            }
          }}
          style={{
            width: '100%', padding: '12px 24px',
            background: 'var(--accent-purple)', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 15,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {isLast ? 'Начать!' : 'Далее'}
        </button>

        {!isLast && (
          <button
            onClick={() => { setVisible(false); onComplete(); }}
            style={{
              background: 'none', border: 'none', color: '#666',
              fontSize: 13, marginTop: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
}
