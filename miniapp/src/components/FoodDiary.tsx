import React from 'react';
import type { FoodLog } from '../types';

interface Props {
  logs: FoodLog[];
  onSelect: (log: FoodLog) => void;
  onAddFood: () => void;
}

function groupByDate(logs: FoodLog[]): Record<string, FoodLog[]> {
  const groups: Record<string, FoodLog[]> = {};
  for (const log of logs) {
    const date = log.created_at.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  }
  return groups;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Сегодня';
  if (dateStr === yesterday) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const mealColors = ['#FBBF24', '#F472B6', '#60A5FA', '#6EE7B7', '#A78BFA', '#F87171'];

export default function FoodDiary({ logs, onSelect, onAddFood }: Props) {
  if (!logs.length) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🛸</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Бортовой журнал пуст</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Отправьте фото еды в бот или добавьте текстом
          </div>
          <button onClick={onAddFood} className="btn-primary">+ Записать приём пищи</button>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(logs);
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Бортовой журнал</div>
        <button
          onClick={onAddFood}
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 10,
            padding: '6px 12px',
            color: 'var(--accent-purple)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Добавить
        </button>
      </div>

      {dates.map((date) => {
        const dayLogs = grouped[date];
        const dayTotal = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);

        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '0 4px', marginBottom: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
                {formatDate(date)}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: 'rgba(255,255,255,0.25)',
              }}>
                {dayTotal} ккал
              </div>
            </div>

            {dayLogs.map((log, i) => (
              <div
                key={log.id}
                className="card food-entry"
                onClick={() => onSelect(log)}
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 14px',
                  animationDelay: `${i * 0.05}s`,
                  cursor: 'pointer',
                }}
              >
                {/* Planet indicator */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: mealColors[i % mealColors.length],
                  boxShadow: `0 0 8px ${mealColors[i % mealColors.length]}40`,
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {log.description || 'Meal'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <span style={{ color: 'var(--yellow)' }}>{log.calories}</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                    <span style={{ color: 'var(--pink)' }}>Б{log.protein}</span>
                    <span style={{ color: 'var(--accent-purple)' }}>Ж{log.fat}</span>
                    <span style={{ color: 'var(--accent-blue)' }}>У{log.carbs}</span>
                  </div>
                </div>

                {/* Has vitamins indicator */}
                {log.micronutrients && Object.keys(log.micronutrients).length > 0 && (
                  <div style={{
                    fontSize: 9, color: 'var(--accent-purple)',
                    background: 'rgba(124,58,237,0.08)',
                    padding: '2px 6px', borderRadius: 4,
                    fontWeight: 500, flexShrink: 0,
                  }}>
                    🧬
                  </div>
                )}

                {/* Time */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0,
                }}>
                  {new Date(log.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
