import React from 'react';

interface Props {
  vitamins: Record<string, number>;
  norms: Record<string, { name: string; unit: string; daily: number }>;
}

interface Tip {
  nutrient: string;
  pct: number;
  foods: string;
  moonvit?: string;
}

// Simple rule-based recommendations from deficit data
function computeTips(
  vitamins: Record<string, number>,
  norms: Record<string, { name: string; unit: string; daily: number }>,
): Tip[] {
  const foodSources: Record<string, { foods: string; moonvit?: string }> = {
    vitamin_a: { foods: 'Морковь, тыква, печень, яйца', moonvit: 'Moonvit Vita' },
    vitamin_c: { foods: 'Цитрусовые, киви, болгарский перец, капуста' },
    vitamin_d: { foods: 'Жирная рыба, яйца, грибы', moonvit: 'Moonvit Luna' },
    vitamin_e: { foods: 'Орехи, семена, авокадо, оливковое масло' },
    vitamin_b1: { foods: 'Свинина, крупы, бобовые, семечки' },
    vitamin_b2: { foods: 'Молочные продукты, яйца, миндаль' },
    vitamin_b6: { foods: 'Курица, картофель, бананы, нут' },
    vitamin_b12: { foods: 'Мясо, рыба, яйца, молоко', moonvit: 'Moonvit B-Complex' },
    vitamin_b9: { foods: 'Листовая зелень, бобовые, цитрусовые' },
    iron: { foods: 'Красное мясо, гречка, шпинат, чечевица' },
    calcium: { foods: 'Молочные продукты, кунжут, брокколи', moonvit: 'Moonvit Luna' },
    magnesium: { foods: 'Тёмный шоколад, орехи, авокадо, бананы', moonvit: 'Moonvit Luna' },
    zinc: { foods: 'Устрицы, говядина, тыквенные семечки' },
    selenium: { foods: 'Бразильский орех, рыба, яйца, чеснок' },
  };

  const tips: Tip[] = [];
  for (const [key, norm] of Object.entries(norms)) {
    const amount = vitamins[key] || 0;
    const pct = norm.daily > 0 ? Math.round((amount / norm.daily) * 100) : 100;
    if (pct < 60) {
      const src = foodSources[key];
      tips.push({
        nutrient: norm.name,
        pct,
        foods: src?.foods || 'Разнообразное питание',
        moonvit: src?.moonvit,
      });
    }
  }

  return tips.sort((a, b) => a.pct - b.pct).slice(0, 5);
}

export default function Recommendations({ vitamins, norms }: Props) {
  const tips = computeTips(vitamins, norms);

  if (!tips.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
        <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
          Все нутриенты в зелёной зоне!
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="section-title">Что добавить сегодня</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tips.map((tip, i) => (
          <div
            key={tip.nutrient}
            className="vitamin-orb"
            style={{ animationDelay: `${i * 0.05}s`, padding: '10px 12px' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: tip.pct < 30 ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700,
                color: tip.pct < 30 ? 'var(--red)' : 'var(--yellow)',
              }}>
                {tip.pct}%
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{tip.nutrient}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {tip.foods}
              </div>
            </div>
            {tip.moonvit && (
              <div style={{
                fontSize: 9, fontWeight: 600,
                color: 'var(--accent-purple)',
                background: 'rgba(124,58,237,0.1)',
                padding: '3px 7px', borderRadius: 6,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {tip.moonvit}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
