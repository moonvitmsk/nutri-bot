import React, { useState } from 'react';
import type { Achievement } from '../types';

interface Props {
  achievements: Achievement[];
}

// Default achievement definitions
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_meal', name: 'Первый шаг', description: 'Отправь первое фото еды', icon: '🍎', unlocked: false },
  { id: 'streak_3', name: '3 дня подряд', description: 'Записывай еду 3 дня подряд', icon: '🔥', unlocked: false },
  { id: 'streak_7', name: 'Неделя!', description: '7 дней подряд — ты молодец', icon: '🏆', unlocked: false },
  { id: 'streak_14', name: 'Две недели', description: '14 дней без перерыва', icon: '💪', unlocked: false },
  { id: 'streak_30', name: 'Месяц!', description: '30 дней — это привычка', icon: '🌟', unlocked: false },
  { id: 'water_10', name: 'Водохлёб', description: 'Выпей 10 стаканов воды', icon: '💧', unlocked: false },
  { id: 'protein_hit', name: 'Белковый удар', description: 'Набери 100% белка за день', icon: '🥩', unlocked: false },
  { id: 'balanced_day', name: 'Баланс', description: 'Все макро 80-120% от нормы', icon: '⚖️', unlocked: false },
  { id: 'lab_first', name: 'Аналитик', description: 'Загрузи первый анализ крови', icon: '🧪', unlocked: false },
  { id: 'qr_first', name: 'Moonvit fan', description: 'Отсканируй первый QR-код', icon: '📱', unlocked: false },
  { id: 'deepcheck', name: 'Глубокий анализ', description: 'Пройди глубокую консультацию', icon: '🔬', unlocked: false },
  { id: 'recipes_5', name: 'Шеф-повар', description: 'Получи 5 рецептов', icon: '👨‍🍳', unlocked: false },
  { id: 'invite_1', name: 'Посол', description: 'Пригласи первого друга', icon: '🎁', unlocked: false },
  { id: 'meals_50', name: '50 приёмов', description: 'Записано 50 приёмов пищи', icon: '📝', unlocked: false },
  { id: 'meals_100', name: 'Сотня!', description: '100 записей — серьёзный подход', icon: '💯', unlocked: false },
  { id: 'night_owl', name: 'Сова', description: 'Запись после 23:00', icon: '🦉', unlocked: false },
  { id: 'early_bird', name: 'Жаворонок', description: 'Запись до 7:00', icon: '🐦', unlocked: false },
  { id: 'supplement', name: 'Витаминщик', description: 'Отсканируй этикетку БАД', icon: '💊', unlocked: false },
  { id: 'voice_msg', name: 'Голос', description: 'Отправь голосовое сообщение', icon: '🎙', unlocked: false },
  { id: 'allergy_set', name: 'Безопасность', description: 'Укажи аллергии в профиле', icon: '🛡', unlocked: false },
  { id: 'mealplan', name: 'Планировщик', description: 'Получи план питания', icon: '📋', unlocked: false },
  { id: 'premium', name: 'VIP', description: 'Активируй Premium', icon: '👑', unlocked: false },
  { id: 'streak_100', name: 'Легенда', description: '100 дней подряд', icon: '🏅', unlocked: false },
  { id: 'xp_1000', name: '1000 XP', description: 'Набери 1000 очков опыта', icon: '⭐', unlocked: false },
];

export default function AchievementGrid({ achievements }: Props) {
  const [selected, setSelected] = useState<Achievement | null>(null);

  const merged = DEFAULT_ACHIEVEMENTS.map((def) => {
    const actual = achievements.find((a) => a.id === def.id);
    return actual ? { ...def, unlocked: true, unlocked_at: actual.unlocked_at } : def;
  });

  const unlocked = merged.filter((a) => a.unlocked).length;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Достижения</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{unlocked} / {merged.length}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {merged.map((a) => (
          <div
            key={a.id}
            className="card"
            onClick={() => setSelected(a)}
            style={{
              textAlign: 'center',
              padding: 10,
              cursor: 'pointer',
              opacity: a.unlocked ? 1 : 0.4,
              filter: a.unlocked ? 'none' : 'grayscale(1)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 2 }}>{a.icon}</div>
            <div style={{ fontSize: 10, lineHeight: 1.2 }}>{a.name}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 100,
          }}
        >
          <div className="card" style={{ maxWidth: 300, textAlign: 'center', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{selected.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{selected.description}</div>
            <div style={{ fontSize: 12, color: selected.unlocked ? 'var(--green)' : 'var(--red)' }}>
              {selected.unlocked ? '✓ Разблокировано' : '🔒 Заблокировано'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
