import React, { useState, useRef } from 'react';
import { compressImage } from '../lib/compress-image';

interface SupplementIngredient {
  name: string;
  key: string;
  amount: number;
  unit: string;
}

interface Props {
  initData: string;
}

export default function SupplementScanPage({ initData }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ product_name: string; ingredients: SupplementIngredient[]; dosage: string } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const compressed = await compressImage(file);
      const resp = await fetch('https://nutri-bot-smoky.vercel.app/api/miniapp-add-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, supplement_photo: compressed }),
      });
      const data = await resp.json();
      if (data.ok && data.supplement) {
        setResult(data.supplement);
      } else {
        setError(data.error || 'Не удалось распознать');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка соединения');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div className="section-title">Сканирование БАДов</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Сфотографируй этикетку — AI определит состав
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={scanning}
        className="btn-primary"
        style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {scanning ? (
          <>
            <span className="loading-dots"><span /><span /><span /></span>
            Анализирую этикетку...
          </>
        ) : (
          <>Сфотографировать этикетку</>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />

      {error && (
        <div className="card" style={{ padding: 14, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{result.product_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>{result.dosage}</div>

          {result.ingredients.map((ing, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              borderBottom: i < result.ingredients.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontSize: 13 }}>{ing.name}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-purple)' }}>
                {ing.amount} {ing.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
