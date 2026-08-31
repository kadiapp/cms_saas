"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

interface InlineCodingAssistantCTAProps {
  defaultCpt?: string;
}

export default function InlineCodingAssistantCTA({ defaultCpt = '' }: InlineCodingAssistantCTAProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dictionary' | 'ncci' | 'mednec' | 'auto'>('dictionary');
  
  // State for each tool's inputs
  const [dictQuery, setDictQuery] = useState(defaultCpt);
  const [medNecQuery, setMedNecQuery] = useState(defaultCpt);
  const [ncciCode, setNcciCode] = useState(defaultCpt);
  const [autoNote, setAutoNote] = useState('');

  const handleRoute = (tab: string, queryParam: string, queryValue: string) => {
    if (!queryValue.trim() && tab !== 'auto') return;
    
    if (tab === 'auto') {
      if (autoNote.trim()) {
        sessionStorage.setItem('pending_auto_note', autoNote);
      }
      router.push(`/app/coding-assistant?tab=auto`);
      return;
    }

    router.push(`/app/coding-assistant?tab=${tab}&${queryParam}=${encodeURIComponent(queryValue.trim())}`);
  };

  const tabs = [
    { id: 'dictionary', label: 'Code Dictionary', icon: <Icon.Book size={16} /> },
    { id: 'ncci', label: 'NCCI Edits', icon: <Icon.Shield size={16} /> },
    { id: 'mednec', label: 'Medical Necessity', icon: <Icon.CheckCircle size={16} /> },
    { id: 'auto', label: 'AI Auto-Coder', icon: <Icon.Zap size={16} /> }
  ];

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', marginBottom: '48px', marginTop: '32px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon.Command size={20} color="#3b82f6" />
          Medical Coding Assistant
        </h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Select a tool below to quickly look up rules or auto-code clinical notes.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              border: `1px solid ${activeTab === tab.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'dictionary' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Enter CPT, HCPCS, or ICD-10 code..."
              value={dictQuery}
              onChange={(e) => setDictQuery(e.target.value.toUpperCase())}
              style={{ flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('dictionary', 'code', dictQuery)}
            />
            <button
              onClick={() => handleRoute('dictionary', 'code', dictQuery)}
              disabled={!dictQuery.trim()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: dictQuery.trim() ? 'pointer' : 'not-allowed', opacity: dictQuery.trim() ? 1 : 0.5 }}
            >
              Search
            </button>
          </div>
        )}

        {activeTab === 'ncci' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Enter Primary CPT Code..."
              value={ncciCode}
              onChange={(e) => setNcciCode(e.target.value.toUpperCase())}
              style={{ flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('ncci', 'code1', ncciCode)}
            />
            <button
              onClick={() => handleRoute('ncci', 'code1', ncciCode)}
              disabled={!ncciCode.trim()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: ncciCode.trim() ? 'pointer' : 'not-allowed', opacity: ncciCode.trim() ? 1 : 0.5 }}
            >
              Check Edits
            </button>
          </div>
        )}

        {activeTab === 'mednec' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Enter CPT Code (e.g. 82306)..."
              value={medNecQuery}
              onChange={(e) => setMedNecQuery(e.target.value.toUpperCase())}
              style={{ flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('mednec', 'code', medNecQuery)}
            />
            <button
              onClick={() => handleRoute('mednec', 'code', medNecQuery)}
              disabled={!medNecQuery.trim()}
              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: medNecQuery.trim() ? 'pointer' : 'not-allowed', opacity: medNecQuery.trim() ? 1 : 0.5 }}
            >
              Check Coverage
            </button>
          </div>
        )}

        {activeTab === 'auto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              placeholder="Paste clinical note or operative report here..."
              value={autoNote}
              onChange={(e) => setAutoNote(e.target.value)}
              style={{ width: '100%', minHeight: '100px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px', color: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleRoute('auto', '', '')}
                disabled={!autoNote.trim()}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: autoNote.trim() ? 'pointer' : 'not-allowed', opacity: autoNote.trim() ? 1 : 0.5 }}
              >
                Auto-Code Note <Icon.ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
