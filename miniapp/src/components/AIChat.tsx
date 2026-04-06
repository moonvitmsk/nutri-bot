import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithAI } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  initData: string;
}

const GREETING: Message = { role: 'assistant', text: 'Привет! Я moonvit, твой AI-нутрициолог. Спроси меня о питании, витаминах, рецептах — что угодно.' };

export default function AIChat({ initData }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('mv_chat');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [GREETING];
  });

  useEffect(() => {
    try { localStorage.setItem('mv_chat', JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await chatWithAI(initData || 'dev', text);
      if (res.ok && res.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: res.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Не удалось получить ответ. Попробуй ещё раз.' }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Ошибка: ${err?.message || 'нет соединения'}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, initData]);

  const quickQuestions = [
    'Какие витамины мне пить?',
    'Что поесть перед тренировкой?',
    'Чем заменить сахар?',
    'Как набрать больше белка?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div className="section-title" style={{ flexShrink: 0, marginBottom: 8 }}>moonvit AI</div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '0 2px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(96,165,250,0.15))'
                : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user'
                ? '1px solid rgba(124,58,237,0.2)'
                : '1px solid rgba(255,255,255,0.06)',
              fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
            }}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start', padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        )}

        {/* Quick questions — show only at start */}
        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); setTimeout(() => { setInput(q); }, 50); }}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: '1px solid rgba(124,58,237,0.15)',
                  background: 'rgba(124,58,237,0.04)',
                  color: 'var(--accent-purple)', fontSize: 11,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, paddingTop: 10, flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: 8,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Спроси о питании..."
          rows={1}
          disabled={loading}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
            padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14,
            fontFamily: "'Outfit', sans-serif", resize: 'none', outline: 'none',
            maxHeight: 80,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="btn-primary"
          style={{
            padding: '10px 16px', flexShrink: 0,
            opacity: !input.trim() || loading ? 0.4 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
