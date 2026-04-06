import React, { useRef, useCallback } from 'react';

interface Props {
  userName: string;
  calories: number;
  caloriesTarget: number;
  protein: number;
  fat: number;
  carbs: number;
  streak: number;
  water: number;
  waterNorm: number;
}

export default function ShareCard({ userName, calories, caloriesTarget, protein, fat, carbs, streak, water, waterNorm }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;

    // Try Web Share API
    const text = `\u{1F3AF} Мой прогресс за сегодня:\n${calories}/${caloriesTarget} ккал\nБ${protein} Ж${fat} У${carbs}\n\u{1F525} Серия: ${streak} дней\n\u{1F4A7} Вода: ${water}/${waterNorm}\n\nОтслеживаю питание с moonvit AI \u{1F916}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'moonvit — мой прогресс', text });
      } catch {}
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [calories, caloriesTarget, protein, fat, carbs, streak, water, waterNorm]);

  const pct = Math.min(Math.round((calories / caloriesTarget) * 100), 150);

  return (
    <div>
      <div ref={cardRef} style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: 20, padding: 24,
        border: '1px solid rgba(124,58,237,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{userName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--accent-purple)', fontWeight: 600 }}>moonvit AI</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: 'var(--yellow)' }}>
            {pct}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{calories} / {caloriesTarget} ккал</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12 }}>
          <span>Б <b style={{ color: 'var(--pink)' }}>{protein}г</b></span>
          <span>Ж <b style={{ color: 'var(--accent-purple)' }}>{fat}г</b></span>
          <span>У <b style={{ color: 'var(--accent-blue)' }}>{carbs}г</b></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>{'\u{1F525}'} {streak} дней</span>
          <span>{'\u{1F4A7}'} {water}/{waterNorm}</span>
        </div>
      </div>

      <button
        onClick={handleShare}
        style={{
          width: '100%', padding: '12px', marginTop: 10,
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 12, color: 'var(--accent-purple)', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {'\u{1F4E4}'} Поделиться
      </button>
    </div>
  );
}
