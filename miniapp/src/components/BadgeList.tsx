import React from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0-100
}

interface Props {
  streakDays: number;
  totalLogs: number;
  waterNorm: number;
  waterGlasses: number;
  photosUsed: number;
}

function computeBadges(props: Props): Badge[] {
  const { streakDays, totalLogs, waterNorm, waterGlasses, photosUsed } = props;
  const waterComplete = waterNorm > 0 && waterGlasses >= waterNorm;

  return [
    {
      id: 'streak-3',
      name: 'Три дня подряд',
      description: 'Записывай еду 3 дня подряд',
      icon: '🔥',
      unlocked: streakDays >= 3,
      progress: Math.min(100, Math.round((streakDays / 3) * 100)),
    },
    {
      id: 'streak-7',
      name: 'Неделя силы',
      description: '7 дней непрерывного трекинга',
      icon: '💪',
      unlocked: streakDays >= 7,
      progress: Math.min(100, Math.round((streakDays / 7) * 100)),
    },
    {
      id: 'streak-30',
      name: 'Месяц дисциплины',
      description: '30 дней без пропусков',
      icon: '🏆',
      unlocked: streakDays >= 30,
      progress: Math.min(100, Math.round((streakDays / 30) * 100)),
    },
    {
      id: 'meals-10',
      name: 'Первые 10',
      description: 'Запиши 10 приёмов пищи',
      icon: '🍽️',
      unlocked: totalLogs >= 10,
      progress: Math.min(100, Math.round((totalLogs / 10) * 100)),
    },
    {
      id: 'meals-50',
      name: 'Полсотни',
      description: '50 записей в дневнике',
      icon: '📚',
      unlocked: totalLogs >= 50,
      progress: Math.min(100, Math.round((totalLogs / 50) * 100)),
    },
    {
      id: 'water-day',
      name: 'Водный баланс',
      description: 'Выполни норму воды за день',
      icon: '💧',
      unlocked: waterComplete,
      progress: waterNorm > 0 ? Math.min(100, Math.round((waterGlasses / waterNorm) * 100)) : 0,
    },
    {
      id: 'photo-first',
      name: 'Фото-нутрициолог',
      description: 'Сделай первый фото-анализ',
      icon: '📸',
      unlocked: photosUsed >= 1,
      progress: photosUsed >= 1 ? 100 : 0,
    },
    {
      id: 'photo-10',
      name: 'Фото-марафон',
      description: 'Проанализируй 10 фото',
      icon: '🎯',
      unlocked: photosUsed >= 10,
      progress: Math.min(100, Math.round((photosUsed / 10) * 100)),
    },
  ];
}

export default function BadgeList(props: Props) {
  const badges = computeBadges(props);
  const unlocked = badges.filter(b => b.unlocked).length;

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="section-title">
        Достижения
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {unlocked}/{badges.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {badges.map(badge => (
          <div key={badge.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 4px', borderRadius: 14,
            background: badge.unlocked ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${badge.unlocked ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)'}`,
            opacity: badge.unlocked ? 1 : 0.5,
            position: 'relative',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4, filter: badge.unlocked ? 'none' : 'grayscale(1)' }}>
              {badge.icon}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
              {badge.name}
            </div>
            {/* Progress bar for incomplete badges */}
            {!badge.unlocked && badge.progress > 0 && (
              <div style={{
                width: '80%', height: 3, borderRadius: 2, marginTop: 4,
                background: 'rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  width: `${badge.progress}%`, height: '100%', borderRadius: 2,
                  background: 'var(--accent-purple)',
                }} />
              </div>
            )}
            {badge.unlocked && (
              <div style={{
                position: 'absolute', top: 2, right: 4,
                fontSize: 8, color: 'var(--green)',
              }}>✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
