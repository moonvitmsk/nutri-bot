import React from 'react';
import type { FoodLog } from '../types';

interface Props {
  logs: FoodLog[];
  onSelect: (log: FoodLog) => void;
}

export default function PhotoGallery({ logs, onSelect }: Props) {
  const photoLogs = logs.filter(l => l.photo_url);

  if (!photoLogs.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F4F7}'}</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Нет фото еды</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Сфотографируй блюдо, чтобы AI определил КБЖУ</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">Фото еды ({photoLogs.length})</div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4, borderRadius: 12, overflow: 'hidden',
      }}>
        {photoLogs.map(log => (
          <div
            key={log.id}
            onClick={() => onSelect(log)}
            style={{
              aspectRatio: '1', cursor: 'pointer',
              background: '#1a1a2e', position: 'relative', overflow: 'hidden',
            }}
          >
            <img
              src={log.photo_url}
              alt={log.description}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '16px 6px 4px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--yellow)' }}>
                {log.calories} ккал
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
