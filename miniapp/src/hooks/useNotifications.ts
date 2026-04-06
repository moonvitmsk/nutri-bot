import { useState, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  autoDismiss?: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((n: Omit<Notification, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setNotifications(prev => [...prev, { ...n, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, notify, dismiss };
}
