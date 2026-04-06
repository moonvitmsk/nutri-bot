import React from 'react';

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function AccessibilityToggle({ enabled, onToggle }: Props) {
  React.useEffect(() => {
    if (enabled) {
      document.body.classList.add('accessibility-mode');
    } else {
      document.body.classList.remove('accessibility-mode');
    }
  }, [enabled]);

  return (
    <div
      onClick={() => onToggle(!enabled)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12, marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Крупный шрифт</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Увеличенный текст и кнопки</div>
        </div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: enabled ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)',
        padding: 2, transition: 'background 0.3s', position: 'relative',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          transform: `translateX(${enabled ? 20 : 0}px)`,
          transition: 'transform 0.3s',
        }} />
      </div>
    </div>
  );
}
