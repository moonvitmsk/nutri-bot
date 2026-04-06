import React, { useState } from 'react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'weekly' | 'daily';
  metric: 'protein' | 'water' | 'streak' | 'meals';
  target: number;
  participants: number;
  progress?: number;
}

const CHALLENGES: Challenge[] = [
  { id: 'protein_week', title: 'Белковая неделя', description: 'Набери 100г белка каждый день 7 дней подряд', icon: '💪', type: 'weekly', metric: 'protein', target: 100, participants: 234 },
  { id: 'water_7', title: 'Водный марафон', description: 'Выпей 8+ стаканов воды 7 дней подряд', icon: '💧', type: 'weekly', metric: 'water', target: 8, participants: 156 },
  { id: 'streak_30', title: '30 дней подряд', description: 'Логируй питание 30 дней без перерыва', icon: '🔥', type: 'weekly', metric: 'streak', target: 30, participants: 89 },
  { id: 'meals_3', title: '3 приёма в день', description: 'Записывай минимум 3 приёма пищи каждый день', icon: '🍽', type: 'daily', metric: 'meals', target: 3, participants: 312 },
];

export default function ChallengesPage() {
  const [joined, setJoined] = useState<string[]>([]);

  return (
    <div>
      <div className="section-title">Челленджи</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Участвуй в челленджах и соревнуйся с другими
      </div>

      {CHALLENGES.map(c => {
        const isJoined = joined.includes(c.id);
        return (
          <div key={c.id} className="card" style={{ padding: '16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: isJoined ? 'rgba(110,231,183,0.12)' : 'rgba(124,58,237,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.description}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                  👥 {c.participants} участников
                </div>
              </div>
            </div>

            {isJoined && c.progress !== undefined && (
              <div className="progress-bar" style={{ height: 4, marginTop: 10 }}>
                <div className="progress-fill" style={{
                  width: `${Math.min((c.progress / c.target) * 100, 100)}%`,
                  background: 'var(--green)',
                }} />
              </div>
            )}

            <button
              onClick={() => setJoined(prev => isJoined ? prev.filter(id => id !== c.id) : [...prev, c.id])}
              style={{
                width: '100%', marginTop: 10, padding: '10px',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
                background: isJoined ? 'rgba(248,113,113,0.08)' : 'rgba(124,58,237,0.08)',
                border: `1px solid ${isJoined ? 'rgba(248,113,113,0.2)' : 'rgba(124,58,237,0.2)'}`,
                color: isJoined ? 'var(--red)' : 'var(--accent-purple)',
              }}
            >
              {isJoined ? 'Выйти' : 'Участвовать'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
