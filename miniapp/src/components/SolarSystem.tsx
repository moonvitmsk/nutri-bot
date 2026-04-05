import React, { useEffect, useState } from 'react';

interface Props {
  calories: number;
  caloriesMax: number;
  protein: number;
  proteinMax: number;
  fat: number;
  fatMax: number;
  carbs: number;
  carbsMax: number;
}

interface Ring {
  label: string;
  value: number;
  max: number;
  color: string;
  r: number;       // orbit radius
  width: number;   // stroke width
  dur: number;     // orbit duration (s)
  dotR: number;    // planet dot radius
}

export default function SolarSystem({ calories, caloriesMax, protein, proteinMax, fat, fatMax, carbs, carbsMax }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const totalPct = caloriesMax > 0 ? Math.min(Math.round((calories / caloriesMax) * 100), 999) : 0;

  const rings: Ring[] = [
    { label: `${Math.round(calories)}`,  value: calories, max: caloriesMax, color: '#FBBF24', r: 48, width: 5,   dur: 40, dotR: 7 },
    { label: `${Math.round(protein)}г`,  value: protein,  max: proteinMax,  color: '#F472B6', r: 64, width: 4.5, dur: 30, dotR: 6.5 },
    { label: `${Math.round(fat)}г`,      value: fat,      max: fatMax,      color: '#A78BFA', r: 80, width: 4,   dur: 24, dotR: 6 },
    { label: `${Math.round(carbs)}г`,    value: carbs,    max: carbsMax,    color: '#60A5FA', r: 96, width: 4,   dur: 20, dotR: 6 },
  ];

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="sg">
            <stop offset="0%" stopColor="rgba(124,58,237,0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-s">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx={cx} cy={cy} r="50" fill="url(#sg)" />

        {/* Progress rings (tracks + fills) */}
        {rings.map((ring, i) => {
          const circ = 2 * Math.PI * ring.r;
          const pct = ring.max > 0 ? Math.min(ring.value / ring.max, 1) : 0;
          const fill = mounted ? pct * circ : 0;

          return (
            <g key={`ring${i}`}>
              {/* Track */}
              <circle
                cx={cx} cy={cy} r={ring.r}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={ring.width}
              />
              {/* Fill arc */}
              <circle
                cx={cx} cy={cy} r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth={ring.width}
                strokeDasharray={`${fill} ${circ}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={0.7}
                filter="url(#glow)"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </g>
          );
        })}

        {/* Center text */}
        <circle cx={cx} cy={cy} r="30" fill="rgba(124,58,237,0.05)" />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
          {totalPct}%
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'Outfit', sans-serif">
          нормы
        </text>

        {/* Orbiting planet dots with values */}
        {rings.map((ring, i) => {
          const pct = ring.max > 0 ? Math.min(ring.value / ring.max, 1) : 0;
          const brightness = 0.4 + pct * 0.6;
          return (
            <g key={`dot${i}`}>
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`${i * 90} ${cx} ${cy}`}
                  to={`${i * 90 + 360} ${cx} ${cy}`}
                  dur={`${ring.dur}s`}
                  repeatCount="indefinite"
                />
                {/* Planet glow */}
                <circle
                  cx={cx + ring.r} cy={cy}
                  r={ring.dotR * 2}
                  fill={ring.color} opacity={brightness * 0.1}
                  filter="url(#glow-s)"
                />
                {/* Planet body */}
                <circle
                  cx={cx + ring.r} cy={cy}
                  r={ring.dotR}
                  fill={ring.color} opacity={brightness}
                />
                {/* Value text */}
                <text
                  x={cx + ring.r} y={cy + 3}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                  opacity={0.9}
                >
                  {ring.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {rings.map((ring, i) => {
          const pct = ring.max > 0 ? Math.round((ring.value / ring.max) * 100) : 0;
          const labels = ['ккал', 'белок', 'жиры', 'углев'];
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, fontWeight: 600, color: ring.color,
              }}>
                {ring.label}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                {labels[i]} {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
