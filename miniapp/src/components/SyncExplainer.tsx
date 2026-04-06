import React from 'react';

export default function SyncExplainer() {
  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>🔄</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Бот и приложение связаны</div>
          <div style={{ fontSize: 11, color: 'var(--green)' }}>● Синхронизировано</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <p style={{ margin: '0 0 8px' }}>
          Все данные синхронизируются автоматически:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>
            <span>Отправил фото в бот → оно в дневнике приложения</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>
            <span>Записал еду в приложении → бот знает про неё</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>
            <span>Вода, вес, профиль — всё общее</span>
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          💡 Совет: используй бот для быстрого ввода, а приложение — для графиков и AI-функций
        </p>
      </div>
    </div>
  );
}
