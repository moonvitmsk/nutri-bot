import React, { useState, useRef, useCallback } from 'react';
import { analyzeLabPhoto, analyzeLabPdf, type LabMarker } from '../lib/api';
import { compressImage } from '../lib/compress-image';

interface Props {
  initData: string;
}

export default function LabAnalysisPage({ initData }: Props) {
  const [markers, setMarkers] = useState<LabMarker[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [deficiencies, setDeficiencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const handlePdf = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setMarkers([]);
    setInterpretation('');
    setDeficiencies([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );
      const res = await analyzeLabPdf(initData || 'dev', base64);

      if (res.ok && res.markers) {
        setMarkers(res.markers);
        setInterpretation(res.interpretation || '');
        setDeficiencies(res.deficiencies || []);
      } else {
        setError(res.error || 'Не удалось распознать анализы из PDF');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения');
    } finally {
      setLoading(false);
      if (pdfRef.current) pdfRef.current.value = '';
    }
  }, [initData]);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setMarkers([]);
    setInterpretation('');
    setDeficiencies([]);

    try {
      const { base64 } = await compressImage(file);
      const res = await analyzeLabPhoto(initData || 'dev', base64);

      if (res.ok && res.markers) {
        setMarkers(res.markers);
        setInterpretation(res.interpretation || '');
        setDeficiencies(res.deficiencies || []);
      } else {
        setError(res.error || 'Не удалось распознать анализы');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка соединения');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [initData]);

  const statusStyle = (status: string) => {
    switch (status) {
      case 'low': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: '↓ Ниже нормы' };
      case 'high': return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: '↑ Выше нормы' };
      default: return { color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.15)', label: '✓ Норма' };
    }
  };

  return (
    <div>
      <div className="section-title">Анализы крови</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Сфотографируй результаты анализов — AI разберёт маркеры
      </div>

      {/* Upload */}
      {!loading && markers.length === 0 && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onClick={() => fileRef.current?.click()}
            className="card"
            style={{
              padding: 32, textAlign: 'center', cursor: 'pointer',
              border: '2px dashed rgba(124,58,237,0.2)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Загрузить фото анализов</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Фото страницы с результатами анализа крови
            </div>
          </div>
          <div
            onClick={() => pdfRef.current?.click()}
            className="card"
            style={{
              padding: 24, textAlign: 'center', cursor: 'pointer',
              border: '2px dashed rgba(59,130,246,0.2)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Загрузить PDF</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              PDF-файл с результатами анализов из лаборатории
            </div>
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
      <input
        ref={pdfRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handlePdf}
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
          <div style={{ fontSize: 13, color: 'var(--accent-purple)' }}>Анализирую результаты...</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>15-20 секунд</div>
        </div>
      )}

      {/* Results */}
      {markers.length > 0 && !loading && (
        <>
          {/* Deficiencies alert */}
          {deficiencies.length > 0 && (
            <div className="card" style={{
              padding: '10px 14px', marginBottom: 8,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>
                Обнаружены отклонения:
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {deficiencies.join(', ')}
              </div>
            </div>
          )}

          {/* Markers table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {markers.map((m, i) => {
              const s = statusStyle(m.status);
              return (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 10,
                  background: s.bg, border: `1px solid ${s.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>
                      {m.value} {m.unit}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      норма: {m.reference}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interpretation */}
          {interpretation && (
            <div className="card" style={{ padding: '12px 14px', marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Интерпретация AI</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {interpretation}
              </div>
            </div>
          )}

          <div style={{
            fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center',
            marginTop: 8, padding: '0 12px',
          }}>
            AI-интерпретация не является медицинским диагнозом. Проконсультируйтесь с врачом.
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => { setMarkers([]); setInterpretation(''); setDeficiencies([]); fileRef.current?.click(); }}
              className="btn-primary"
              style={{ flex: 1, padding: 14 }}
            >
              Загрузить фото
            </button>
            <button
              onClick={() => { setMarkers([]); setInterpretation(''); setDeficiencies([]); pdfRef.current?.click(); }}
              className="btn-primary"
              style={{ flex: 1, padding: 14, background: 'var(--accent-blue, #3b82f6)' }}
            >
              Загрузить PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
