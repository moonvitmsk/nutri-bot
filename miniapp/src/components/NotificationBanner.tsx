import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  autoDismiss?: number; // ms
}

interface Props {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export default function NotificationBanner({ notifications, onDismiss }: Props) {
  if (!notifications.length) return null;

  return (
    <div style={{ position: 'fixed', top: 8, left: 8, right: 8, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {notifications.map(n => (
        <NotificationItem key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}

function NotificationItem({ notification: n, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  useEffect(() => {
    if (n.autoDismiss) {
      const t = setTimeout(onDismiss, n.autoDismiss);
      return () => clearTimeout(t);
    }
  }, [n.autoDismiss, onDismiss]);

  const colors = {
    info: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', text: '#60a5fa' },
    success: { bg: 'rgba(110,231,183,0.12)', border: 'rgba(110,231,183,0.25)', text: '#6ee7b7' },
    warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', text: '#fbbf24' },
    achievement: { bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)', text: '#a78bfa' },
  };
  const c = colors[n.type];

  return (
    <div
      onClick={onDismiss}
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', backdropFilter: 'blur(12px)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      {n.icon && <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{n.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
      </div>
      <span style={{ color: 'var(--text-secondary)', fontSize: 18 }}>&times;</span>
    </div>
  );
}
