import React from 'react';
import type { FoodLog } from '../types';

interface Props {
  logs: FoodLog[];
  calories: number;
  caloriesTarget: number;
  water: number;
  waterNorm: number;
  onAddFood: () => void;
  onWaterChange: (delta: number) => void;
  onExitSimple: () => void;
}

export default function SimpleMode({
  logs, calories, caloriesTarget, water, waterNorm,
  onAddFood, onWaterChange, onExitSimple,
}: Props) {
  const remaining = Math.max(0, caloriesTarget - calories);
  const pct = Math.min(Math.round((calories / caloriesTarget) * 100), 150);

  return (
    <div style={{ padding: '16px 16px 100px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>moonvit</div>
        <button
          onClick={onExitSimple}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
            padding: '8px 14px', color: 'var(--text-secondary)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Полная версия
        </button>
      </div>

      {/* Big calorie display */}
      <div style={{
        background: 'rgba(124,58,237,0.08)', borderRadius: 24, padding: '32px 20px',
        textAlign: 'center', marginBottom: 20,
        border: '1px solid rgba(124,58,237,0.15)',
      }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Съедено сегодня
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 48, fontWeight: 700, color: 'var(--yellow)',
          lineHeight: 1,
        }}>
          {calories}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
          из {caloriesTarget} ккал ({pct}%)
        </div>
        {remaining > 0 && (
          <div style={{ fontSize: 18, color: 'var(--accent-purple)', marginTop: 12, fontWeight: 600 }}>
            Осталось {remaining} ккал
          </div>
        )}
        {/* Big progress bar */}
        <div style={{
          height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)',
          marginTop: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 6, width: `${Math.min(pct, 100)}%`,
            background: pct > 110 ? 'var(--red)' : 'linear-gradient(90deg, var(--accent-purple), var(--yellow))',
            transition: 'width 0.5s',
          }} />
        </div>
      </div>

      {/* BIG Add Food button */}
      <button
        onClick={onAddFood}
        style={{
          width: '100%', padding: '22px 20px', marginBottom: 14,
          background: 'var(--accent-purple)', color: '#fff',
          border: 'none', borderRadius: 18, fontSize: 20,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          minHeight: 64,
        }}
      >
        {'\ud83d\udcf8'} Записать еду
      </button>

      {/* BIG Water section */}
      <div style={{
        background: 'rgba(96,165,250,0.08)', borderRadius: 20, padding: '24px 20px',
        marginBottom: 20, border: '1px solid rgba(96,165,250,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Вода</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 40, fontWeight: 700, color: 'var(--accent-blue)',
          }}>
            {water} <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-secondary)' }}>/ {waterNorm}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => onWaterChange(-1)}
            disabled={water <= 0}
            style={{
              flex: 1, padding: '18px', borderRadius: 16,
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
              color: 'var(--accent-blue)', fontSize: 24, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', minHeight: 60,
              opacity: water <= 0 ? 0.3 : 1,
            }}
          >
            {'\u2212'}
          </button>
          <button
            onClick={() => onWaterChange(1)}
            style={{
              flex: 2, padding: '18px', borderRadius: 16,
              background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)',
              color: 'var(--accent-blue)', fontSize: 20, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', minHeight: 60,
            }}
          >
            {'\ud83d\udca7'} +1 стакан
          </button>
        </div>
      </div>

      {/* Today's meals — simplified list */}
      {logs.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 18,
          padding: '18px 16px', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Сегодня ({logs.length} записей)
          </div>
          {logs.map((log, i) => (
            <div key={log.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>
                {log.description}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16, fontWeight: 700, color: 'var(--yellow)',
                marginLeft: 12,
              }}>
                {log.calories} ккал
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
