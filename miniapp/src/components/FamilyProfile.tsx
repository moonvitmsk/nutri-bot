import React, { useState } from 'react';

interface FamilyMember {
  id: string;
  name: string;
  relation: 'child' | 'spouse' | 'parent' | 'other';
  age: number;
  notes: string;
}

export default function FamilyProfile() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relation: 'child' as const, age: 0, notes: '' });

  const addMember = () => {
    if (!newMember.name.trim()) return;
    setMembers(prev => [...prev, {
      id: Date.now().toString(),
      ...newMember,
      name: newMember.name.trim(),
    }]);
    setNewMember({ name: '', relation: 'child', age: 0, notes: '' });
    setAdding(false);
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const RELATIONS: Record<string, string> = {
    child: '👶 Ребёнок',
    spouse: '💑 Супруг/а',
    parent: '👨‍👩‍👦 Родитель',
    other: '👤 Другое',
  };

  return (
    <div>
      <div className="section-title">Семейный профиль</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Добавьте членов семьи для персональных рецептов и советов
      </div>

      {members.map(m => (
        <div key={m.id} className="card" style={{
          padding: '14px 16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 24 }}>{m.relation === 'child' ? '👶' : m.relation === 'spouse' ? '💑' : '👤'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {RELATIONS[m.relation]} · {m.age} лет
              {m.notes && ` · ${m.notes}`}
            </div>
          </div>
          <button onClick={() => removeMember(m.id)} style={{
            background: 'none', border: 'none', color: '#ef4444',
            fontSize: 16, cursor: 'pointer',
          }}>✕</button>
        </div>
      ))}

      {adding ? (
        <div className="card" style={{ padding: '16px', marginBottom: 8 }}>
          <input
            value={newMember.name}
            onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
            placeholder="Имя"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {Object.entries(RELATIONS).map(([k, v]) => (
              <button key={k} onClick={() => setNewMember(p => ({ ...p, relation: k as any }))} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${newMember.relation === k ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: newMember.relation === k ? 'rgba(124,58,237,0.12)' : 'transparent',
                color: 'var(--text-primary)',
              }}>{v}</button>
            ))}
          </div>
          <input
            type="number"
            value={newMember.age || ''}
            onChange={e => setNewMember(p => ({ ...p, age: parseInt(e.target.value) || 0 }))}
            placeholder="Возраст"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addMember} style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'var(--accent-purple)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Добавить</button>
            <button onClick={() => setAdding(false)} style={{
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
              border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>Отмена</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: '1px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)',
          color: 'var(--accent-purple)', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Добавить члена семьи
        </button>
      )}
    </div>
  );
}
