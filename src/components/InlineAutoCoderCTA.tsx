"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

export default function InlineAutoCoderCTA() {
  const [note, setNote] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    
    // Save to session storage so the coding assistant can pick it up
    sessionStorage.setItem('pending_auto_note', note);
    router.push('/app/coding-assistant');
  };

  return (
    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '32px', marginBottom: '48px', marginTop: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon.Zap size={20} color="#10b981" />
          Code this procedure instantly
        </h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>
          Stop manually cross-referencing CMS rules. Paste your operative note below and let our AI extract the exact CPT and ICD-10 codes in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <textarea 
          placeholder="Paste clinical note, operative report, or visit summary here..." 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ 
            width: '100%', 
            minHeight: '120px', 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '8px', 
            padding: '16px', 
            color: '#f8fafc',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <Icon.Lock size={14} color="#10b981" />
            <span><strong>HIPAA Compliant</strong> &bull; Zero Data Retention &bull; No PHI stored</span>
          </div>
          <button 
            type="submit" 
            disabled={!note.trim()}
            style={{ 
              background: note.trim() ? '#10b981' : '#334155', 
              color: note.trim() ? '#fff' : '#94a3b8', 
              border: 'none',
              padding: '12px 24px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '1rem',
              cursor: note.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            Auto-Code Note <Icon.ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
