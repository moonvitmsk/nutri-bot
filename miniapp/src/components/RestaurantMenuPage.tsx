import React, { useState, useRef, useCallback } from 'react';
import { analyzeRestaurantMenu, type RestaurantDish } from '../lib/api';
import { compressImage } from '../lib/compress-image';

interface Props {
  initData: string;
}

export default function RestaurantMenuPage({ initData }: Props) {
  const [dishes, setDishes] = useState<RestaurantDish[]>([]);
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setDishes([]);
    setTip('');

    try {
      const { base64 } = await compressImage(file);
      const res = await analyzeRestaurantMenu(initData || 'dev', base64);

      if (res.ok && res.dishes) {
        setDishes(res.dishes);
        setTip(res.tip || '');
      } else {
        setError(res.comment || res.error || 'Не удалось распознать меню');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [initData]);

  const statusColor = (cal: number) => {
    if (cal < 300) return 'var(--accent-cyan)';
    if (cal < 500) return 'var(--accent-green)';
    if (cal < 700) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      <div className="section-title">Меню ресторана</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Сфотографируй меню — AI посчитает калории каждого блюда
      </div>

      {/* Upload button */}
      {!loading && dishes.length === 0 && (
        <div
          onClick={() => fileRef.current?.click()}
          className="card"
          style={{
            padding: 32, textAlign: 'center', cursor: 'pointer',
            border: '2px dashed rgba(124,58,237,0.2)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Сфотографировать меню</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Страница меню с названиями и ценами
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        style={{ display: 'none' }}
      />

      {error && (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#ef4444' }}>{error}</div>
          <button
            onClick={() => { setError(''); fileRef.current?.click(); }}
            className="btn-primary"
            style={{ marginTop: 12, padding: '10px 20px' }}
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 8 }}><span /><span /><span /></div>
          <div style={{ fontSize: 13, color: 'var(--accent-purple)' }}>Анализирую меню...</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>10-15 секунд</div>
        </div>
      )}

      {/* Results */}
      {dishes.length > 0 && !loading && (
        <>
          {tip && (
            <div className="card" style={{
              padding: '10px 14px', marginBottom: 8,
              background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--accent-purple)' }}>💡 {tip}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dishes.map((d, i) => (
              <div key={i} className="card" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{d.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: statusColor(d.calories), flexShrink: 0, marginLeft: 8 }}>
                    {d.calories} ккал
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>Б {d.protein}г</span>
                  <span>Ж {d.fat}г</span>
                  <span>У {d.carbs}г</span>
                  {d.weight_g && <span>{d.weight_g}г</span>}
                  {d.price && <span>{d.price} ₽</span>}
                </div>
                {d.note && (
                  <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginTop: 4 }}>{d.note}</div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => { setDishes([]); setTip(''); fileRef.current?.click(); }}
            className="btn-primary"
            style={{ width: '100%', marginTop: 12, padding: 14 }}
          >
            Другое меню
          </button>
        </>
      )}
    </div>
  );
}
