import React from 'react';
import type { FoodLog } from '../types';

interface Props {
  log: FoodLog;
  norms: Record<string, { name: string; unit: string; daily: number }>;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function getColor(pct: number): string {
  if (pct >= 80) return 'var(--green)';
  if (pct >= 40) return 'var(--yellow)';
  return 'var(--red)';
}

export default function MealDetail({ log, norms, onClose, onDelete }: Props) {
  const micro = log.micronutrients || {};
  const items = log.items || [];
  const hasMicro = Object.keys(micro).length > 0;

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
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Sheet */}
      <div
        style={{
          position: 'relative',
          background: 'rgba(12, 14, 30, 0.95)',
          borderTop: '1px solid rgba(124, 58, 237, 0.15)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 16px env(safe-area-inset-bottom, 16px)',
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'fade-in-up 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 16px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{log.description}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {new Date(log.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Удалить запись?')) onDelete(log.id); }}
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 10,
              padding: '6px 12px',
              color: 'var(--red)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Удалить
          </button>
        </div>

        {/* KBJU */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'ккал', val: log.calories, color: 'var(--yellow)' },
            { label: 'белок', val: log.protein, color: 'var(--pink)', u: 'г' },
            { label: 'жиры', val: log.fat, color: 'var(--accent-purple)', u: 'г' },
            { label: 'углев', val: log.carbs, color: 'var(--accent-blue)', u: 'г' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16, fontWeight: 700, color: s.color,
              }}>
                {Math.round(s.val)}{s.u || ''}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Items breakdown */}
        {items.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: 13 }}>Состав</div>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-secondary)',
                }}>
                  {item.weight_g}г · {item.calories} ккал
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Micronutrients contributed */}
        {hasMicro && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: 13 }}>Витамины и минералы (вклад блюда)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {Object.entries(micro)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, amount]) => {
                  const norm = norms[key];
                  if (!norm) return null;
                  const pct = norm.daily > 0 ? Math.round((amount / norm.daily) * 100) : 0;
                  const color = getColor(pct);
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: color, flexShrink: 0,
                        boxShadow: `0 0 4px ${color}`,
                      }} />
                      <span style={{ fontSize: 11, flex: 1, color: 'var(--text-secondary)' }}>
                        {norm.name}
                      </span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, color, fontWeight: 600,
                      }}>
                        +{pct}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* AI comment */}
        {log.comment && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(96,165,250,0.06))',
            border: '1px solid rgba(124,58,237,0.12)',
            borderRadius: 14, padding: '12px 14px',
            fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
          }}>
            {log.comment}
          </div>
        )}
      </div>
    </div>
  );
}
