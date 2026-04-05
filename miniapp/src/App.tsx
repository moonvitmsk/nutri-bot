import React, { useState, useEffect, useCallback } from 'react';
import { useMAXBridge } from './hooks/useMAXBridge';
import {
  authenticate, updateWater, deleteFood, addFood,
  type AuthResponse, type ApiUser, type ApiLog, type ApiWeekDay,
} from './lib/api';
import DailyProgress from './components/DailyProgress';
import VitaminChart from './components/VitaminChart';
import FoodDiary from './components/FoodDiary';
import WeeklyReport from './components/WeeklyReport';
import ProfileCard from './components/ProfileCard';
import VitaminsPage from './components/VitaminsPage';
import LoadingScreen from './components/LoadingScreen';
import MealDetail from './components/MealDetail';
import AddFoodForm from './components/AddFoodForm';
import Recommendations from './components/Recommendations';
import type { UserProfile, FoodLog, VitaminData, WeekDay } from './types';

type Page = 'today' | 'diary' | 'week' | 'vitamins' | 'profile';

// ── Mappers ──

function toUserProfile(u: ApiUser): UserProfile {
  return {
    id: u.id,
    name: u.name || 'Пользователь',
    sex: u.sex || 'male',
    age: u.age || 0,
    height_cm: u.height_cm || 0,
    weight_kg: u.weight_kg || 0,
    goal: u.goal_text || u.goal || '',
    daily_calories: u.daily_calories || 2000,
    daily_protein: u.daily_protein || 100,
    daily_fat: u.daily_fat || 70,
    daily_carbs: u.daily_carbs || 250,
    streak_days: u.streak_days,
    xp: 0,
    level: 1,
    subscription_type: u.subscription_type,
    achievements: [],
    water_norm: u.water_norm || 8,
  };
}

function toFoodLogs(logs: ApiLog[]): FoodLog[] {
  return logs.map(l => ({
    id: l.id,
    description: l.description || 'Приём пищи',
    calories: l.calories,
    protein: l.protein,
    fat: l.fat,
    carbs: l.carbs,
    created_at: l.created_at,
    confirmed: true,
    photo_url: l.photo_url || undefined,
    micronutrients: l.micronutrients || undefined,
    items: l.items || undefined,
    comment: l.comment || undefined,
  }));
}

function toVitaminData(
  vitamins: Record<string, number>,
  norms: Record<string, { name: string; unit: string; daily: number }>,
): VitaminData[] {
  const keys = [
    'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e',
    'vitamin_b1', 'vitamin_b2', 'vitamin_b6', 'vitamin_b12',
    'vitamin_b9', 'iron', 'calcium', 'magnesium', 'zinc', 'selenium',
  ];
  return keys
    .filter(k => norms[k])
    .map(k => {
      const norm = norms[k];
      const amount = vitamins[k] || 0;
      const pct = norm.daily > 0 ? Math.round((amount / norm.daily) * 100) : 0;
      return { name: norm.name, value: pct, color: '' };
    });
}

// ── Mock data ──

const MOCK: AuthResponse = {
  ok: true,
  user: {
    id: 'dev-1', name: 'Разработчик', sex: 'male', age: 30,
    height_cm: 180, weight_kg: 78, goal: 'maintain', goal_text: 'Поддержание',
    daily_calories: 2200, daily_protein: 120, daily_fat: 75, daily_carbs: 270,
    water_glasses: 3, water_norm: 9, streak_days: 5,
    subscription_type: 'trial', onboarding_completed: true,
  },
  logs: [
    {
      id: '1', description: 'Овсянка с ягодами', calories: 320, protein: 12, fat: 8, carbs: 52,
      photo_url: null, created_at: new Date().toISOString(),
      micronutrients: { vitamin_b1: 0.4, vitamin_b6: 0.3, iron: 2.5, magnesium: 60, zinc: 1.5 },
      items: [{ name: 'Овсянка', weight_g: 80, calories: 240, protein: 8, fat: 5, carbs: 40 }, { name: 'Ягоды', weight_g: 100, calories: 80, protein: 4, fat: 3, carbs: 12 }],
      comment: 'Отличный завтрак! Богат клетчаткой и сложными углеводами.',
    },
    {
      id: '2', description: 'Куриная грудка + рис', calories: 480, protein: 42, fat: 10, carbs: 55,
      photo_url: null, created_at: new Date().toISOString(),
      micronutrients: { vitamin_b6: 0.8, vitamin_b12: 0.5, iron: 1.5, zinc: 3, selenium: 25 },
      items: [{ name: 'Куриная грудка', weight_g: 200, calories: 330, protein: 38, fat: 8, carbs: 0 }, { name: 'Рис', weight_g: 150, calories: 150, protein: 4, fat: 2, carbs: 55 }],
      comment: 'Классический обед — много белка для восстановления.',
    },
    {
      id: '3', description: 'Творог с бананом', calories: 280, protein: 22, fat: 6, carbs: 35,
      photo_url: null, created_at: new Date(Date.now() - 86400000).toISOString(),
      micronutrients: { calcium: 200, vitamin_b2: 0.3, vitamin_b12: 0.8 },
      items: null, comment: null,
    },
  ],
  today_vitamins: {
    vitamin_c: 45, vitamin_d: 5, vitamin_a: 300, vitamin_e: 8,
    vitamin_b1: 0.9, vitamin_b2: 1.0, vitamin_b6: 1.2, vitamin_b12: 2.5, vitamin_b9: 180,
    iron: 8, calcium: 400, magnesium: 150, zinc: 6, selenium: 25,
  },
  week: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const logged = i < 5;
    return {
      date: d.toISOString().split('T')[0],
      calories: logged ? 1800 + Math.floor(Math.random() * 600) : 0,
      protein: logged ? 80 + Math.floor(Math.random() * 60) : 0,
      fat: logged ? 50 + Math.floor(Math.random() * 40) : 0,
      carbs: logged ? 200 + Math.floor(Math.random() * 100) : 0,
      logged,
    };
  }),
  norms: {
    vitamin_a: { name: 'Витамин A', unit: 'мкг', daily: 900 },
    vitamin_b1: { name: 'Витамин B1', unit: 'мг', daily: 1.5 },
    vitamin_b2: { name: 'Витамин B2', unit: 'мг', daily: 1.8 },
    vitamin_b6: { name: 'Витамин B6', unit: 'мг', daily: 2.0 },
    vitamin_b9: { name: 'Фолиевая к-та', unit: 'мкг', daily: 400 },
    vitamin_b12: { name: 'Витамин B12', unit: 'мкг', daily: 3.0 },
    vitamin_c: { name: 'Витамин C', unit: 'мг', daily: 100 },
    vitamin_d: { name: 'Витамин D', unit: 'мкг', daily: 15 },
    vitamin_e: { name: 'Витамин E', unit: 'мг', daily: 15 },
    calcium: { name: 'Кальций', unit: 'мг', daily: 1000 },
    iron: { name: 'Железо', unit: 'мг', daily: 10 },
    magnesium: { name: 'Магний', unit: 'мг', daily: 400 },
    zinc: { name: 'Цинк', unit: 'мг', daily: 12 },
    selenium: { name: 'Селен', unit: 'мкг', daily: 70 },
  },
  lab_results: [],
};

// ── Tab bar icons ──

const icons: Record<Page, string> = {
  today: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  diary: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  week: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  vitamins: 'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z',
  profile: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
};

const labels: Record<Page, string> = {
  today: 'Сегодня',
  diary: 'Дневник',
  week: 'Неделя',
  vitamins: 'Витамины',
  profile: 'Профиль',
};

// ── App ──

export default function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [page, setPage] = useState<Page>('today');
  const [data, setData] = useState<AuthResponse | null>(null);
  const [selectedLog, setSelectedLog] = useState<FoodLog | null>(null);
  const [showAddFood, setShowAddFood] = useState(false);
  const [addFoodLoading, setAddFoodLoading] = useState(false);
  const bridge = useMAXBridge();

  const initData = bridge?.initData || '';

  useEffect(() => {
    async function init() {
      if (!bridge?.initData) {
        setData(MOCK);
        setState('ready');
        return;
      }
      try {
        const result = await authenticate(bridge.initData);
        setData(result);
        setState('ready');
        bridge.ready();
      } catch (err: any) {
        console.error('[miniapp] Auth failed:', err);
        setError(err.message || 'Ошибка загрузки');
        setState('error');
      }
    }
    init();
  }, []);

  // ── Mutation handlers ──

  const handleWaterChange = useCallback(async (delta: number) => {
    if (!data) return;
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      user: { ...prev.user, water_glasses: Math.max(0, prev.user.water_glasses + delta) },
    } : prev);
    bridge?.HapticFeedback?.impactOccurred('light');

    if (initData) {
      try {
        const res = await updateWater(initData, delta);
        setData(prev => prev ? {
          ...prev,
          user: { ...prev.user, water_glasses: res.water_glasses },
        } : prev);
      } catch { /* optimistic update stays */ }
    }
  }, [data, initData, bridge]);

  const handleDeleteFood = useCallback(async (logId: string) => {
    if (!data) return;
    const logToRemove = data.logs.find(l => l.id === logId);

    // Optimistic remove
    setData(prev => prev ? { ...prev, logs: prev.logs.filter(l => l.id !== logId) } : prev);
    setSelectedLog(null);
    bridge?.HapticFeedback?.notificationOccurred('warning');

    // Recalculate today's vitamins
    if (logToRemove?.micronutrients) {
      setData(prev => {
        if (!prev) return prev;
        const updated = { ...prev.today_vitamins };
        for (const [k, v] of Object.entries(logToRemove.micronutrients!)) {
          if (typeof v === 'number') updated[k] = Math.max(0, (updated[k] || 0) - v);
        }
        return { ...prev, today_vitamins: updated };
      });
    }

    if (initData) {
      try { await deleteFood(initData, logId); }
      catch { /* already removed from UI */ }
    }
  }, [data, initData, bridge]);

  const handleAddFood = useCallback(async (text: string) => {
    if (!data) return;
    setAddFoodLoading(true);

    try {
      const res = await addFood(initData || 'dev', text);
      if (res.ok && res.log) {
        setData(prev => {
          if (!prev) return prev;
          const newLog = res.log!;
          // Add micronutrients to today's totals
          const updatedVitamins = { ...prev.today_vitamins };
          if (newLog.micronutrients) {
            for (const [k, v] of Object.entries(newLog.micronutrients)) {
              if (typeof v === 'number') updatedVitamins[k] = (updatedVitamins[k] || 0) + v;
            }
          }
          return {
            ...prev,
            logs: [newLog, ...prev.logs],
            today_vitamins: updatedVitamins,
          };
        });
        bridge?.HapticFeedback?.notificationOccurred('success');
        setShowAddFood(false);
      }
    } catch (err: any) {
      console.error('[addFood]', err);
    } finally {
      setAddFoodLoading(false);
    }
  }, [data, initData, bridge]);

  // ── Render ──

  if (state === 'loading') return <LoadingScreen />;

  if (state === 'error') {
    return (
      <div className="page" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh',
      }}>
        <div className="card" style={{ textAlign: 'center', padding: 32, maxWidth: 320 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>:(</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Не удалось загрузить</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{error}</div>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const user = toUserProfile(data.user);
  const allLogs = toFoodLogs(data.logs);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = allLogs.filter(l => l.created_at.startsWith(todayStr));
  const vitamins = toVitaminData(data.today_vitamins, data.norms);
  const weekDays: WeekDay[] = data.week.map(d => ({
    date: d.date, calories: d.calories, protein: d.protein,
    fat: d.fat, carbs: d.carbs, logged: d.logged,
  }));

  const target = {
    calories: user.daily_calories,
    protein: user.daily_protein,
    fat: user.daily_fat,
    carbs: user.daily_carbs,
  };

  return (
    <>
      <div className="page">
        {page === 'today' && (
          <>
            <DailyProgress
              logs={todayLogs}
              target={target}
              streak={user.streak_days}
              water={data.user.water_glasses}
              waterNorm={user.water_norm}
              xp={user.xp}
              level={user.level}
              onWaterChange={handleWaterChange}
              onAddFood={() => setShowAddFood(true)}
            />
            <div style={{ marginTop: 10 }}>
              <VitaminChart vitamins={vitamins} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Recommendations vitamins={data.today_vitamins} norms={data.norms} />
            </div>
          </>
        )}
        {page === 'diary' && (
          <FoodDiary
            logs={allLogs}
            onSelect={setSelectedLog}
            onAddFood={() => setShowAddFood(true)}
          />
        )}
        {page === 'week' && <WeeklyReport days={weekDays} target={target} />}
        {page === 'vitamins' && (
          <VitaminsPage
            vitamins={data.today_vitamins}
            norms={data.norms}
            labResults={data.lab_results}
          />
        )}
        {page === 'profile' && <ProfileCard user={user} />}
      </div>

      <div className="tab-bar">
        {(Object.keys(labels) as Page[]).map((p) => (
          <button
            key={p}
            className={page === p ? 'active' : ''}
            onClick={() => {
              setPage(p);
              bridge?.HapticFeedback?.selectionChanged();
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d={icons[p]} />
            </svg>
            {labels[p]}
          </button>
        ))}
      </div>

      {/* Modals */}
      {selectedLog && (
        <MealDetail
          log={selectedLog}
          norms={data.norms}
          onClose={() => setSelectedLog(null)}
          onDelete={handleDeleteFood}
        />
      )}

      {showAddFood && (
        <AddFoodForm
          loading={addFoodLoading}
          onSubmit={handleAddFood}
          onClose={() => !addFoodLoading && setShowAddFood(false)}
        />
      )}
    </>
  );
}
