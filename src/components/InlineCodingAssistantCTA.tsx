"use client";

import React, { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Shield, CheckCircle, UserCheck, Zap, Command, ArrowRight } from 'react-feather';

interface InlineCodingAssistantCTAProps {
  defaultCpt?: string;
  title?: string;
  subtitle?: string;
  defaultTab?: 'dictionary' | 'ncci' | 'mednec' | 'npi' | 'auto' | string;
  buttonText?: string;
  feePreview?: { non_facility_fee: number; facility_fee: number } | null;
  medNecPreview?: { totalCount: number; sampleCodes: string[] } | null;
}

export default function InlineCodingAssistantCTA({
  defaultCpt = '',
  title = 'Interactive Medical Coding Assistant',
  subtitle = 'Look up CPT/HCPCS/ICD-10 rules, check NCCI bundling edits, verify Medicare LCD coverage, or check provider NPIs instantly.',
  defaultTab = 'dictionary',
  feePreview = null,
  medNecPreview = null
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

  const prefetchAssistant = () => {
    router.prefetch('/app/coding-assistant');
  };

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
      startTransition(() => {
        router.push(`/app/coding-assistant?tab=auto`);
      });
      return;
    }

    startTransition(() => {
      router.push(`/app/coding-assistant?tab=${tab}&${queryParam}=${encodeURIComponent(queryValue.trim())}`);
    });
  };

  const tabs = [
    { id: 'dictionary', label: 'Code Dictionary', icon: <Book size={15} /> },
    { id: 'ncci', label: 'NCCI Edits', icon: <Shield size={15} /> },
    { id: 'mednec', label: 'Medical Necessity', icon: <CheckCircle size={15} /> },
    { id: 'npi', label: 'Provider NPI', icon: <UserCheck size={15} /> },
    { id: 'auto', label: 'AI Auto-Coder', icon: <Zap size={15} /> }
  ];

  return (
    <div
      className="micro-cta-widget"
      onMouseEnter={prefetchAssistant}
      style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '14px', padding: '22px', margin: '32px 0', boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}
    >
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Command size={19} color="#3b82f6" />
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
            onClick={() => startTransition(() => setActiveTab(tab.id as any))}
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
              onFocus={prefetchAssistant}
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
              onFocus={prefetchAssistant}
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
              onFocus={prefetchAssistant}
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
              onFocus={prefetchAssistant}
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
              onFocus={prefetchAssistant}
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
                Auto-Code Note <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live 2026 Database Snapshot Preview (Server-Fetched Fee + Medicare LCD Coverage) */}
      {defaultCpt && (feePreview || (medNecPreview && medNecPreview.totalCount > 0)) && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {feePreview && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.84rem', color: '#cbd5e1' }}>
              <span>
                <strong style={{ color: '#60a5fa' }}>2026 Medicare National Fee ({defaultCpt}):</strong>{' '}
                Non-Facility (Office): <strong style={{ color: '#4ade80' }}>${Number(feePreview.non_facility_fee).toFixed(2)}</strong>
                {' · '}
                Facility (Hospital): <strong style={{ color: '#a78bfa' }}>${Number(feePreview.facility_fee).toFixed(2)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleRoute('ncci', 'code1', defaultCpt)}
                style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Check {defaultCpt} NCCI Bundling Edits →
              </button>
            </div>
          )}

          {medNecPreview && medNecPreview.totalCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.83rem', color: '#94a3b8' }}>
                <span>
                  <strong style={{ color: '#10b981' }}>✓ {medNecPreview.totalCount.toLocaleString()} Medicare-Approved ICD-10 Diagnoses</strong> on file for {defaultCpt}:
                </span>
                <button
                  type="button"
                  onClick={() => handleRoute('mednec', 'code', defaultCpt)}
                  style={{ background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', borderRadius: '6px', padding: '4px 10px', fontSize: '0.79rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  View all {medNecPreview.totalCount.toLocaleString()} covered ICD-10s →
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {medNecPreview.sampleCodes.map(icd => (
                  <button
                    key={icd}
                    type="button"
                    onClick={() => handleRoute('dictionary', 'code', icd)}
                    title={`Look up ICD-10 ${icd} in Code Dictionary`}
                    style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', borderRadius: '5px', padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'monospace', cursor: 'pointer' }}
                  >
                    {icd}
                  </button>
                ))}
                {medNecPreview.totalCount > medNecPreview.sampleCodes.length && (
                  <button
                    type="button"
                    onClick={() => handleRoute('mednec', 'code', defaultCpt)}
                    style={{ background: 'transparent', border: '1px dashed rgba(148, 163, 184, 0.35)', color: '#94a3b8', borderRadius: '5px', padding: '3px 8px', fontSize: '0.76rem', cursor: 'pointer' }}
                  >
                    +{(medNecPreview.totalCount - medNecPreview.sampleCodes.length).toLocaleString()} more
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
