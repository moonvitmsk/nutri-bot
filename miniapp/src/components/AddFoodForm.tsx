import React, { useState } from 'react';

interface Props {
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export default function AddFoodForm({ onSubmit, onClose, loading }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    await onSubmit(text.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }} />

      <div
        style={{
          position: 'relative',
          background: 'rgba(12, 14, 30, 0.95)',
          borderTop: '1px solid rgba(124, 58, 237, 0.15)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 16px env(safe-area-inset-bottom, 16px)',
          animation: 'fade-in-up 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 16px',
        }} />

        <div className="section-title">Добавить приём пищи</div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Опишите что съели... Например: овсянка с молоком и бананом, 350г"
          disabled={loading}
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '12px 14px',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            resize: 'none',
            outline: 'none',
            marginBottom: 12,
          }}
          autoFocus
        />

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0 12px',
            fontSize: 13, color: 'var(--accent-purple)',
          }}>
            <div className="loading-dots"><span /><span /><span /></div>
            <span>AI анализирует...</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="btn-primary"
            style={{
              flex: 2,
              opacity: !text.trim() || loading ? 0.5 : 1,
            }}
          >
            Записать
          </button>
        </div>
      </div>
    </div>
  );
}
