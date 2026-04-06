import React, { useState, useCallback } from 'react';
import { chatWithAI } from '../lib/api';

interface Props {
  initData: string;
  weekSummary: {
    avgCalories: number;
    avgProtein: number;
    avgFat: number;
    avgCarbs: number;
    loggedDays: number;
    streak: number;
  };
}

export default function WeeklyInsights({ initData, weekSummary }: Props) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = `Проанализируй мои данные за неделю и дай 3-5 кратких инсайтов:\n- Среднее: ${weekSummary.avgCalories} ккал, Б${weekSummary.avgProtein} Ж${weekSummary.avgFat} У${weekSummary.avgCarbs}\n- Залогировано ${weekSummary.loggedDays}/7 дней\n- Серия: ${weekSummary.streak} дней\nДай конкретные советы, что улучшить на следующей неделе.`;
      const res = await chatWithAI(initData, prompt);
      if (res.ok) setInsights(res.reply);
    } catch (err) {
      console.error('[insights]', err);
    } finally {
      setLoading(false);
    }
  }, [initData, weekSummary]);

  return (
    <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
      <div className="section-title">AI-инсайты за неделю</div>

      {!insights && !loading && (
        <button
          onClick={generate}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            border: '1px solid rgba(124,58,237,0.2)',
            background: 'rgba(124,58,237,0.06)',
            color: 'var(--accent-purple)', fontSize: 14,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {'\u{1F9E0}'} Получить AI-инсайты
        </button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 8 }}><span /><span /><span /></div>
          <div style={{ fontSize: 12, color: 'var(--accent-purple)' }}>AI анализирует...</div>
        </div>
      )}

      {insights && (
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {insights}
        </div>
      )}
    </div>
  );
}
