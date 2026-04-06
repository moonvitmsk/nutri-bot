// v0.8.7 — vitamins page with colors, formulas, filter, lab delete
import React, { useState, useMemo } from 'react';
import type { ApiNorm, ApiLabResult } from '../lib/api';
import { deleteLabResult } from '../lib/api';

interface Props {
  vitamins: Record<string, number>;
  norms: Record<string, ApiNorm>;
  labResults: ApiLabResult[];
  initData?: string;
  onLabDeleted?: () => void;
}

// Chemical formulas and unique colors per nutrient key
const NUTRIENT_META: Record<string, { formula: string; color: string }> = {
  vitamin_a: { formula: 'A', color: '#FF9F43' },
  vitamin_c: { formula: 'C', color: '#FF6B6B' },
  vitamin_d: { formula: 'D', color: '#FECA57' },
  vitamin_e: { formula: 'E', color: '#1DD1A1' },
  vitamin_b1: { formula: 'B\u2081', color: '#54A0FF' },
  vitamin_b2: { formula: 'B\u2082', color: '#A29BFE' },
  vitamin_b6: { formula: 'B\u2086', color: '#FD79A8' },
  vitamin_b12: { formula: 'B\u2081\u2082', color: '#E056A0' },
  vitamin_b9: { formula: 'B\u2089', color: '#00D2D3' },
  iron: { formula: 'Fe', color: '#EE5A24' },
  calcium: { formula: 'Ca', color: '#C8D6E5' },
  magnesium: { formula: 'Mg', color: '#A78BFA' },
  zinc: { formula: 'Zn', color: '#48DBFB' },
  selenium: { formula: 'Se', color: '#F0932B' },
  potassium: { formula: 'K', color: '#6AB04C' },
  sodium: { formula: 'Na', color: '#DFE6E9' },
  phosphorus: { formula: 'P', color: '#FFC312' },
  iodine: { formula: 'I', color: '#7C3AED' },
};

function getMeta(key: string) {
  return NUTRIENT_META[key] || { formula: key.slice(0, 2).toUpperCase(), color: '#64748B' };
}

function getStatusColor(pct: number): string {
  if (pct >= 80 && pct <= 200) return 'var(--green)';
  if (pct >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

function getStatusLabel(pct: number): string {
  if (pct >= 80 && pct <= 120) return 'Норма';
  if (pct > 120 && pct <= 200) return 'Выше';
  if (pct > 200) return 'Избыток';
  if (pct >= 50) return 'Мало';
  return 'Дефицит';
}

type SortMode = 'important' | 'alpha';

function NutrientRow({ nKey, name, amount, norm, unit }: {
  nKey: string; name: string; amount: number; norm: number; unit: string;
}) {
  const pct = norm > 0 ? Math.round((amount / norm) * 100) : 0;
  const statusColor = getStatusColor(pct);
  const meta = getMeta(nKey);
  const isDeficit = pct < 50;

  return (
    <div
      className="vitamin-orb"
      style={{ padding: '10px 12px', gap: 12 }}
    >
      {/* Colored formula badge */}
      <div style={{
        width: 42, height: 42, borderRadius: 14,
        background: `${meta.color}15`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15, fontWeight: 700,
          color: meta.color,
          lineHeight: 1,
        }}>
          {meta.formula}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 600,
          color: statusColor,
          marginTop: 1,
        }}>
          {pct}%
        </span>
        {isDeficit && (
          <div style={{
            position: 'absolute', top: 2, right: 2,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red)',
            boxShadow: '0 0 6px rgba(248,113,113,0.5)',
            animation: 'dot-pulse 1.4s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {Math.round(amount * 10) / 10} / {norm} {unit}
        </div>
      </div>

      {/* Mini bar + status */}
      <div style={{ width: 52 }}>
        <div className="progress-bar" style={{ height: 4 }}>
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
            }}
          />
        </div>
        <div style={{
          fontSize: 9, textAlign: 'right', marginTop: 2,
          color: statusColor, fontWeight: 600,
        }}>
          {getStatusLabel(pct)}
        </div>
      </div>
    </div>
  );
}

export default function VitaminsPage({ vitamins, norms, labResults, initData, onLabDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('important');

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

  // Sort function
  const sortKeys = useMemo(() => (keys: string[]) => {
    if (sortMode === 'important') {
      return [...keys].sort((a, b) => {
        const pctA = norms[a].daily > 0 ? ((vitamins[a] || 0) / norms[a].daily) * 100 : 100;
        const pctB = norms[b].daily > 0 ? ((vitamins[b] || 0) / norms[b].daily) * 100 : 100;
        return pctA - pctB; // deficits first
      });
    }
    return keys; // alpha = default order from norms
  }, [sortMode, vitamins, norms]);

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22, fontWeight: 700, color: 'var(--green)',
          }}>{normalCount}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>в норме</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22, fontWeight: 700, color: 'var(--red)',
          }}>{deficitCount}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>дефицит</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          }}>{nutrientKeys.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>всего</div>
        </div>
      </div>

      {/* Sort toggle */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 12,
        padding: '4px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
      }}>
        {[
          { key: 'important' as SortMode, label: 'Важные первыми' },
          { key: 'alpha' as SortMode, label: 'По типу' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortMode(s.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 10,
              border: 'none',
              background: sortMode === s.key ? 'rgba(124,58,237,0.12)' : 'transparent',
              color: sortMode === s.key ? 'var(--accent-purple)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Vitamins */}
      <div className="card" style={{ marginBottom: 10, padding: '16px 12px' }}>
        <div className="section-title">Витамины</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 14 }}>
          Данные за сегодня
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortKeys(vitaminKeys).map((key) => {
            const norm = norms[key];
            return (
              <NutrientRow
                key={key}
                nKey={key}
                name={norm.name}
                amount={vitamins[key] || 0}
                norm={norm.daily}
                unit={norm.unit}
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
          {sortKeys(mineralKeys).map((key) => {
            const norm = norms[key];
            return (
              <NutrientRow
                key={key}
                nKey={key}
                name={norm.name}
                amount={vitamins[key] || 0}
                norm={norm.daily}
                unit={norm.unit}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Анализ крови</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, color: 'var(--text-secondary)',
                  }}>
                    {new Date(lr.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  {initData && (
                    <button
                      onClick={async () => {
                        setDeletingId(lr.id);
                        try {
                          await deleteLabResult(initData, lr.id);
                          onLabDeleted?.();
                        } catch { /* ignore */ }
                        setDeletingId(null);
                      }}
                      disabled={deletingId === lr.id}
                      style={{
                        background: 'none', border: 'none',
                        color: deletingId === lr.id ? 'var(--text-secondary)' : 'var(--red)',
                        fontSize: 14, cursor: 'pointer', padding: '2px 6px',
                        fontFamily: 'inherit',
                      }}
                    >
                      {deletingId === lr.id ? '...' : '×'}
                    </button>
                  )}
                </div>
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔬</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Нет анализов</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Отправьте фото анализа крови в бот
          </div>
        </div>
      )}
    </div>
  );
}
