import React, { useState, useCallback } from 'react';
import { getMealPlan } from '../lib/api';

interface Props {
  initData: string;
}

export default function MealPlanPage({ initData }: Props) {
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week'>('week');

  const generate = useCallback(async (p: 'today' | 'week') => {
    setPeriod(p);
    setLoading(true);
    setPlan('');
    try {
      const res = await getMealPlan(initData || 'dev', p);
      if (res.ok && res.mealplan) {
        setPlan(res.mealplan);
      }
    } catch (err) {
      console.error('[mealplan]', err);
    } finally {
      setLoading(false);
    }
  }, [initData]);

  // Simple markdown-ish formatter
  const formatPlan = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 8 }} />;

      // Bold headers
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <div key={i} style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            marginTop: 12, marginBottom: 4,
            paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {trimmed.replace(/\*\*/g, '')}
          </div>
        );
      }

      // Meal lines with emoji
      if (/^[🌅🍎🍽🌙☀️]/.test(trimmed)) {
        return (
          <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text-primary)' }}>
            {trimmed}
          </div>
        );
      }

      // Итого line
      if (trimmed.toLowerCase().startsWith('итого')) {
        return (
          <div key={i} style={{
            fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)',
            padding: '2px 0', marginTop: 2,
          }}>
            {trimmed}
          </div>
        );
      }

      // Shopping list items
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        return (
          <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '1px 0 1px 12px' }}>
            {trimmed}
          </div>
        );
      }

      // Section headers (shopping list, etc)
      if (trimmed.includes('**')) {
        return (
          <div key={i} style={{ fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 4 }}>
            {trimmed.replace(/\*\*/g, '')}
          </div>
        );
      }

      return (
        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '1px 0' }}>
          {trimmed}
        </div>
      );
    });
  };

  return (
    <div>
      <div className="section-title">План питания</div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => generate('today')}
          disabled={loading}
          style={{
            flex: 1, padding: '14px 8px', borderRadius: 14,
            border: `1px solid ${period === 'today' && plan ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: period === 'today' && plan ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: loading ? 0.5 : 1,
          }}
        >
          На сегодня
        </button>
        <button
          onClick={() => generate('week')}
          disabled={loading}
          style={{
            flex: 1, padding: '14px 8px', borderRadius: 14,
            border: `1px solid ${period === 'week' && plan ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: period === 'week' && plan ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: loading ? 0.5 : 1,
          }}
        >
          На неделю
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 8 }}><span /><span /><span /></div>
          <div style={{ fontSize: 13, color: 'var(--accent-purple)' }}>
            Составляю план{period === 'week' ? ' на неделю' : ' на сегодня'}...
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>20-30 секунд</div>
        </div>
      )}

      {/* Generated plan */}
      {plan && !loading && (
        <div className="card" style={{ padding: '14px 16px' }}>
          {formatPlan(plan)}
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>AI составит план питания</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Под твой профиль, цели и норму КБЖУ
          </div>
        </div>
      )}
    </div>
  );
}
