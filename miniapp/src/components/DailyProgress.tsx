import React from 'react';
import type { FoodLog } from '../types';
import SolarSystem from './SolarSystem';

interface Props {
  logs: FoodLog[];
  target: { calories: number; protein: number; fat: number; carbs: number };
  streak: number;
  water: number;
  waterNorm: number;
  xp: number;
  level: number;
  onWaterChange: (delta: number) => void;
  onAddFood: () => void;
  onSelectLog?: (log: FoodLog) => void;
  onRepeatMeal?: (text: string) => void;
}

function getMealCategory(dateStr: string): string {
  const h = new Date(dateStr).getHours();
  if (h >= 5 && h < 11) return 'Завтрак';
  if (h >= 11 && h < 15) return 'Обед';
  if (h >= 15 && h < 18) return 'Перекус';
  if (h >= 18 && h < 23) return 'Ужин';
  return 'Перекус';
}

function getMealIcon(cat: string): string {
  if (cat === 'Завтрак') return '🌅';
  if (cat === 'Обед') return '☀️';
  if (cat === 'Ужин') return '🌙';
  return '🍎';
}

export default function DailyProgress({
  logs, target, streak, water, waterNorm, xp, level,
  onWaterChange, onAddFood, onSelectLog, onRepeatMeal,
}: Props) {
  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein: acc.protein + (l.protein || 0),
      fat: acc.fat + (l.fat || 0),
      carbs: acc.carbs + (l.carbs || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const remaining = Math.max(0, target.calories - totals.calories);
  const calPct = Math.min(Math.round((totals.calories / target.calories) * 100), 150);
  const waterPct = waterNorm > 0 ? Math.min(Math.round((water / waterNorm) * 100), 100) : 0;

  const macros = [
    { label: 'Белки', val: totals.protein, max: target.protein, color: 'var(--pink)', unit: 'г' },
    { label: 'Жиры', val: totals.fat, max: target.fat, color: 'var(--accent-purple)', unit: 'г' },
    { label: 'Углеводы', val: totals.carbs, max: target.carbs, color: 'var(--accent-blue)', unit: 'г' },
  ];

  return (
    <div>
      {/* Solar System Hero */}
      <div className="card" style={{ marginBottom: 10, padding: '12px 8px 16px' }}>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
        }}>
          Сегодня
        </div>
        <SolarSystem
          calories={totals.calories} caloriesMax={target.calories}
          protein={totals.protein} proteinMax={target.protein}
          fat={totals.fat} fatMax={target.fat}
          carbs={totals.carbs} carbsMax={target.carbs}
        />
      </div>

      {/* Remaining calories badge */}
      <div className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {calPct >= 100 ? (
              <span style={{ color: calPct > 110 ? 'var(--red)' : 'var(--green)' }}>
                {calPct > 110 ? `Перебор: +${totals.calories - target.calories}` : 'Норма набрана!'} ккал
              </span>
            ) : (
              <>Осталось <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--yellow)',
              }}>{remaining}</span> ккал</>
            )}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: 'var(--text-secondary)',
          }}>
            {totals.calories} / {target.calories}
          </div>
        </div>
        {/* Calories bar */}
        <div className="progress-bar" style={{ height: 6, marginBottom: 10 }}>
          <div className="progress-fill" style={{
            width: `${Math.min(calPct, 100)}%`,
            background: calPct > 110
              ? 'linear-gradient(90deg, var(--yellow), var(--red))'
              : 'linear-gradient(90deg, var(--accent-purple), var(--yellow))',
          }} />
        </div>

        {/* Macro progress bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {macros.map(m => {
            const pct = m.max > 0 ? Math.min(Math.round((m.val / m.max) * 100), 150) : 0;
            return (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 56, fontSize: 11, color: 'var(--text-secondary)' }}>{m.label}</div>
                <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: m.color,
                  }} />
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, color: 'var(--text-secondary)', width: 52, textAlign: 'right',
                }}>
                  {Math.round(m.val)}/{m.max}{m.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {/* Streak */}
        <div className="card stat-cosmic" style={{ flex: 1, padding: '12px 8px' }}>
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.1)' }}>
            <span style={{ fontSize: 16 }}>{streak > 0 ? '🔥' : '💤'}</span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18, fontWeight: 700,
          }}>
            {streak}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>дней</div>
        </div>

        {/* Water — interactive */}
        <div className="card stat-cosmic" style={{ flex: 1.3, padding: '10px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <button
              onClick={() => onWaterChange(-1)}
              disabled={water <= 0}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(96,165,250,0.1)',
                border: '1px solid rgba(96,165,250,0.2)',
                color: 'var(--accent-blue)', fontSize: 16,
                cursor: 'pointer', fontFamily: 'inherit',
                opacity: water <= 0 ? 0.3 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              −
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>💧</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18, fontWeight: 700, color: 'var(--accent-blue)',
              }}>
                {water}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>/{waterNorm}</span>
              </div>
            </div>
            <button
              onClick={() => onWaterChange(1)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(96,165,250,0.1)',
                border: '1px solid rgba(96,165,250,0.2)',
                color: 'var(--accent-blue)', fontSize: 16,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
          {/* Mini bar */}
          <div className="progress-bar" style={{ height: 3, marginTop: 6 }}>
            <div className="progress-fill" style={{
              width: `${waterPct}%`,
              background: 'var(--accent-blue)',
            }} />
          </div>
        </div>

        {/* Meals count */}
        <div className="card stat-cosmic" style={{ flex: 1, padding: '12px 8px' }}>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <span style={{ fontSize: 16 }}>🚀</span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18, fontWeight: 700,
          }}>
            {logs.length}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>записей</div>
        </div>
      </div>

      {/* Add food button */}
      <button
        onClick={onAddFood}
        className="btn-primary"
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '13px 20px',
          marginBottom: 10,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Записать приём пищи
      </button>

      {/* Quick water button */}
      <button
        onClick={() => onWaterChange(1)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '11px 20px',
          marginBottom: 10,
          background: 'rgba(96,165,250,0.08)',
          border: '1px solid rgba(96,165,250,0.15)',
          borderRadius: 14, color: 'var(--accent-blue)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        💧 +1 стакан воды ({water}/{waterNorm})
      </button>

      {/* Today's meals list */}
      {logs.length > 0 && (
        <div className="card" style={{ padding: '14px 14px 8px' }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Приёмы пищи</div>
          {logs.map((log, i) => {
            const cat = getMealCategory(log.created_at);
            const icon = getMealIcon(cat);
            const time = new Date(log.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onSelectLog?.(log)}
              >
                <div style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {log.description}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {cat} · {time}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13, fontWeight: 600, color: 'var(--yellow)',
                  }}>
                    {log.calories}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                    Б{log.protein} Ж{log.fat} У{log.carbs}
                  </div>
                </div>
                {/* Repeat button */}
                {onRepeatMeal && log.description && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRepeatMeal(log.description); }}
                    title="Повторить"
                    style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.15)',
                      color: 'var(--accent-purple)', fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ↻
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
