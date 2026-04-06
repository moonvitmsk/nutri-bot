import React, { useState } from 'react';

interface Props {
  onSelect: (mood: string) => void;
  onSkip: () => void;
}

const MOODS = [
  { emoji: '\u{1F60A}', label: 'Отлично', value: 'great' },
  { emoji: '\u{1F642}', label: 'Хорошо', value: 'good' },
  { emoji: '\u{1F610}', label: 'Нормально', value: 'neutral' },
  { emoji: '\u{1F614}', label: 'Не очень', value: 'low' },
  { emoji: '\u{1F62B}', label: 'Плохо', value: 'bad' },
];

export default function MoodSelector({ onSelect, onSkip }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
        Как ты себя чувствуешь?
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => { setSelected(m.value); onSelect(m.value); }}
            style={{
              width: 48, height: 48, borderRadius: 14,
              border: selected === m.value ? '2px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.08)',
              background: selected === m.value ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              fontSize: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        style={{
          background: 'none', border: 'none', color: '#666',
          fontSize: 12, marginTop: 8, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Пропустить
      </button>
    </div>
  );
}
