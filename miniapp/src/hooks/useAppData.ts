import { useState, useEffect, useCallback } from 'react';
import { useMAXBridge } from './useMAXBridge';
import {
  authenticate, updateWater, deleteFood, addFood, addFoodPhoto, confirmFood,
  logWeight, useStreakFreeze, activatePromo, updateAllergies, getReferralStats, trackMiniappEvent,
  type AuthResponse, type ApiUser, type ApiLog, type ApiWeekDay, type ApiWeightEntry,
} from '../lib/api';
import type { UserProfile, FoodLog, VitaminData, WeekDay } from '../types';

export type AISubPage = 'menu' | 'recipes' | 'mealplan' | 'chat' | 'week' | 'deepconsult' | 'restaurant' | 'lab';

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
    avatar_url: u.avatar_url || null,
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
    streak_freeze_available: 2, photos_today: 1,
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
  weight_history: Array.from({ length: 14 }, (_, i) => ({
    id: `w-${i}`,
    weight_kg: 78 - i * 0.15 + Math.random() * 0.4 - 0.2,
    note: null,
    created_at: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
  })),
};

// ── Frequent foods extractor ──

function getFrequentFoods(logs: FoodLog[]): string[] {
  const freq: Record<string, number> = {};
  for (const log of logs) {
    const desc = log.description?.trim();
    if (desc && desc.length > 2 && desc.length < 50) {
      freq[desc] = (freq[desc] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 8);
}

// ── Hook ──

export function useAppData() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState<AuthResponse | null>(null);
  const [selectedLog, setSelectedLog] = useState<FoodLog | null>(null);
  const [showAddFood, setShowAddFood] = useState(false);
  const [addFoodLoading, setAddFoodLoading] = useState(false);
  const [addFoodError, setAddFoodError] = useState('');
  const [weightHistory, setWeightHistory] = useState<ApiWeightEntry[]>([]);
  const [weightLoading, setWeightLoading] = useState(false);
  const [aiSubPage, setAiSubPage] = useState<AISubPage>('menu');
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem('moonvit-simple') === 'true');
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [referralData, setReferralData] = useState<{ link: string; total: number; activated: number } | null>(null);
  const bridge = useMAXBridge();

  const initData = bridge?.initData || '';

  useEffect(() => {
    async function init() {
      if (!bridge?.initData) {
        setData(MOCK);
        setWeightHistory(MOCK.weight_history || []);
        setUserAllergies([]);
        setState('ready');
        return;
      }
      try {
        const result = await authenticate(bridge.initData);
        setData(result);
        setWeightHistory(result.weight_history || []);
        setUserAllergies((result.user as any).allergies || []);
        setState('ready');
        // Load referral stats in background
        getReferralStats(bridge.initData).then(r => {
          if (r.ok) setReferralData({ link: r.link, total: r.total, activated: r.activated });
        }).catch(() => {});
        bridge.ready();
        trackMiniappEvent(bridge.initData, 'miniapp_open');
      } catch (err: any) {
        console.error('[miniapp] Auth failed:', err);
        setError(err.message || 'Ошибка загрузки');
        setState('error');
      }
    }
    init();
  }, []);

  // Auto-refresh data every 60s when app is visible
  useEffect(() => {
    if (!bridge?.initData) return;
    const refresh = async () => {
      if (document.hidden || state !== 'ready') return;
      try {
        const fresh = await authenticate(bridge.initData);
        setData(fresh);
        setWeightHistory(fresh.weight_history || []);
      } catch { /* silent refresh */ }
    };
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [state]);

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

  const applyNewLog = useCallback((newLog: ApiLog) => {
    setData(prev => {
      if (!prev) return prev;
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
  }, [bridge]);

  const handleAddFood = useCallback(async (text: string) => {
    if (!data) return;
    setAddFoodLoading(true);
    setAddFoodError('');
    try {
      const res = await addFood(initData || 'dev', text);
      if (res.ok && res.log) {
        applyNewLog(res.log);
      } else {
        setAddFoodError(res.error || 'Ошибка сохранения');
      }
    } catch (err: any) {
      console.error('[addFood]', err);
      setAddFoodError(err?.message || 'Ошибка соединения');
    } finally {
      setAddFoodLoading(false);
    }
  }, [data, initData, applyNewLog]);

  // Photo: returns result for preview, does NOT close the form
  const handleAddFoodPhoto = useCallback(async (base64: string) => {
    if (!data) return { ok: false, error: 'no data' };

    try {
      const res = await addFoodPhoto(initData, base64);
      return res;
    } catch (err: any) {
      console.error('[addFoodPhoto]', err);
      bridge?.HapticFeedback?.notificationOccurred('error');
      return { ok: false, error: err?.message || 'Нет соединения' };
    }
  }, [data, initData, bridge]);

  // Confirm a pending photo log
  const handleConfirmPhoto = useCallback(async (logId: string) => {
    if (!data) return;
    setAddFoodLoading(true);
    try {
      await confirmFood(initData || 'dev', logId);
    } catch (err: any) {
      console.error('[confirmPhoto]', err);
    } finally {
      setAddFoodLoading(false);
    }
  }, [data, initData]);

  // ── Weight tracking ──
  const handleLogWeight = useCallback(async (kg: number) => {
    if (!data) return;
    setWeightLoading(true);
    try {
      const res = await logWeight(initData || 'dev', kg);
      if (res.ok) {
        if (res.weight_history) setWeightHistory(res.weight_history);
        if (res.current_weight) {
          setData(prev => prev ? { ...prev, user: { ...prev.user, weight_kg: res.current_weight! } } : prev);
        }
        bridge?.HapticFeedback?.notificationOccurred('success');
      }
    } catch (err: any) {
      console.error('[logWeight]', err);
    } finally {
      setWeightLoading(false);
    }
  }, [data, initData, bridge]);

  // ── Streak freeze ──
  const handleStreakFreeze = useCallback(async () => {
    if (!data) return;
    try {
      const res = await useStreakFreeze(initData || 'dev');
      if (res.ok && res.streak_freeze_available !== undefined) {
        setData(prev => prev ? {
          ...prev,
          user: { ...prev.user, streak_freeze_available: res.streak_freeze_available! },
        } : prev);
        bridge?.HapticFeedback?.notificationOccurred('success');
      }
    } catch (err: any) {
      console.error('[streakFreeze]', err);
    }
  }, [data, initData, bridge]);

  // ── Promo code ──
  const handleActivatePromo = useCallback(async (code: string) => {
    return activatePromo(initData || 'dev', code);
  }, [initData]);

  // ── Allergies ──
  const handleUpdateAllergies = useCallback(async (newAllergies: string[]) => {
    setUserAllergies(newAllergies);
    if (initData) {
      try { await updateAllergies(initData, newAllergies); }
      catch { /* optimistic stays */ }
    }
  }, [initData]);

  // ── Simple mode toggle ──
  const toggleSimpleMode = useCallback((on: boolean) => {
    setSimpleMode(on);
    if (on) {
      localStorage.setItem('moonvit-simple', 'true');
    } else {
      localStorage.removeItem('moonvit-simple');
    }
  }, []);

  // Cancel a pending photo log — delete it
  const handleCancelPhoto = useCallback(async (logId: string) => {
    if (!data) return;
    try {
      await deleteFood(initData || 'dev', logId);
      bridge?.HapticFeedback?.notificationOccurred('warning');
    } catch (err: any) {
      console.error('[cancelPhoto]', err);
    }
  }, [data, initData, bridge]);

  // ── Derived data ──

  const user = data ? toUserProfile(data.user) : null;
  const allLogs = data ? toFoodLogs(data.logs) : [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = allLogs.filter(l => l.created_at.startsWith(todayStr));
  const vitamins = data ? toVitaminData(data.today_vitamins, data.norms) : [];
  const weekDays: WeekDay[] = data
    ? data.week.map(d => ({
        date: d.date, calories: d.calories, protein: d.protein,
        fat: d.fat, carbs: d.carbs, logged: d.logged,
      }))
    : [];

  const target = user
    ? {
        calories: user.daily_calories,
        protein: user.daily_protein,
        fat: user.daily_fat,
        carbs: user.daily_carbs,
      }
    : { calories: 2000, protein: 100, fat: 70, carbs: 250 };

  const frequentFoods = getFrequentFoods(allLogs);

  return {
    // State
    state,
    error,
    data,
    // Derived
    user,
    allLogs,
    todayLogs,
    vitamins,
    weekDays,
    target,
    frequentFoods,
    // UI state
    selectedLog,
    showAddFood,
    addFoodLoading,
    addFoodError,
    weightHistory,
    weightLoading,
    aiSubPage,
    simpleMode,
    userAllergies,
    referralData,
    // Bridge
    bridge,
    initData,
    // Setters
    setSelectedLog,
    setShowAddFood,
    setAddFoodError,
    setAiSubPage,
    toggleSimpleMode,
    setData,
    setWeightHistory,
    // Handlers
    handleWaterChange,
    handleDeleteFood,
    handleAddFood,
    handleAddFoodPhoto,
    handleConfirmPhoto,
    handleLogWeight,
    handleStreakFreeze,
    handleActivatePromo,
    handleUpdateAllergies,
    handleCancelPhoto,
    applyNewLog,
  };
}
