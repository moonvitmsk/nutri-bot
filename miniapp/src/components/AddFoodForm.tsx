import React, { useState, useRef, useCallback } from 'react';
import { compressImage } from '../lib/compress-image';
import { transcribeVoice } from '../lib/api';
import type { ApiLog } from '../lib/api';

type Mode = 'choose' | 'text' | 'photo-preview' | 'photo-loading' | 'photo-result';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EditableItem {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  is_drink?: boolean;
  volume_ml?: number | null;
  // Original values for proportional recalc
  _orig_weight_g: number;
  _orig_calories: number;
  _orig_protein: number;
  _orig_fat: number;
  _orig_carbs: number;
}

interface Props {
  onSubmitText: (text: string) => Promise<void>;
  onSubmitPhoto: (base64: string) => Promise<{ ok: boolean; pending?: boolean; log?: ApiLog; error?: string; comment?: string; is_drink?: boolean }>;
  onConfirmPhoto: (logId: string, editedItems?: EditableItem[], editedTotals?: { calories: number; protein: number; fat: number; carbs: number }) => Promise<void>;
  onCancelPhoto: (logId: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  externalError?: string;
  frequentFoods?: string[];
  initData?: string;
}

export default function AddFoodForm({
  onSubmitText, onSubmitPhoto, onConfirmPhoto, onCancelPhoto, onClose, loading, externalError, frequentFoods, initData,
}: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [text, setText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [photoInfo, setPhotoInfo] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingLog, setPendingLog] = useState<ApiLog | null>(null);
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [isDrinkResult, setIsDrinkResult] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate totals from edited items
  const editedTotals = editedItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  // Update weight and proportionally recalculate KBJU
  const handleWeightChange = useCallback((index: number, newWeight: number) => {
    setEditedItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const ratio = item._orig_weight_g > 0 ? newWeight / item._orig_weight_g : 1;
      item.weight_g = newWeight;
      item.calories = Math.round(item._orig_calories * ratio);
      item.protein = Math.round(item._orig_protein * ratio * 10) / 10;
      item.fat = Math.round(item._orig_fat * ratio * 10) / 10;
      item.carbs = Math.round(item._orig_carbs * ratio * 10) / 10;
      updated[index] = item;
      return updated;
    });
  }, []);

  // Update volume_ml for drink items
  const handleVolumeChange = useCallback((index: number, newVolume: number) => {
    setEditedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], volume_ml: newVolume, weight_g: newVolume };
      return updated;
    });
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoice = useCallback(async () => {
    // Try native SpeechRecognition first
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
        setMode('text');
        setIsRecording(false);
      };
      recognition.onerror = () => {
        setIsRecording(false);
        setErrorMsg('Не удалось распознать речь. Попробуйте ещё раз.');
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
      return;
    }

    // Fallback: MediaRecorder + Whisper backend
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Микрофон недоступен в этом браузере');
      return;
    }

    if (isRecording && mediaRecorderRef.current) {
      // Stop recording
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        if (!initData) return;

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) return; // too short

        setErrorMsg('');
        setText('Распознаю речь...');
        setMode('text');

        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const result = await transcribeVoice(initData, base64);
          if (result.ok && result.transcript) {
            setText(result.transcript);
          } else {
            setText('');
            setErrorMsg(result.error || 'Не удалось распознать речь');
            setMode('choose');
          }
        } catch {
          setText('');
          setErrorMsg('Ошибка распознавания речи');
          setMode('choose');
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg('Нет доступа к микрофону');
    }
  }, [isRecording, initData]);

  const handleTextSubmit = async () => {
    if (!text.trim() || loading) return;
    await onSubmitText(text.trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // file.type can be empty in some WebViews (MAX, Telegram) when capturing from camera
    if (file.type && !file.type.startsWith('image/')) return;

    setCompressing(true);
    setErrorMsg('');
    try {
      const result = await compressImage(file);
      setPhotoPreview(result.base64);
      setPhotoBase64(result.base64);
      setPhotoInfo(`${result.width}x${result.height}, ${result.sizeKB} КБ`);
      setMode('photo-preview');
    } catch (err) {
      // Fallback: read file directly
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setPhotoPreview(dataUrl);
        setPhotoBase64(dataUrl);
        setPhotoInfo('');
        setMode('photo-preview');
      } catch {
        setErrorMsg('Не удалось загрузить фото');
      }
    } finally {
      setCompressing(false);
    }
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!photoBase64 || analyzing) return;
    setAnalyzing(true);
    setErrorMsg('');
    setMode('photo-loading');
    try {
      const res = await onSubmitPhoto(photoBase64);
      if (res.ok && res.log) {
        setPendingLog(res.log);
        setIsDrinkResult(!!res.is_drink);
        // Initialize editable items from log
        const items = (res.log.items || []).map(i => ({
          ...i,
          is_drink: i.is_drink || false,
          volume_ml: i.volume_ml || null,
          _orig_weight_g: i.weight_g,
          _orig_calories: i.calories,
          _orig_protein: i.protein,
          _orig_fat: i.fat,
          _orig_carbs: i.carbs,
        }));
        setEditedItems(items);
        setMode('photo-result');
      } else if (res.error === 'photo_limit') {
        setErrorMsg(res.comment || 'Лимит фото на сегодня исчерпан');
        setMode('photo-preview');
      } else if (res.error === 'not_food') {
        setErrorMsg(res.comment || 'Это не похоже на еду');
        setMode('photo-preview');
      } else {
        setErrorMsg(res.comment || res.error || 'Ошибка анализа');
        setMode('photo-preview');
      }
    } catch (err: any) {
      setErrorMsg(`Ошибка: ${err?.message || 'Нет соединения'}`);
      setMode('photo-preview');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingLog) return;
    await onConfirmPhoto(pendingLog.id, editedItems, editedTotals);
  };

  const handleCancel = async () => {
    if (!pendingLog) return;
    await onCancelPhoto(pendingLog.id);
    setPendingLog(null);
    setMode('choose');
    setPhotoPreview(null);
    setPhotoBase64(null);
  };

  const [filePickerOpen, setFilePickerOpen] = useState(false);

  const handleCameraClick = () => {
    setFilePickerOpen(true);
    fileInputRef.current?.click();
    // Reset flag after picker closes (focus returns to page)
    const onFocus = () => {
      setTimeout(() => setFilePickerOpen(false), 300);
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
    // Fallback timeout in case focus event doesn't fire
    setTimeout(() => setFilePickerOpen(false), 30000);
  };

  const handleBack = () => {
    if (mode === 'text' || mode === 'photo-preview') {
      setMode('choose');
      setPhotoPreview(null);
      setPhotoBase64(null);
      setText('');
      setErrorMsg('');
    } else {
      onClose();
    }
  };

  const isbusy = loading || compressing || analyzing || filePickerOpen;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={isbusy ? undefined : onClose}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Hidden file input — stopPropagation prevents backdrop click from closing modal */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        onClick={e => e.stopPropagation()}
        style={{ display: 'none' }}
      />

      <div
        style={{
          position: 'relative',
          background: 'rgba(12, 14, 30, 0.95)',
          borderTop: '1px solid rgba(124, 58, 237, 0.15)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 16px env(safe-area-inset-bottom, 16px)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 16px',
        }} />

        {/* ── Choose mode ── */}
        {mode === 'choose' && (
          <>
            <div className="section-title">Добавить приём пищи</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={handleCameraClick} disabled={compressing} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 8px', borderRadius: 16,
                border: '1px solid rgba(124, 58, 237, 0.25)',
                background: 'rgba(124, 58, 237, 0.08)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Фото</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>AI распознает</span>
              </button>
              <button
                onClick={startVoice}
                style={{
                  flex: 1, padding: '16px 12px', borderRadius: 14,
                  background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.06)',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.12)'}`,
                  color: isRecording ? '#ef4444' : 'var(--text-primary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 24 }}>{isRecording ? '⏹️' : '🎙'}</span>
                {isRecording ? 'Говорите...' : 'Голосом'}
              </button>
              <button onClick={() => setMode('text')} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 8px', borderRadius: 16,
                border: '1px solid rgba(96, 165, 250, 0.25)',
                background: 'rgba(96, 165, 250, 0.08)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Текст</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>Описать</span>
              </button>
            </div>
            {compressing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 0', justifyContent: 'center', fontSize: 13, color: 'var(--accent-purple)' }}>
                <div className="loading-dots"><span /><span /><span /></div>
                <span>Подготовка фото...</span>
              </div>
            )}

            {/* Quick buttons — frequent foods */}
            {frequentFoods && frequentFoods.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>Быстро добавить:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {frequentFoods.slice(0, 8).map((food, i) => (
                    <button key={i} onClick={() => { setText(food); setMode('text'); }} style={{
                      padding: '6px 12px', borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                    }}>
                      {food}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Text mode ── */}
        {mode === 'text' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button onClick={handleBack} disabled={loading} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
                border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}>&larr;</button>
              <div className="section-title" style={{ margin: 0 }}>Описать текстом</div>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Опишите что съели... Например: овсянка с молоком и бананом, 350г"
              disabled={loading} rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                padding: '12px 14px', color: 'var(--text-primary)', fontSize: 14,
                fontFamily: "'Outfit', sans-serif", resize: 'none', outline: 'none', marginBottom: 12,
              }}
              autoFocus
            />
            {externalError && !loading && (
              <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', fontSize: 13 }}>
                {externalError}
              </div>
            )}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px', fontSize: 13, color: 'var(--accent-purple)' }}>
                <div className="loading-dots"><span /><span /><span /></div>
                <span>AI анализирует...</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleBack} disabled={loading} style={{
                flex: 1, padding: '12px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>Назад</button>
              <button onClick={handleTextSubmit} disabled={!text.trim() || loading}
                className="btn-primary" style={{ flex: 2, opacity: !text.trim() || loading ? 0.5 : 1 }}>
                Записать
              </button>
            </div>
          </>
        )}

        {/* ── Photo preview ── */}
        {mode === 'photo-preview' && photoPreview && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button onClick={handleBack} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
                border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}>&larr;</button>
              <div className="section-title" style={{ margin: 0 }}>Фото еды</div>
              {photoInfo && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{photoInfo}</span>}
            </div>
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, maxHeight: 240, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <img src={photoPreview} alt="Фото" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} />
            </div>
            {errorMsg && (
              <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', fontSize: 13 }}>
                {errorMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCameraClick} style={{
                flex: 1, padding: '12px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>Переснять</button>
              <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary" style={{ flex: 2 }}>
                Анализировать
              </button>
            </div>
          </>
        )}

        {/* ── Photo loading (scanning animation) ── */}
        {mode === 'photo-loading' && (
          <>
            <div className="section-title">Анализ фото</div>
            {photoPreview && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 12, maxHeight: 200, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                <img src={photoPreview} alt="Фото" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', opacity: 0.5 }} />
                {/* Scan line effect */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, var(--accent-purple), transparent)',
                  animation: 'scan-line 2s ease-in-out infinite',
                }} />
                <style>{`@keyframes scan-line { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }`}</style>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 16px', justifyContent: 'center', fontSize: 14, color: 'var(--accent-purple)' }}>
              <div className="loading-dots"><span /><span /><span /></div>
              <span>AI распознаёт блюда...</span>
            </div>
          </>
        )}

        {/* ── Photo result — editable items + confirm / cancel ── */}
        {mode === 'photo-result' && pendingLog && (
          <>
            <div className="section-title">{isDrinkResult ? 'Напиток' : 'Распознано'}</div>

            {photoPreview && (
              <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, maxHeight: 160, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                <img src={photoPreview} alt="Фото" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }} />
              </div>
            )}

            {/* Editable items list */}
            {editedItems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {editedItems.map((item, i) => (
                  <div key={i} style={{
                    padding: '8px 0',
                    borderBottom: i < editedItems.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                        {/* Editable weight/volume */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {item.is_drink ? (
                            <>
                              <input
                                type="number"
                                value={item.volume_ml || ''}
                                onChange={e => handleVolumeChange(i, Math.max(0, parseInt(e.target.value) || 0))}
                                style={{
                                  width: 60, background: 'rgba(96,165,250,0.1)',
                                  border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8,
                                  padding: '4px 6px', color: 'var(--accent-blue)', fontSize: 13,
                                  fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', outline: 'none',
                                }}
                              />
                              <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>мл</span>
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                value={item.weight_g}
                                onChange={e => handleWeightChange(i, Math.max(1, parseInt(e.target.value) || 1))}
                                style={{
                                  width: 60, background: 'rgba(124,58,237,0.08)',
                                  border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8,
                                  padding: '4px 6px', color: 'var(--text-primary)', fontSize: 13,
                                  fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', outline: 'none',
                                }}
                              />
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>г</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        {item.is_drink && item.calories === 0 ? (
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)' }}>
                            {item.volume_ml || 0} мл
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{item.calories}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Б{item.protein} Ж{item.fat} У{item.carbs}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 12,
              background: isDrinkResult ? 'rgba(96,165,250,0.08)' : 'rgba(124, 58, 237, 0.08)',
              border: `1px solid ${isDrinkResult ? 'rgba(96,165,250,0.15)' : 'rgba(124, 58, 237, 0.15)'}`,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Итого</span>
              <div style={{ textAlign: 'right' }}>
                {isDrinkResult && editedTotals.calories === 0 ? (
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {editedItems.reduce((s, i) => s + (i.volume_ml || 0), 0)} мл
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{editedTotals.calories}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>ккал</span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Б{Math.round(editedTotals.protein)} Ж{Math.round(editedTotals.fat)} У{Math.round(editedTotals.carbs)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI comment */}
            {pendingLog.comment && (
              <div style={{
                fontSize: 13, color: 'var(--text-secondary)',
                padding: '8px 0', fontStyle: 'italic', marginBottom: 8,
              }}>
                {pendingLog.comment}
              </div>
            )}

            {/* Hint */}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
              Нажми на вес, чтобы скорректировать порцию
            </div>

            {/* Confirm / Cancel */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancel} disabled={loading} style={{
                flex: 1, padding: '12px', borderRadius: 14,
                border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)',
                color: 'var(--red)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>Отмена</button>
              <button onClick={handleConfirm} disabled={loading} className="btn-primary" style={{ flex: 2 }}>
                {isDrinkResult && editedTotals.calories === 0 ? 'Записать воду' : 'Записать'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
