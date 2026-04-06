import React, { useState, useCallback } from 'react';
import { deepConsult } from '../lib/api';

interface Props {
  initData: string;
}

const CONSULT_TYPES = [
  { id: 'diet', icon: '🍽️', title: 'Анализ рациона', desc: 'Баланс КБЖУ и режим питания', focus: 'анализ рациона и баланса КБЖУ' },
  { id: 'vitamins', icon: '💊', title: 'Витамины и дефициты', desc: 'Что не хватает и как закрыть', focus: 'витамины, минералы и дефициты' },
  { id: 'lab', icon: '🏥', title: 'Разбор анализов', desc: 'Интерпретация результатов крови', focus: 'интерпретация анализов крови' },
  { id: 'progress', icon: '🎯', title: 'Оценка прогресса', desc: 'Как движешься к цели', focus: 'оценка прогресса к цели' },
  { id: 'full', icon: '🔬', title: 'Полная проверка', desc: 'Все 4 агента — максимальный разбор', focus: '' },
];

export default function DeepConsultPage({ initData }: Props) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');

  const run = useCallback(async (focus: string, id: string) => {
    setSelected(id);
    setLoading(true);
    setReport('');
    try {
      const res = await deepConsult(initData || 'dev', focus || undefined);
      if (res.ok && res.report) {
        setReport(res.report);
      }
    } catch (err: any) {
      setReport(`Ошибка: ${err?.message || 'нет соединения'}`);
    } finally {
      setLoading(false);
    }
  }, [initData]);

  const formatReport = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 6 }} />;

      // Section headers with emoji
      if (/^[#]+\s/.test(trimmed) || (trimmed.startsWith('**') && trimmed.endsWith('**'))) {
        return (
          <div key={i} style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            marginTop: 12, marginBottom: 4,
            paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
          </div>
        );
      }

      // Bold inline
      if (trimmed.includes('**')) {
        return (
          <div key={i} style={{ fontSize: 13, padding: '2px 0' }}>
            {trimmed.split(/\*\*(.*?)\*\*/g).map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </div>
        );
      }

      // List items
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        return (
          <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0 2px 8px' }}>
            {trimmed}
          </div>
        );
      }

      return (
        <div key={i} style={{ fontSize: 13, color: 'var(--text-primary)', padding: '2px 0', lineHeight: 1.5 }}>
          {trimmed}
        </div>
      );
    });
  };

  return (
    <div>
      <div className="section-title">Глубокая консультация</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
        4 AI-агента анализируют твоё питание, витамины и прогресс
      </div>

      {!report && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CONSULT_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => run(ct.focus, ct.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 22, flexShrink: 0 }}>{ct.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ct.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{ct.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 8 }}><span /><span /><span /></div>
          <div style={{ fontSize: 13, color: 'var(--accent-purple)' }}>
            Запускаю 4 AI-агента...
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>30-50 секунд</div>
        </div>
      )}

      {report && !loading && (
        <>
          <div className="card" style={{ padding: '14px 16px' }}>
            {formatReport(report)}
          </div>
          <button
            onClick={() => { setReport(''); setSelected(''); }}
            className="btn-primary"
            style={{ width: '100%', marginTop: 12, padding: 14 }}
          >
            Новая консультация
          </button>
        </>
      )}
    </div>
  );
}
