import React, { useState, useCallback, useRef } from 'react';
import { getRecipes, fridgeToRecipes, type ApiRecipe } from '../lib/api';
import { compressImage } from '../lib/compress-image';

interface Props {
  initData: string;
}

const MEALS = [
  { id: 'breakfast', label: 'Завтрак', icon: '🌅' },
  { id: 'lunch', label: 'Обед', icon: '☀️' },
  { id: 'dinner', label: 'Ужин', icon: '🌙' },
  { id: 'snack', label: 'Перекус', icon: '🍎' },
];

export default function RecipesPage({ initData }: Props) {
  const [recipes, setRecipes] = useState<ApiRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [recipeHistory, setRecipeHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState({ time: '', budget: '', ingredients: '', dietary: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const fridgeFileRef = useRef<HTMLInputElement>(null);

  const generate = useCallback(async (meal?: string) => {
    setLoading(true);
    setRecipes([]);
    setExpanded(null);
    setSelectedMeal(meal || null);
    try {
      const parts: string[] = [];
      if (filters.ingredients.trim()) parts.push(`Ингредиенты: ${filters.ingredients.trim()}`);
      if (filters.dietary) {
        const dietaryLabels: Record<string, string> = {
          diabetic: 'для диабетиков (низкий ГИ, без сахара)',
          kids: 'для детей (простые, полезные, без аллергенов)',
          pregnant: 'для беременных (фолиевая кислота, железо, без сырого)',
          vegan: 'веганские (без мяса, молока, яиц)',
          evening: 'лёгкий ужин (до 400 ккал, легкоусвояемое)',
        };
        parts.push(`Диета: ${dietaryLabels[filters.dietary] || filters.dietary}`);
      }
      if (filters.time) parts.push(`Время приготовления: до ${filters.time} минут`);
      if (filters.budget) parts.push(`Бюджет: ${filters.budget === 'economy' ? 'эконом' : 'средний'}`);
      const customPrompt = parts.length > 0 ? parts.join('. ') : undefined;
      const res = await getRecipes(initData || 'dev', meal, customPrompt, recipeHistory.length > 0 ? recipeHistory : undefined);
      if (res.ok && res.recipes?.length) {
        setRecipes(res.recipes);
        setExpanded(0);
        setRecipeHistory(prev => [...prev, ...res.recipes.map(r => r.name)]);
      }
    } catch (err) {
      console.error('[recipes]', err);
    } finally {
      setLoading(false);
    }
  }, [initData, recipeHistory, filters]);

  const handleFridgePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setRecipes([]);
    setFridgeIngredients([]);
    setExpanded(null);
    setSelectedMeal(null);
    try {
      const { base64 } = await compressImage(file);
      const res = await fridgeToRecipes(initData || 'dev', base64);
      if (res.ok) {
        if (res.ingredients?.length) setFridgeIngredients(res.ingredients);
        if (res.recipes?.length) {
          setRecipes(res.recipes);
          setExpanded(0);
        }
      }
    } catch (err) {
      console.error('[fridge-recipes]', err);
    } finally {
      setLoading(false);
    }
    e.target.value = '';
  }, [initData]);

  return (
    <div>
      <div className="section-title">Рецепты от moonvit</div>

      {/* Fridge photo mode */}
      <button
        onClick={() => fridgeFileRef.current?.click()}
        disabled={loading}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: '1px solid rgba(16,185,129,0.2)',
          background: 'rgba(16,185,129,0.06)',
          color: '#10b981', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          marginBottom: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {'📷'} Фото холодильника {'→'} рецепты
      </button>
      <input
        ref={fridgeFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFridgePhoto}
      />

      {/* Fridge ingredients display */}
      {fridgeIngredients.length > 0 && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.12)',
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <span style={{ fontWeight: 600, color: '#10b981' }}>Найдено: </span>
          {fridgeIngredients.join(', ')}
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setFiltersOpen(p => !p)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>Фильтры{filters.time || filters.budget || filters.ingredients || filters.dietary ? ' (активны)' : ''}</span>
          <span style={{ fontSize: 10 }}>{filtersOpen ? '▲' : '▼'}</span>
        </button>
        {filtersOpen && (
          <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Время:</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[{ v: '15', l: '< 15 мин' }, { v: '30', l: '< 30 мин' }, { v: '', l: 'Любое' }].map(t => (
                <button key={t.v} onClick={() => setFilters(f => ({ ...f, time: t.v }))} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
                  border: `1px solid ${filters.time === t.v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: filters.time === t.v ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: 'var(--text-primary)',
                }}>{t.l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Бюджет:</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[{ v: 'economy', l: 'Эконом' }, { v: 'medium', l: 'Средний' }, { v: '', l: 'Любой' }].map(b => (
                <button key={b.v} onClick={() => setFilters(f => ({ ...f, budget: b.v }))} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
                  border: `1px solid ${filters.budget === b.v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: filters.budget === b.v ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: 'var(--text-primary)',
                }}>{b.l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Специальное:</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { v: 'diabetic', l: '🩸 Диабет' },
                { v: 'kids', l: '👶 Детям' },
                { v: 'pregnant', l: '🤰 Беременным' },
                { v: 'vegan', l: '🌱 Веган' },
                { v: 'evening', l: '🌙 Лёгкий ужин' },
                { v: '', l: 'Все' },
              ].map(d => (
                <button key={d.v} onClick={() => setFilters(f => ({ ...f, dietary: d.v }))} style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
                  border: `1px solid ${filters.dietary === d.v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: filters.dietary === d.v ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: 'var(--text-primary)',
                }}>{d.l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>У меня есть:</div>
            <input
              value={filters.ingredients}
              onChange={e => setFilters(f => ({ ...f, ingredients: e.target.value }))}
              placeholder="курица, рис, лук..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>

      {/* Meal type selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {MEALS.map(m => (
          <button
            key={m.id}
            onClick={() => generate(m.id)}
            disabled={loading}
            style={{
              flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 12,
              border: `1px solid ${selectedMeal === m.id ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: selectedMeal === m.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
              color: 'var(--text-primary)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 18 }}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Generate any button */}
      {!recipes.length && !loading && (
        <button
          onClick={() => generate()}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', marginBottom: 12 }}
        >
          Подобрать рецепты по моему профилю
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 8 }}><span /><span /><span /></div>
          <div style={{ fontSize: 13, color: 'var(--accent-purple)' }}>AI подбирает рецепты...</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>10-15 секунд</div>
        </div>
      )}

      {/* Recipe cards */}
      {recipes.map((r, i) => {
        const isOpen = expanded === i;
        return (
          <div
            key={i}
            className="card"
            style={{
              marginBottom: 8, padding: '14px 16px', cursor: 'pointer',
              border: isOpen ? '1px solid rgba(124,58,237,0.2)' : undefined,
            }}
            onClick={() => setExpanded(isOpen ? null : i)}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>⏱ {r.time_min} мин</span>
                  <span>~{r.cost_rub}₽</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 700, color: 'var(--yellow)',
                }}>
                  {r.kbju.calories}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                  Б{r.kbju.protein} Ж{r.kbju.fat} У{r.kbju.carbs}
                </div>
              </div>
            </div>

            {/* Why */}
            <div style={{ fontSize: 12, color: 'var(--accent-purple)', marginTop: 6, fontStyle: 'italic' }}>
              {r.why}
            </div>

            {/* Covers */}
            {r.covers && (
              <div style={{
                fontSize: 10, color: 'var(--green)', marginTop: 4,
                background: 'rgba(110,231,183,0.08)', padding: '3px 8px',
                borderRadius: 6, display: 'inline-block',
              }}>
                {r.covers}
              </div>
            )}

            {/* Expanded: ingredients + steps */}
            {isOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ингредиенты:</div>
                {r.ingredients.map((ing, j) => (
                  <div key={j} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, padding: '3px 0', color: 'var(--text-secondary)',
                  }}>
                    <span>{ing.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{ing.amount}</span>
                  </div>
                ))}

                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 10, marginBottom: 6 }}>Приготовление:</div>
                {r.steps.map((step, j) => (
                  <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 0' }}>
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{j + 1}.</span> {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Regenerate */}
      {recipes.length > 0 && !loading && (
        <button
          onClick={() => generate(selectedMeal || undefined)}
          style={{
            width: '100%', padding: '10px', borderRadius: 12, marginTop: 4,
            border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.04)',
            color: 'var(--accent-purple)', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Другие рецепты
        </button>
      )}

      {/* Clear history */}
      {recipeHistory.length > 10 && (
        <button
          onClick={() => setRecipeHistory([])}
          style={{
            width: '100%', padding: '8px', borderRadius: 10, marginTop: 6,
            border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 11, fontWeight: 400,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Сбросить историю рецептов ({recipeHistory.length})
        </button>
      )}
    </div>
  );
}
