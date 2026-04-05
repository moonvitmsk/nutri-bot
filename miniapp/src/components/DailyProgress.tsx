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
}

export default function DailyProgress({
  logs, target, streak, water, waterNorm, xp, level,
  onWaterChange, onAddFood,
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

  const waterPct = waterNorm > 0 ? Math.min(Math.round((water / waterNorm) * 100), 100) : 0;

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
        <div className="card stat-cosmic" style={{ flex: 1, padding: '12px 8px', animationDelay: '0.2s' }}>
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

      {/* Add food FAB */}
      <button
        onClick={onAddFood}
        className="btn-primary"
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '13px 20px',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>+</span>
        Записать приём пищи
      </button>
    </div>
  );
}
