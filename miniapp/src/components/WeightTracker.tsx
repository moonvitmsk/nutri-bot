import React, { useState, useMemo } from 'react';
import type { WeightEntry } from '../types';

interface Props {
  entries: WeightEntry[];
  currentWeight: number;
  onLogWeight: (kg: number) => Promise<void>;
  loading?: boolean;
}

export default function WeightTracker({ entries, currentWeight, onLogWeight, loading }: Props) {
  const [inputWeight, setInputWeight] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = async () => {
    const w = parseFloat(inputWeight.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 400) return;
    await onLogWeight(w);
    setInputWeight('');
    setShowInput(false);
  };

  // SVG chart data
  const chartData = useMemo(() => {
    if (entries.length < 2) return null;

    const last30 = entries.slice(-30);
    const weights = last30.map(e => e.weight_kg);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;

    const W = 280;
    const H = 120;
    const padX = 0;
    const padY = 8;

    const points = last30.map((e, i) => {
      const x = padX + (i / (last30.length - 1)) * (W - padX * 2);
      const y = padY + (1 - (e.weight_kg - minW) / range) * (H - padY * 2);
      return { x, y, w: e.weight_kg, date: e.created_at };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    // Gradient area
    const areaD = pathD +
      ` L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;

    // Trend line (simple linear regression)
    const n = weights.length;
    const sumX = weights.reduce((s, _, i) => s + i, 0);
    const sumY = weights.reduce((s, w) => s + w, 0);
    const sumXY = weights.reduce((s, w, i) => s + i * w, 0);
    const sumX2 = weights.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trendStart = intercept;
    const trendEnd = intercept + slope * (n - 1);
    const ty1 = padY + (1 - (trendStart - minW) / range) * (H - padY * 2);
    const ty2 = padY + (1 - (trendEnd - minW) / range) * (H - padY * 2);

    const delta = entries.length >= 2
      ? entries[entries.length - 1].weight_kg - entries[0].weight_kg
      : 0;

    return { points, pathD, areaD, minW, maxW, W, H, ty1, ty2, slope, delta };
  }, [entries]);

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const delta = chartData?.delta || 0;

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="section-title">Трекер веса</div>

      {/* Current weight + delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28, fontWeight: 700,
        }}>
          {currentWeight}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>кг</span>
        {delta !== 0 && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: delta < 0 ? 'var(--green)' : delta > 0 ? 'var(--red)' : 'var(--text-secondary)',
            marginLeft: 4,
          }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} кг
          </span>
        )}
      </div>

      {/* SVG Chart */}
      {chartData && (
        <div style={{ marginBottom: 12 }}>
          <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} style={{ width: '100%', height: 120 }}>
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={chartData.areaD} fill="url(#wg)" />
            {/* Line */}
            <path d={chartData.pathD} fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Trend line */}
            <line
              x1={chartData.points[0].x} y1={chartData.ty1}
              x2={chartData.points[chartData.points.length - 1].x} y2={chartData.ty2}
              stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"
            />
            {/* Last point */}
            <circle
              cx={chartData.points[chartData.points.length - 1].x}
              cy={chartData.points[chartData.points.length - 1].y}
              r="4" fill="var(--accent-purple)" stroke="#fff" strokeWidth="1.5"
            />
            {/* Min/Max labels */}
            <text x="2" y={chartData.H - 2} fontSize="9" fill="var(--text-secondary)" fontFamily="'JetBrains Mono', monospace">
              {chartData.minW.toFixed(0)}
            </text>
            <text x="2" y="10" fontSize="9" fill="var(--text-secondary)" fontFamily="'JetBrains Mono', monospace">
              {chartData.maxW.toFixed(0)}
            </text>
          </svg>
        </div>
      )}

      {entries.length < 2 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
          Добавь 2+ записи для отображения графика
        </div>
      )}

      {/* Add weight input */}
      {showInput ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            step="0.1"
            value={inputWeight}
            onChange={e => setInputWeight(e.target.value)}
            placeholder={`${currentWeight}`}
            autoFocus
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12,
              padding: '10px 14px', color: 'var(--text-primary)', fontSize: 16,
              fontFamily: "'JetBrains Mono', monospace", outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
            OK
          </button>
          <button onClick={() => { setShowInput(false); setInputWeight(''); }} style={{
            padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            X
          </button>
        </div>
      ) : (
        <button onClick={() => setShowInput(true)} style={{
          width: '100%', padding: '10px', borderRadius: 12,
          border: '1px dashed rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)',
          color: 'var(--accent-purple)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Записать вес
        </button>
      )}

      {/* Last entry date */}
      {lastEntry && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
          Последняя запись: {new Date(lastEntry.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  );
}
