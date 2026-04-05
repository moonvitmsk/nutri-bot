import React from 'react';
import type { VitaminData } from '../types';

interface Props {
  vitamins: VitaminData[];
}

function getColor(value: number): string {
  if (value >= 80) return 'var(--green)';
  if (value >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

function getGlow(value: number): string {
  if (value >= 80) return 'rgba(110,231,183,0.3)';
  if (value >= 50) return 'rgba(251,191,36,0.25)';
  return 'rgba(248,113,113,0.3)';
}

export default function VitaminChart({ vitamins }: Props) {
  if (!vitamins.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>🔭</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Витаминная карта пуста. Отправьте фото еды в бот.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="section-title">Витаминная карта</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {vitamins.map((v, i) => {
          const color = getColor(v.value);
          const glow = getGlow(v.value);
          const isDeficit = v.value < 50;
          return (
            <div
              key={v.name}
              className="vitamin-orb"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div
                className={`vitamin-dot${isDeficit ? ' deficit' : ''}`}
                style={{
                  background: color,
                  boxShadow: `0 0 8px ${glow}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}>
                  {v.name}
                </div>
                <div className="progress-bar" style={{ height: 4, marginTop: 4 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(v.value, 100)}%`,
                      background: `linear-gradient(90deg, ${color}88, ${color})`,
                    }}
                  />
                </div>
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color,
                flexShrink: 0,
                fontWeight: 500,
              }}>
                {Math.round(v.value)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
