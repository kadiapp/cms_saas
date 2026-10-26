"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

interface InlineCodingAssistantCTAProps {
  defaultCpt?: string;
  title?: string;
  subtitle?: string;
  defaultTab?: 'dictionary' | 'ncci' | 'mednec' | 'npi' | 'auto' | string;
  buttonText?: string;
}

export default function InlineCodingAssistantCTA({
  defaultCpt = '',
  title = 'Interactive Medical Coding Assistant',
  subtitle = 'Look up CPT/ICD-10 rules, check NCCI bundling edits, verify Medicare LCD coverage, or check provider NPIs instantly.',
  defaultTab = 'dictionary'
}: InlineCodingAssistantCTAProps) {
  const router = useRouter();
  const validTabs = ['dictionary', 'ncci', 'mednec', 'npi', 'auto'];
  const initialTab = (validTabs.includes(defaultTab) ? defaultTab : 'dictionary') as 'dictionary' | 'ncci' | 'mednec' | 'npi' | 'auto';
  const [activeTab, setActiveTab] = useState<'dictionary' | 'ncci' | 'mednec' | 'npi' | 'auto'>(initialTab);

  // State for each tool's inputs
  const [dictQuery, setDictQuery] = useState(defaultCpt);
  const [medNecQuery, setMedNecQuery] = useState(defaultCpt);
  const [ncciCode, setNcciCode] = useState(defaultCpt);
  const [npiQuery, setNpiQuery] = useState('');
  const [autoNote, setAutoNote] = useState('');

  React.useEffect(() => {
    setDictQuery(defaultCpt);
    setMedNecQuery(defaultCpt);
    setNcciCode(defaultCpt);
  }, [defaultCpt]);

  const handleRoute = (tab: string, queryParam: string, queryValue: string) => {
    if (!queryValue.trim() && tab !== 'auto') return;

    if (typeof window !== 'undefined' && (window as any).clarity) {
      const eventMap: Record<string, string> = {
        dictionary: 'dictionary_cta_clicked',
        ncci: 'ncci_cta_clicked',
        mednec: 'mednec_cta_clicked',
        npi: 'box17_cta_clicked',
        auto: 'tldr_ai_cta_clicked'
      };
      (window as any).clarity('event', eventMap[tab] || 'dictionary_cta_clicked');
    }

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
    { id: 'dictionary', label: 'Code Dictionary', icon: <Icon.Book size={15} /> },
    { id: 'ncci', label: 'NCCI Edits', icon: <Icon.Shield size={15} /> },
    { id: 'mednec', label: 'Medical Necessity', icon: <Icon.CheckCircle size={15} /> },
    { id: 'npi', label: 'Provider NPI', icon: <Icon.UserCheck size={15} /> },
    { id: 'auto', label: 'AI Auto-Coder', icon: <Icon.Zap size={15} /> }
  ];

  return (
    <div className="micro-cta-widget" style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '14px', padding: '22px', margin: '32px 0', boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon.Command size={19} color="#3b82f6" />
          <span>{title}</span>
        </div>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
          {subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : '#94a3b8',
              border: `1px solid ${activeTab === tab.id ? 'rgba(59, 130, 246, 0.35)' : 'transparent'}`,
              padding: '7px 13px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.15s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'dictionary' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter CPT, HCPCS, or ICD-10 code (e.g. 74178, J1756)..."
              value={dictQuery}
              onChange={(e) => setDictQuery(e.target.value.toUpperCase())}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '11px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('dictionary', 'code', dictQuery)}
            />
            <button
              type="button"
              onClick={() => handleRoute('dictionary', 'code', dictQuery)}
              disabled={!dictQuery.trim()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: 600, cursor: dictQuery.trim() ? 'pointer' : 'not-allowed', opacity: dictQuery.trim() ? 1 : 0.5 }}
            >
              Lookup Code →
            </button>
          </div>
        )}

        {activeTab === 'ncci' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter CPT Code to view all NCCI bundling edits..."
              value={ncciCode}
              onChange={(e) => setNcciCode(e.target.value.toUpperCase())}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '11px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('ncci', 'code1', ncciCode)}
            />
            <button
              type="button"
              onClick={() => handleRoute('ncci', 'code1', ncciCode)}
              disabled={!ncciCode.trim()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: 600, cursor: ncciCode.trim() ? 'pointer' : 'not-allowed', opacity: ncciCode.trim() ? 1 : 0.5 }}
            >
              Check NCCI Edits →
            </button>
          </div>
        )}

        {activeTab === 'mednec' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter CPT Code (e.g. 82306, 74178)..."
              value={medNecQuery}
              onChange={(e) => setMedNecQuery(e.target.value.toUpperCase())}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '11px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('mednec', 'code', medNecQuery)}
            />
            <button
              type="button"
              onClick={() => handleRoute('mednec', 'code', medNecQuery)}
              disabled={!medNecQuery.trim()}
              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: 600, cursor: medNecQuery.trim() ? 'pointer' : 'not-allowed', opacity: medNecQuery.trim() ? 1 : 0.5 }}
            >
              Check LCD Coverage →
            </button>
          </div>
        )}

        {activeTab === 'npi' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter 10-digit Provider NPI..."
              value={npiQuery}
              onChange={(e) => setNpiQuery(e.target.value)}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '11px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRoute('npi', 'npi', npiQuery)}
            />
            <button
              type="button"
              onClick={() => handleRoute('npi', 'npi', npiQuery)}
              disabled={!npiQuery.trim()}
              style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: 600, cursor: npiQuery.trim() ? 'pointer' : 'not-allowed', opacity: npiQuery.trim() ? 1 : 0.5 }}
            >
              Verify NPI →
            </button>
          </div>
        )}

        {activeTab === 'auto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              placeholder="Paste clinical note, operative report, or billing scenario here..."
              value={autoNote}
              onChange={(e) => setAutoNote(e.target.value)}
              style={{ width: '100%', minHeight: '84px', background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '12px 14px', borderRadius: '8px', color: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleRoute('auto', '', '')}
                disabled={!autoNote.trim()}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: autoNote.trim() ? 'pointer' : 'not-allowed', opacity: autoNote.trim() ? 1 : 0.5 }}
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
