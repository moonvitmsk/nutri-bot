import React from 'react';
import type { UserProfile } from '../types';

interface Props {
  user: UserProfile | null;
}

export default function ProfileCard({ user }: Props) {
  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🧑‍🚀</div>
        <div style={{ fontWeight: 600 }}>Загрузка профиля...</div>
      </div>
    );
  }

  const subLabel: Record<string, string> = { free: 'Explorer', trial: 'Pilot', premium: 'Commander' };
  const subColor: Record<string, string> = { free: 'var(--text-secondary)', trial: 'var(--accent-cyan)', premium: 'var(--accent-purple)' };
  const subGlow: Record<string, string> = { free: 'none', trial: '0 0 8px rgba(34,211,238,0.3)', premium: '0 0 8px rgba(124,58,237,0.3)' };

  return (
    <div>
      {/* Avatar card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 10, padding: '24px 16px 20px' }}>
        {/* Avatar with orbit */}
        <div className="profile-orbit">
          <div style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #60A5FA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.25)',
          }}>
            {(user.name || '?')[0].toUpperCase()}
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: subColor[user.subscription_type] || 'var(--text-secondary)',
          background: `${subColor[user.subscription_type] || 'var(--text-secondary)'}12`,
          padding: '4px 12px',
          borderRadius: 20,
          boxShadow: subGlow[user.subscription_type] || 'none',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'currentColor',
            boxShadow: '0 0 4px currentColor',
          }} />
          {subLabel[user.subscription_type] || user.subscription_type}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div className="card stat-cosmic" style={{ padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--yellow)',
          }}>
            {user.streak_days}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {user.streak_days > 0 ? '🔥 стрик' : '💤 стрик'}
          </div>
        </div>
        <div className="card stat-cosmic" style={{ padding: '14px 8px', animationDelay: '0.1s' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--accent-cyan)',
          }}>
            {user.xp}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            ⚡ XP (ур. {user.level})
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div className="section-title">Параметры</div>
        {[
          ['Пол', user.sex === 'male' ? 'Мужской' : 'Женский'],
          ['Возраст', `${user.age} лет`],
          ['Рост', `${user.height_cm} см`],
          ['Вес', `${user.weight_kg} кг`],
          ['Цель', user.goal],
          ['Норма ккал', `${user.daily_calories}`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{
              fontWeight: 500,
              fontFamily: label === 'Норма ккал' ? "'JetBrains Mono', monospace" : 'inherit',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
