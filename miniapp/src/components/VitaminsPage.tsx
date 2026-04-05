import React from 'react';
import type { ApiNorm, ApiLabResult } from '../lib/api';

interface Props {
  vitamins: Record<string, number>;
  norms: Record<string, ApiNorm>;
  labResults: ApiLabResult[];
}

function getColor(pct: number): string {
  if (pct >= 80 && pct <= 200) return 'var(--green)';
  if (pct >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

function getGlow(pct: number): string {
  if (pct >= 80 && pct <= 200) return 'rgba(110,231,183,0.3)';
  if (pct >= 50) return 'rgba(251,191,36,0.25)';
  return 'rgba(248,113,113,0.3)';
}

function getStatusLabel(pct: number): string {
  if (pct >= 80 && pct <= 120) return 'Норма';
  if (pct > 120 && pct <= 200) return 'Выше';
  if (pct > 200) return 'Избыток';
  if (pct >= 50) return 'Мало';
  return 'Дефицит';
}

function NutrientRow({ name, amount, norm, unit, index }: {
  name: string; amount: number; norm: number; unit: string; index: number;
}) {
  const pct = norm > 0 ? Math.round((amount / norm) * 100) : 0;
  const color = getColor(pct);
  const glow = getGlow(pct);
  const isDeficit = pct < 50;

  return (
    <div
      className="vitamin-orb"
      style={{
        animationDelay: `${index * 0.03}s`,
        padding: '10px 12px',
        gap: 12,
      }}
    >
      {/* Planet indicator */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        <div
          className={`vitamin-dot${isDeficit ? ' deficit' : ''}`}
          style={{
            width: 8,
            height: 8,
            background: color,
            boxShadow: `0 0 6px ${glow}`,
            position: 'absolute',
            top: 4,
            right: 4,
          }}
        />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
          color,
        }}>
          {pct}%
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {Math.round(amount * 10) / 10} / {norm} {unit}
        </div>
      </div>

      {/* Mini bar */}
      <div style={{ width: 48 }}>
        <div className="progress-bar" style={{ height: 4 }}>
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
            }}
          />
        </div>
        <div style={{
          fontSize: 9,
          color: 'var(--text-secondary)',
          textAlign: 'right',
          marginTop: 2,
        }}>
          {getStatusLabel(pct)}
        </div>
      </div>
    </div>
  );
}

export default function VitaminsPage({ vitamins, norms, labResults }: Props) {
  const nutrientKeys = Object.keys(norms);
  const vitaminKeys = nutrientKeys.filter(k => k.startsWith('vitamin_'));
  const mineralKeys = nutrientKeys.filter(k => !k.startsWith('vitamin_'));

  const deficitCount = nutrientKeys.filter(k => {
    const norm = norms[k];
    const amount = vitamins[k] || 0;
    return norm.daily > 0 ? (amount / norm.daily) * 100 < 50 : false;
  }).length;

  const normalCount = nutrientKeys.filter(k => {
    const norm = norms[k];
    const amount = vitamins[k] || 0;
    const pct = norm.daily > 0 ? (amount / norm.daily) * 100 : 0;
    return pct >= 80 && pct <= 120;
  }).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--green)',
          }}>{normalCount}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>в норме</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px', animationDelay: '0.1s' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--red)',
          }}>{deficitCount}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>дефицит</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px', animationDelay: '0.2s' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>{nutrientKeys.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>всего</div>
        </div>
      </div>

      {/* Vitamins */}
      <div className="card" style={{ marginBottom: 10, padding: '16px 12px' }}>
        <div className="section-title">Витамины</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 14 }}>
          Данные за сегодня
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {vitaminKeys.map((key, i) => {
            const norm = norms[key];
            return (
              <NutrientRow
                key={key}
                name={norm.name}
                amount={vitamins[key] || 0}
                norm={norm.daily}
                unit={norm.unit}
                index={i}
              />
            );
          })}
        </div>
      </div>

      {/* Minerals */}
      <div className="card" style={{ marginBottom: 10, padding: '16px 12px' }}>
        <div className="section-title">Минералы</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 14 }}>
          Нормы по МР 2.3.1.0253-21
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {mineralKeys.map((key, i) => {
            const norm = norms[key];
            return (
              <NutrientRow
                key={key}
                name={norm.name}
                amount={vitamins[key] || 0}
                norm={norm.daily}
                unit={norm.unit}
                index={i}
              />
            );
          })}
        </div>
      </div>

      {/* Lab results */}
      {labResults.length > 0 ? (
        <div className="card" style={{ padding: '16px 14px' }}>
          <div className="section-title">Результаты анализов</div>
          {labResults.map(lr => (
            <div key={lr.id} style={{
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Анализ крови</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}>
                  {new Date(lr.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              {lr.deficiencies.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--yellow)' }}>
                  Дефициты: {lr.deficiencies.join(', ')}
                </div>
              )}
              {lr.ai_interpretation && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  {lr.ai_interpretation.length > 150
                    ? lr.ai_interpretation.slice(0, 150) + '...'
                    : lr.ai_interpretation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>🔬</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Нет анализов</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Отправьте фото анализа крови в бот
          </div>
        </div>
      )}
    </div>
  );
}
