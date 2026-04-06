// v0.8.4 — profile: water norm edit, goal edit, avatar upload, accessibility toggle
import React, { useState, useCallback, useRef } from 'react';
import type { UserProfile, WeightEntry } from '../types';
import WeightTracker from './WeightTracker';
import BadgeList from './BadgeList';
import AccessibilityToggle from './AccessibilityToggle';
import { editProfile, uploadAvatar } from '../lib/api';

interface Props {
  user: UserProfile | null;
  weightHistory?: WeightEntry[];
  onLogWeight?: (kg: number) => Promise<void>;
  weightLoading?: boolean;
  streakFreezeAvailable?: number;
  onUseStreakFreeze?: () => Promise<void>;
  totalLogs?: number;
  waterGlasses?: number;
  photosUsed?: number;
  onActivatePromo?: (code: string) => Promise<{ ok: boolean; message: string }>;
  onUpdateAllergies?: (allergies: string[]) => Promise<void>;
  allergies?: string[];
  referralLink?: string;
  referralTotal?: number;
  referralActivated?: number;
  initData?: string;
  onProfileUpdated?: () => void;
}

const GOALS: { key: string; label: string; icon: string }[] = [
  { key: 'lose', label: 'Похудеть', icon: '🔥' },
  { key: 'maintain', label: 'Поддержать', icon: '⚖️' },
  { key: 'gain', label: 'Набрать', icon: '💪' },
];

const GOAL_TEXT: Record<string, string> = {
  lose: 'Снижение веса',
  maintain: 'Поддержание',
  gain: 'Набор массы',
};

export default function ProfileCard({ user, weightHistory, onLogWeight, weightLoading, streakFreezeAvailable, onUseStreakFreeze, totalLogs, waterGlasses, photosUsed, onActivatePromo, onUpdateAllergies, allergies = [], referralLink, referralTotal = 0, referralActivated = 0, initData, onProfileUpdated }: Props) {
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');

  // Water norm editing
  const [editingWater, setEditingWater] = useState(false);
  const [waterNormLocal, setWaterNormLocal] = useState(0);
  const [waterSaving, setWaterSaving] = useState(false);

  // Goal editing
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  // Avatar
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Accessibility
  const [largeFont, setLargeFont] = useState(() => document.body.classList.contains('accessibility-mode'));

  const handlePromo = useCallback(async () => {
    if (!promoCode.trim() || !onActivatePromo) return;
    setPromoLoading(true);
    setPromoMsg('');
    try {
      const res = await onActivatePromo(promoCode.trim());
      setPromoMsg(res.message);
      if (res.ok) setPromoCode('');
    } catch (err: any) {
      setPromoMsg(err?.message || 'Ошибка');
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, onActivatePromo]);

  const handleAddAllergy = useCallback(() => {
    const a = newAllergy.trim().toLowerCase();
    if (!a || allergies.includes(a) || !onUpdateAllergies) return;
    onUpdateAllergies([...allergies, a]);
    setNewAllergy('');
  }, [newAllergy, allergies, onUpdateAllergies]);

  const handleRemoveAllergy = useCallback((item: string) => {
    if (!onUpdateAllergies) return;
    onUpdateAllergies(allergies.filter(a => a !== item));
  }, [allergies, onUpdateAllergies]);

  // ── Water norm save ──
  const handleSaveWaterNorm = useCallback(async () => {
    if (!initData || waterSaving) return;
    setWaterSaving(true);
    try {
      await editProfile(initData, { water_norm: waterNormLocal } as any);
      setEditingWater(false);
      onProfileUpdated?.();
    } catch { /* ignore */ }
    setWaterSaving(false);
  }, [initData, waterNormLocal, waterSaving, onProfileUpdated]);

  // ── Goal save ──
  const handleSaveGoal = useCallback(async (goalKey: string) => {
    if (!initData || goalSaving) return;
    setGoalSaving(true);
    try {
      await editProfile(initData, { goal: goalKey, goal_text: GOAL_TEXT[goalKey] || goalKey });
      setEditingGoal(false);
      onProfileUpdated?.();
    } catch { /* ignore */ }
    setGoalSaving(false);
  }, [initData, goalSaving, onProfileUpdated]);

  // ── Avatar upload ──
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initData) return;
    setAvatarUploading(true);
    try {
      // Compress to 400x400 JPEG
      const canvas = document.createElement('canvas');
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      await uploadAvatar(initData, base64);
      onProfileUpdated?.();
    } catch { /* ignore */ }
    setAvatarUploading(false);
    if (avatarRef.current) avatarRef.current.value = '';
  }, [initData, onProfileUpdated]);

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍🚀</div>
        <div style={{ fontWeight: 600 }}>Загрузка профиля...</div>
      </div>
    );
  }

  const subLabel: Record<string, string> = { free: 'Explorer', trial: 'Pilot', premium: 'Commander' };
  const subColor: Record<string, string> = { free: 'var(--text-secondary)', trial: 'var(--accent-cyan)', premium: 'var(--accent-purple)' };
  const subGlow: Record<string, string> = { free: 'none', trial: '0 0 8px rgba(34,211,238,0.3)', premium: '0 0 8px rgba(124,58,237,0.3)' };

  const calculatedNorm = user.weight_kg ? Math.ceil((user.weight_kg * 30) / 250) : 8;

  const currentGoalKey = (() => {
    const g = (user.goal || '').toLowerCase();
    if (g.includes('lose') || g.includes('худ') || g.includes('сниж')) return 'lose';
    if (g.includes('gain') || g.includes('набор') || g.includes('набр') || g.includes('масс')) return 'gain';
    return 'maintain';
  })();

  return (
    <div>
      {/* Avatar card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 10, padding: '24px 16px 20px' }}>
        {/* Avatar with orbit — clickable for upload */}
        <div
          className="profile-orbit"
          onClick={() => avatarRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              style={{
                width: 88, height: 88, borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 30px rgba(124, 58, 237, 0.25)',
              }}
            />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff',
              boxShadow: '0 0 30px rgba(124, 58, 237, 0.25)',
            }}>
              {(user.name || '?')[0].toUpperCase()}
            </div>
          )}
          {/* Camera badge */}
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-purple)', border: '2px solid var(--space-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>
            {avatarUploading ? '...' : '📷'}
          </div>
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600,
          color: subColor[user.subscription_type] || 'var(--text-secondary)',
          background: `${subColor[user.subscription_type] || 'var(--text-secondary)'}12`,
          padding: '4px 12px', borderRadius: 20,
          boxShadow: subGlow[user.subscription_type] || 'none',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'currentColor', boxShadow: '0 0 4px currentColor',
          }} />
          {subLabel[user.subscription_type] || user.subscription_type}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div className="card stat-cosmic" style={{ padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24, fontWeight: 700, color: 'var(--yellow)',
          }}>
            {user.streak_days}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {user.streak_days > 0 ? '🔥 стрик' : '💤 стрик'}
          </div>
        </div>
        <div className="card stat-cosmic" style={{ padding: '14px 8px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24, fontWeight: 700, color: 'var(--accent-cyan)',
          }}>
            {user.xp}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            ⚡ XP (ур. {user.level})
          </div>
        </div>
      </div>

      {/* Weight tracker */}
      {onLogWeight && (
        <div style={{ marginBottom: 10 }}>
          <WeightTracker
            entries={weightHistory || []}
            currentWeight={user.weight_kg}
            onLogWeight={onLogWeight}
            loading={weightLoading}
          />
        </div>
      )}

      {/* Badges */}
      <div style={{ marginBottom: 10 }}>
        <BadgeList
          streakDays={user.streak_days}
          totalLogs={totalLogs || 0}
          waterNorm={user.water_norm}
          waterGlasses={waterGlasses || 0}
          photosUsed={photosUsed || 0}
        />
      </div>

      {/* Goal editing */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingGoal ? 12 : 0 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Цель</div>
          {!editingGoal ? (
            <button
              onClick={() => setEditingGoal(true)}
              style={{
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 10, padding: '6px 14px', color: 'var(--accent-purple)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {user.goal || 'Не задана'} ✎
            </button>
          ) : (
            <button
              onClick={() => setEditingGoal(false)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Отмена
            </button>
          )}
        </div>
        {editingGoal && (
          <div style={{ display: 'flex', gap: 8 }}>
            {GOALS.map(g => (
              <button
                key={g.key}
                onClick={() => handleSaveGoal(g.key)}
                disabled={goalSaving}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 14,
                  background: currentGoalKey === g.key ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                  border: currentGoalKey === g.key ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  color: currentGoalKey === g.key ? 'var(--accent-purple)' : 'var(--text-primary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: goalSaving ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 20 }}>{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Water norm editing */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Норма воды</div>
          {!editingWater ? (
            <button
              onClick={() => { setWaterNormLocal(user.water_norm); setEditingWater(true); }}
              style={{
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: 10, padding: '6px 14px', color: 'var(--accent-blue)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {user.water_norm} стаканов ✎
            </button>
          ) : (
            <button
              onClick={() => setEditingWater(false)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Отмена
            </button>
          )}
        </div>

        {/* Explanation */}
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.08)',
          marginBottom: editingWater ? 12 : 0,
        }}>
          💧 Рекомендация: <b style={{ color: 'var(--accent-blue)' }}>30 мл × {user.weight_kg} кг</b> = {Math.round(user.weight_kg * 30)} мл = <b style={{ color: 'var(--accent-blue)' }}>{calculatedNorm} стаканов</b> (по 250 мл)
        </div>

        {editingWater && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
              <button
                onClick={() => setWaterNormLocal(Math.max(1, waterNormLocal - 1))}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                  color: 'var(--accent-blue)', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                −
              </button>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 32, fontWeight: 700, color: 'var(--accent-blue)',
                minWidth: 60, textAlign: 'center',
              }}>
                {waterNormLocal}
              </div>
              <button
                onClick={() => setWaterNormLocal(Math.min(30, waterNormLocal + 1))}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                  color: 'var(--accent-blue)', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
            <button
              onClick={handleSaveWaterNorm}
              disabled={waterSaving || waterNormLocal === user.water_norm}
              className="btn-primary"
              style={{
                width: '100%', padding: '10px',
                opacity: waterSaving || waterNormLocal === user.water_norm ? 0.4 : 1,
              }}
            >
              {waterSaving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>

      {/* Parameters */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div className="section-title">Параметры</div>
        {[
          ['Пол', user.sex === 'male' ? 'Мужской' : 'Женский'],
          ['Возраст', `${user.age} лет`],
          ['Рост', `${user.height_cm} см`],
          ['Вес', `${user.weight_kg} кг`],
          ['Цель', user.goal],
          ['Норма ккал', `${user.daily_calories}`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{
              fontWeight: 500,
              fontFamily: label === 'Норма ккал' ? "'JetBrains Mono', monospace" : 'inherit',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Accessibility toggle */}
      <div style={{ marginTop: 10 }}>
        <AccessibilityToggle
          enabled={largeFont}
          onToggle={(v) => setLargeFont(v)}
        />
      </div>

      {/* Streak freeze */}
      {onUseStreakFreeze && (
        <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
          <div className="section-title">Заморозка стрика</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13 }}>
                Доступно: <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  {streakFreezeAvailable || 0}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Сохраняет стрик если пропустишь день
              </div>
            </div>
            <button
              onClick={onUseStreakFreeze}
              disabled={!streakFreezeAvailable || streakFreezeAvailable <= 0}
              style={{
                padding: '8px 16px', borderRadius: 12,
                border: '1px solid rgba(96,165,250,0.25)',
                background: streakFreezeAvailable ? 'rgba(96,165,250,0.08)' : 'transparent',
                color: streakFreezeAvailable ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                opacity: streakFreezeAvailable ? 1 : 0.4,
              }}
            >
              Заморозить
            </button>
          </div>
        </div>
      )}

      {/* Allergies */}
      {onUpdateAllergies && (
        <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
          <div className="section-title">Аллергии и исключения</div>
          {allergies.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {allergies.map(a => (
                <div
                  key={a}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 16,
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    fontSize: 12, color: '#ef4444',
                  }}
                >
                  {a}
                  <span
                    onClick={() => handleRemoveAllergy(a)}
                    style={{ cursor: 'pointer', fontWeight: 700, marginLeft: 2 }}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newAllergy}
              onChange={e => setNewAllergy(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddAllergy(); }}
              placeholder="Молоко, глютен, орехи..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              onClick={handleAddAllergy}
              disabled={!newAllergy.trim()}
              style={{
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid rgba(124,58,237,0.2)',
                background: 'rgba(124,58,237,0.08)',
                color: 'var(--accent-purple)', fontSize: 13,
                fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                opacity: newAllergy.trim() ? 1 : 0.4,
              }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Referral program */}
      {referralLink && (
        <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
          <div className="section-title">Приведи друга</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            +7 дней Premium тебе и другу за каждого приглашённого
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(124,58,237,0.04)',
            border: '1px solid rgba(124,58,237,0.12)',
          }}>
            <div style={{
              flex: 1, fontSize: 11, color: 'var(--text-secondary)',
              wordBreak: 'break-all', fontFamily: "'JetBrains Mono', monospace",
            }}>
              {referralLink}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(referralLink);
              }}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid rgba(124,58,237,0.2)',
                background: 'rgba(124,58,237,0.08)',
                color: 'var(--accent-purple)', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              Копировать
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)' }}>{referralTotal}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>приглашено</span>
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-green)' }}>{referralActivated}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>активировали</span>
            </div>
          </div>
        </div>
      )}

      {/* Promo code */}
      {onActivatePromo && (
        <div className="card" style={{ padding: '16px 18px', marginTop: 10 }}>
          <div className="section-title">Промо-код</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handlePromo(); }}
              placeholder="MOONVIT10"
              maxLength={30}
              disabled={promoLoading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1, outline: 'none', textTransform: 'uppercase',
              }}
            />
            <button
              onClick={handlePromo}
              disabled={!promoCode.trim() || promoLoading}
              className="btn-primary"
              style={{
                padding: '8px 16px', flexShrink: 0,
                opacity: !promoCode.trim() || promoLoading ? 0.4 : 1,
              }}
            >
              {promoLoading ? '...' : 'Активировать'}
            </button>
          </div>
          {promoMsg && (
            <div style={{
              fontSize: 12, marginTop: 8, padding: '6px 10px', borderRadius: 8,
              background: promoMsg.includes('рров') || promoMsg.includes('ошибк') || promoMsg.includes('не найден')
                ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
              color: promoMsg.includes('ерров') || promoMsg.includes('ошибк') || promoMsg.includes('не найден')
                ? '#ef4444' : 'var(--accent-green)',
            }}>
              {promoMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
