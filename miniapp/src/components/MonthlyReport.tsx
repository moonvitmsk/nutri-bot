import React from 'react';

interface Props {
  monthData: { date: string; calories: number; protein: number; fat: number; carbs: number; logged: boolean }[];
  target: { calories: number; protein: number; fat: number; carbs: number };
}

export default function MonthlyReport({ monthData, target }: Props) {
  const loggedDays = monthData.filter(d => d.logged);
  const avgCal = loggedDays.length > 0 ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0;
  const maxCal = Math.max(...monthData.map(d => d.calories), target.calories);

  return (
    <div>
      <div className="section-title">Прогресс за 30 дней</div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '12px 8px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: 'var(--accent-purple)' }}>
            {loggedDays.length}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>дней залогировано</div>
        </div>
        <div className="card stat-cosmic" style={{ flex: 1, padding: '12px 8px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: 'var(--yellow)' }}>
            {avgCal}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>ср. ккал/день</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card" style={{ padding: '16px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Калории по дням</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
          {monthData.map((d, i) => {
            const h = d.logged ? Math.max((d.calories / maxCal) * 100, 2) : 0;
            const overTarget = d.calories > target.calories * 1.1;
            const isToday = d.date === new Date().toISOString().split('T')[0];
            return (
              <div key={d.date} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  width: '100%', maxWidth: 8, height: `${h}%`, minHeight: d.logged ? 2 : 0,
                  borderRadius: '3px 3px 0 0',
                  background: !d.logged ? 'rgba(255,255,255,0.04)' : overTarget ? 'var(--red)' : 'var(--accent-purple)',
                  opacity: d.logged ? 0.8 : 0.3,
                  border: isToday ? '1px solid var(--yellow)' : 'none',
                }} />
              </div>
            );
          })}
        </div>
        {/* Target line label */}
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', marginTop: 4 }}>
          Норма: {target.calories} ккал
        </div>
      </div>
    </div>
  );
}
