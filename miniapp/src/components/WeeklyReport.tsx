import React, { useMemo } from 'react';
import type { WeekDay } from '../types';

interface ApiNorm {
  name: string;
  unit: string;
  daily: number;
}

interface Props {
  days: WeekDay[];
  target: { calories: number; protein: number; fat: number; carbs: number };
  weekVitamins?: Record<string, number>;
  norms?: Record<string, ApiNorm>;
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2);
}

function planetColor(pct: number): string {
  if (!pct) return 'rgba(255,255,255,0.06)';
  if (pct >= 80 && pct <= 120) return '#6EE7B7';
  if (pct >= 50) return '#FBBF24';
  return '#F87171';
}

function planetGlow(pct: number): string {
  if (!pct) return 'none';
  if (pct >= 80 && pct <= 120) return '0 0 12px rgba(110,231,183,0.35)';
  if (pct >= 50) return '0 0 10px rgba(251,191,36,0.3)';
  return '0 0 8px rgba(248,113,113,0.25)';
}

// moonvit product recommendations based on deficiencies
const MOONVIT_RECS: Record<string, { product: string; color: string }> = {
  vitamin_d: { product: 'moonvit D3', color: '#FBBF24' },
  vitamin_c: { product: 'moonvit C', color: '#F87171' },
  iron: { product: 'moonvit Iron', color: '#6EE7B7' },
  magnesium: { product: 'moonvit Mg', color: '#A78BFA' },
  zinc: { product: 'moonvit Zinc', color: '#60A5FA' },
  vitamin_b12: { product: 'moonvit B12', color: '#F472B6' },
};

export default function WeeklyReport({ days, target, weekVitamins, norms }: Props) {
  if (!days.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌌</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Нет данных за неделю</div>
      </div>
    );
  }

  const loggedDays = days.filter(d => d.logged);
  const avgCal = Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / Math.max(loggedDays.length, 1));

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--accent-purple)',
          }}>
            {loggedDays.length}<span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>/7</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>дней</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--yellow)',
          }}>
            {avgCal}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>ср. ккал</div>
        </div>
      </div>

      {/* Planetary system view */}
      <div className="card" style={{ padding: '20px 12px' }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Орбита недели</div>

        {/* Orbit line */}
        <div style={{ position: 'relative', padding: '0 4px' }}>
          <div style={{
            position: 'absolute',
            top: 28,
            left: 24,
            right: 24,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.15), rgba(124,58,237,0.15), transparent)',
          }} />

          {/* Day planets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {days.map((d, i) => {
              const pct = d.logged && target.calories > 0
                ? Math.round((d.calories / target.calories) * 100)
                : 0;
              const color = planetColor(pct);
              const glow = planetGlow(pct);
              const isToday = d.date === new Date().toISOString().split('T')[0];
              const planetSize = d.logged ? 36 : 28;

              return (
                <div key={d.date} className="day-planet">
                  {/* Day label */}
                  <div style={{
                    fontSize: 10,
                    color: isToday ? 'var(--accent-purple)' : 'rgba(255,255,255,0.25)',
                    fontWeight: isToday ? 600 : 400,
                    textTransform: 'uppercase',
                  }}>
                    {shortDay(d.date)}
                  </div>

                  {/* Planet */}
                  <div style={{
                    position: 'relative',
                    width: planetSize,
                    height: planetSize,
                  }}>
                    <svg width={planetSize} height={planetSize} viewBox={`0 0 ${planetSize} ${planetSize}`}>
                      {/* Planet body */}
                      <circle
                        cx={planetSize / 2}
                        cy={planetSize / 2}
                        r={planetSize / 2 - 2}
                        fill={d.logged ? `${color}18` : 'rgba(255,255,255,0.03)'}
                        stroke={color}
                        strokeWidth={d.logged ? 2 : 0.5}
                        style={{ filter: d.logged ? `drop-shadow(${glow})` : 'none' }}
                      />
                      {/* Fill arc based on % */}
                      {d.logged && pct > 0 && (
                        <circle
                          cx={planetSize / 2}
                          cy={planetSize / 2}
                          r={planetSize / 2 - 5}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeDasharray={`${(Math.min(pct, 100) / 100) * (2 * Math.PI * (planetSize / 2 - 5))} ${2 * Math.PI * (planetSize / 2 - 5)}`}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${planetSize / 2} ${planetSize / 2})`}
                          opacity={0.5}
                        />
                      )}
                    </svg>

                    {/* Today indicator ring */}
                    {isToday && (
                      <div style={{
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        border: '1px dashed rgba(124,58,237,0.3)',
                        /* static indicator */
                      }} />
                    )}
                  </div>

                  {/* Percentage */}
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: d.logged ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)',
                    fontWeight: 500,
                  }}>
                    {d.logged ? `${pct}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Macro breakdown table */}
        <div style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'auto repeat(7, 1fr)',
          gap: '4px 2px',
          fontSize: 10,
        }}>
          {['', ...days.map(d => shortDay(d.date))].map((h, i) => (
            <div key={`h${i}`} style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.2)',
              fontWeight: 500,
              padding: '2px 0',
            }}>
              {h}
            </div>
          ))}
          {[
            { label: 'Б', key: 'protein' as const, t: target.protein, color: '#F472B6' },
            { label: 'Ж', key: 'fat' as const, t: target.fat, color: '#A78BFA' },
            { label: 'У', key: 'carbs' as const, t: target.carbs, color: '#60A5FA' },
          ].map(row => (
            <React.Fragment key={row.label}>
              <div style={{ color: row.color, fontWeight: 600, padding: '4px 6px 4px 2px' }}>{row.label}</div>
              {days.map(d => {
                const v = d[row.key];
                const pct = row.t > 0 ? (v / row.t) * 100 : 0;
                const bg = !v ? 'transparent' : pct >= 80 && pct <= 120 ? 'rgba(110,231,183,0.12)' : pct >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';
                return (
                  <div key={d.date} style={{
                    textAlign: 'center',
                    padding: '4px 0',
                    borderRadius: 4,
                    background: bg,
                    color: v ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {v ? Math.round(v) : '·'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Vitamin recommendations */}
      {weekVitamins && norms && <VitaminRecommendations weekVitamins={weekVitamins} norms={norms} loggedDays={loggedDays.length} />}
    </div>
  );
}

function VitaminRecommendations({ weekVitamins, norms, loggedDays }: {
  weekVitamins: Record<string, number>;
  norms: Record<string, ApiNorm>;
  loggedDays: number;
}) {
  const deficiencies = useMemo(() => {
    if (loggedDays < 3) return []; // Not enough data
    const result: { key: string; name: string; pct: number; product?: string; color: string }[] = [];
    for (const [key, norm] of Object.entries(norms)) {
      if (norm.daily <= 0) continue;
      const weekTotal = weekVitamins[key] || 0;
      const avgDaily = weekTotal / Math.max(loggedDays, 1);
      const pct = Math.round((avgDaily / norm.daily) * 100);
      if (pct < 60) {
        const rec = MOONVIT_RECS[key];
        result.push({
          key,
          name: norm.name,
          pct,
          product: rec?.product,
          color: rec?.color || 'var(--text-secondary)',
        });
      }
    }
    return result.sort((a, b) => a.pct - b.pct).slice(0, 4);
  }, [weekVitamins, norms, loggedDays]);

  if (deficiencies.length === 0) {
    if (loggedDays >= 3) {
      return (
        <div className="card" style={{ padding: '14px 16px', marginTop: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 20, marginRight: 8 }}>✨</span>
          <span style={{ fontSize: 13, color: 'var(--green)' }}>Витамины в норме! Так держать!</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
      <div className="section-title">Рекомендации по витаминам</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
        На основе среднего потребления за {loggedDays} дней
      </div>
      {deficiencies.map(d => (
        <div key={d.key} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: d.color, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {d.pct}% от нормы
              {d.product && <span style={{ color: 'var(--accent-purple)', marginLeft: 4 }}>→ {d.product}</span>}
            </div>
          </div>
          {/* Mini bar */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              width: `${Math.min(d.pct, 100)}%`, height: '100%', borderRadius: 2,
              background: d.pct < 30 ? 'var(--red)' : 'var(--yellow)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
