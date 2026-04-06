import React, { useState } from 'react';

const SECTIONS = [
  {
    title: 'Что такое КБЖУ?',
    icon: '📊',
    content: 'КБЖУ — это калории, белки, жиры и углеводы. Это 4 основных показателя, по которым оценивается питание.',
    details: [
      { label: 'Калории (К)', desc: 'Энергия из еды. Норма: 1500-2500 ккал/день в зависимости от пола, возраста и активности.', color: 'var(--yellow)' },
      { label: 'Белки (Б)', desc: 'Строительный материал для мышц. Мясо, рыба, творог, яйца. Норма: 0.8-1.5 г на кг веса.', color: 'var(--pink)' },
      { label: 'Жиры (Ж)', desc: 'Нужны для гормонов и мозга. Масло, орехи, рыба. Норма: 0.8-1 г на кг веса.', color: 'var(--accent-purple)' },
      { label: 'Углеводы (У)', desc: 'Топливо для энергии. Крупы, хлеб, фрукты. Норма: 3-5 г на кг веса.', color: 'var(--accent-blue)' },
    ],
  },
  {
    title: 'Примеры на продуктах',
    icon: '🛒',
    content: 'Сколько КБЖУ в привычных продуктах из магазина:',
    examples: [
      { name: 'Гречка (200г варёная)', cal: 240, p: 8, f: 3, c: 46 },
      { name: 'Куриная грудка (150г)', cal: 250, p: 38, f: 8, c: 0 },
      { name: 'Творог 5% (200г)', cal: 240, p: 34, f: 10, c: 6 },
      { name: 'Яйцо варёное (1 шт)', cal: 70, p: 6, f: 5, c: 0 },
      { name: 'Хлеб чёрный (1 кусок)', cal: 65, p: 2, f: 1, c: 12 },
      { name: 'Банан (1 шт)', cal: 90, p: 1, f: 0, c: 22 },
      { name: 'Молоко 2.5% (стакан)', cal: 130, p: 7, f: 6, c: 12 },
      { name: 'Борщ (тарелка 300мл)', cal: 215, p: 12, f: 8, c: 24 },
    ],
  },
  {
    title: 'Как читать этикетки',
    icon: '🏷️',
    content: 'На упаковке КБЖУ указано на 100г. Чтобы узнать для своей порции: раздели вес порции на 100 и умножь на цифру с этикетки.',
    tip: 'Пример: на этикетке сыра 350 ккал/100г. Кладёшь 30г → 350 × 0.3 = 105 ккал',
  },
  {
    title: 'Частые вопросы',
    icon: '❓',
    content: '',
    faq: [
      { q: 'Надо ли считать калории каждый день?', a: 'Не обязательно идеально. moonvit считает автоматически — просто фотографируй еду.' },
      { q: 'Что важнее — калории или белки?', a: 'Для похудения — калории (нужен дефицит). Для мышц — белки. Лучше следить за обоими.' },
      { q: 'Сколько пить воды?', a: '~30 мл на кг веса. При 70 кг = ~2.1 литра = 8-9 стаканов.' },
      { q: 'Можно ли есть после 18:00?', a: 'Да! Важно общее количество за день, а не время. Но лёгкий ужин за 2 часа до сна — идеально.' },
    ],
  },
];

export default function KBJUGuide() {
  const [expanded, setExpanded] = useState<number>(0);

  return (
    <div>
      <div className="section-title">Справочник КБЖУ</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Простое объяснение для начинающих
      </div>

      {SECTIONS.map((s, i) => (
        <div key={i} className="card" style={{
          marginBottom: 8, padding: '14px 16px', cursor: 'pointer',
          border: expanded === i ? '1px solid rgba(124,58,237,0.2)' : undefined,
        }} onClick={() => setExpanded(expanded === i ? -1 : i)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: expanded === i ? 10 : 0 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{s.title}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expanded === i ? '▲' : '▼'}</span>
          </div>

          {expanded === i && (
            <div>
              {s.content && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{s.content}</div>}

              {s.details?.map((d, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 6, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: d.color }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d.desc}</div>
                  </div>
                </div>
              ))}

              {s.examples?.map((ex, j) => (
                <div key={j} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{ex.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-primary)' }}>
                    {ex.cal} | Б{ex.p} Ж{ex.f} У{ex.c}
                  </span>
                </div>
              ))}

              {s.tip && (
                <div style={{
                  background: 'rgba(124,58,237,0.08)', borderRadius: 10, padding: '10px 12px',
                  fontSize: 12, color: 'var(--accent-purple)', marginTop: 8, lineHeight: 1.5,
                }}>
                  💡 {s.tip}
                </div>
              )}

              {s.faq?.map((f, j) => (
                <div key={j} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.q}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
