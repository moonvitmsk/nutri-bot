// v0.8.4 — vitamin chart with unique colors, chemical formulas, sorted by deficit
import React from 'react';
import type { VitaminData } from '../types';

interface Props {
  vitamins: VitaminData[];
}

// Chemical formulas and unique colors per nutrient
const NUTRIENT_META: Record<string, { formula: string; color: string }> = {
  'Витамин A': { formula: 'A', color: '#FF9F43' },
  'Витамин C': { formula: 'C', color: '#FF6B6B' },
  'Витамин D': { formula: 'D', color: '#FECA57' },
  'Витамин E': { formula: 'E', color: '#1DD1A1' },
  'Витамин B1': { formula: 'B\u2081', color: '#54A0FF' },
  'Витамин B2': { formula: 'B\u2082', color: '#A29BFE' },
  'Витамин B6': { formula: 'B\u2086', color: '#FD79A8' },
  'Витамин B12': { formula: 'B\u2081\u2082', color: '#E056A0' },
  'Витамин B9': { formula: 'B\u2089', color: '#00D2D3' },
  'Железо': { formula: 'Fe', color: '#EE5A24' },
  'Кальций': { formula: 'Ca', color: '#C8D6E5' },
  'Магний': { formula: 'Mg', color: '#A78BFA' },
  'Цинк': { formula: 'Zn', color: '#48DBFB' },
  'Селен': { formula: 'Se', color: '#F0932B' },
  'Калий': { formula: 'K', color: '#6AB04C' },
  'Натрий': { formula: 'Na', color: '#DFE6E9' },
  'Фосфор': { formula: 'P', color: '#FFC312' },
  'Йод': { formula: 'I', color: '#7C3AED' },
};

function getMeta(name: string) {
  return NUTRIENT_META[name] || { formula: name.slice(0, 2), color: '#64748B' };
}

function getStatusColor(value: number): string {
  if (value >= 80) return 'var(--green)';
  if (value >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

export default function VitaminChart({ vitamins }: Props) {
  if (!vitamins.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔭</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Витаминная карта пуста. Отправьте фото еды в бот.
        </div>
      </div>
    );
  }

  // Sort: deficits first, then by value ascending
  const sorted = [...vitamins].sort((a, b) => a.value - b.value);

  return (
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="section-title">Витаминная карта</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {sorted.map((v) => {
          const meta = getMeta(v.name);
          const statusColor = getStatusColor(v.value);
          const isDeficit = v.value < 50;
          return (
            <div
              key={v.name}
              className="vitamin-orb"
              style={{}}
            >
              {/* Colored formula badge */}
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `${meta.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13, fontWeight: 700,
                  color: meta.color,
                }}>
                  {meta.formula}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}>
                  {v.name}
                </div>
                <div className="progress-bar" style={{ height: 4, marginTop: 4 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(v.value, 100)}%`,
                      background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
                    }}
                  />
                </div>
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: statusColor,
                flexShrink: 0,
                fontWeight: 600,
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
