"use client";

import React, { useState } from 'react';
import * as Icon from 'react-feather';
import { verifyCptCode, verifyIcdCode, getFeeSchedule, searchCodeDictionary, checkCodePair } from '@/api/supabase';
import './CodingAssistant.css';

export default function CodingAssistant() {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'ncci'>('dictionary');
  
  // Tab 1: Dictionary State
  const [dictQuery, setDictQuery] = useState('');
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [dictResults, setDictResults] = useState<{cpt: any[], icd: any[]} | null>(null);
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<any>(null);
  const [selectedCodeType, setSelectedCodeType] = useState<'CPT' | 'ICD'>('CPT');
  const [selectedFee, setSelectedFee] = useState<any>(null);
  
  // Tab 2: NCCI State
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [isNcciLoading, setIsNcciLoading] = useState(false);
  const [ncciResult, setNcciResult] = useState<any>(null);
  const [ncciError, setNcciError] = useState('');

  // -----------------------------------------------------
  // Dictionary Logic
  // -----------------------------------------------------
  const handleDictSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dictQuery.trim()) return;

    setIsDictLoading(true);
    setSelectedCodeDetails(null);
    try {
      const results = await searchCodeDictionary(dictQuery.trim());
      setDictResults(results);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDictLoading(false);
    }
  };

  const handleSelectCode = async (code: string, type: 'CPT' | 'ICD') => {
    setIsDictLoading(true);
    setSelectedCodeDetails(null);
    setSelectedFee(null);
    try {
      if (type === 'CPT') {
        const details = await verifyCptCode(code);
        setSelectedCodeDetails(details);
        setSelectedCodeType('CPT');
        
        const fees = await getFeeSchedule([code]);
        if (fees && fees.length > 0) setSelectedFee(fees[0]);
        
      } else {
        const details = await verifyIcdCode(code);
        setSelectedCodeDetails(details);
        setSelectedCodeType('ICD');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDictLoading(false);
    }
  };

  // -----------------------------------------------------
  // NCCI Logic
  // -----------------------------------------------------
  const handleNcciCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code1.trim() || !code2.trim()) return;

    setIsNcciLoading(true);
    setNcciResult(null);
    setNcciError('');

    try {
      // Clean inputs
      const c1 = code1.trim().toUpperCase();
      const c2 = code2.trim().toUpperCase();
      
      const result = await checkCodePair(c1, c2);
      setNcciResult({
        c1, c2, ...result
      });
      
    } catch(err: any) {
      setNcciError(err.message || 'Error querying NCCI database');
    } finally {
      setIsNcciLoading(false);
    }
  };

  return (
    <div className="coding-assistant-container">
      <div className="ca-header">
        <h1><Icon.Database size={28} /> Medical Coding Assistant</h1>
        <p>Universal Code Dictionary and Dual-Code NCCI Edit Checker.</p>
      </div>

      <div className="ca-tabs">
        <button 
          className={`ca-tab ${activeTab === 'dictionary' ? 'active' : ''}`}
          onClick={() => setActiveTab('dictionary')}
        >
          <Icon.BookOpen size={18} /> Code Dictionary
        </button>
        <button 
          className={`ca-tab ${activeTab === 'ncci' ? 'active' : ''}`}
          onClick={() => setActiveTab('ncci')}
        >
          <Icon.Shield size={18} /> NCCI Edit Checker
        </button>
      </div>

      {activeTab === 'dictionary' && (
        <div className="ca-tab-content">
          <div className="ca-search-box glass-card" style={{ marginBottom: '24px' }}>
            <form onSubmit={handleDictSearch} className="ca-form">
              <div className="ca-input-wrapper" style={{ flex: 1 }}>
                <Icon.Search size={20} className="ca-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search by code (e.g. 99214, J1756) or keyword (e.g. injection, diabetes)..." 
                  value={dictQuery}
                  onChange={(e) => setDictQuery(e.target.value)}
                  className="ca-input"
                  style={{ width: '100%' }}
                />
              </div>
              <button type="submit" className={`btn btn-primary ca-btn ${isDictLoading ? 'loading' : ''}`} disabled={isDictLoading}>
                {isDictLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="ca-dict-layout">
            {dictResults && (
              <div className="ca-dict-results glass-card">
                <h3>Search Results</h3>
                <div className="ca-result-list">
                  <h4 className="ca-result-header">CPT / HCPCS Codes ({dictResults.cpt.length})</h4>
                  {dictResults.cpt.map(c => (
                    <div key={c.code} className="ca-result-item" onClick={() => handleSelectCode(c.code, 'CPT')}>
                      <span className="ca-badge cpt">CPT</span>
                      <strong>{c.code}</strong> - {c.short_description}
                    </div>
                  ))}
                  {dictResults.cpt.length === 0 && <p className="ca-empty-text">No CPT codes found.</p>}

                  <h4 className="ca-result-header" style={{ marginTop: '24px' }}>ICD-10 Diagnoses ({dictResults.icd.length})</h4>
                  {dictResults.icd.map(c => (
                    <div key={c.code} className="ca-result-item" onClick={() => handleSelectCode(c.code, 'ICD')}>
                      <span className="ca-badge icd">ICD</span>
                      <strong>{c.code}</strong> - {c.short_description}
                    </div>
                  ))}
                  {dictResults.icd.length === 0 && <p className="ca-empty-text">No ICD codes found.</p>}
                </div>
              </div>
            )}

            {selectedCodeDetails && (
              <div className="ca-dict-details glass-card">
                <div className="ca-details-header">
                  <span className={`ca-badge large ${selectedCodeType.toLowerCase()}`}>{selectedCodeType}</span>
                  <h2>{selectedCodeDetails.code}</h2>
                </div>
                
                <div className="ca-detail-section">
                  <h4>Short Description</h4>
                  <p>{selectedCodeDetails.short_description}</p>
                </div>
                
                {selectedCodeDetails.long_description && (
                  <div className="ca-detail-section">
                    <h4>Official Long Description</h4>
                    <p className="long-desc">{selectedCodeDetails.long_description}</p>
                  </div>
                )}

                {selectedCodeType === 'CPT' && selectedFee && (
                  <div className="ca-detail-section fee-section">
                    <h4>Medicare National Fee Schedule</h4>
                    <div style={{ display: 'flex', gap: '40px', marginTop: '12px' }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Non-Facility (Office)</div>
                        <div className="fee-amount" style={{ margin: 0 }}>${Number(selectedFee.non_facility_fee).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>Facility (Hospital)</div>
                        <div className="fee-amount" style={{ margin: 0, color: '#a78bfa' }}>${Number(selectedFee.facility_fee).toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="fee-disclaimer" style={{ marginTop: '16px' }}>Rates vary by MAC and locality.</p>
                  </div>
                )}
                
                {selectedCodeType === 'ICD' && selectedCodeDetails && (
                  <div className="ca-detail-section fee-section" style={{ background: selectedCodeDetails.billable ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${selectedCodeDetails.billable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                     <h4>Billable Status</h4>
                     {selectedCodeDetails.billable ? (
                       <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <Icon.CheckCircle size={18} /> Valid for Submission
                       </div>
                     ) : (
                       <div style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Icon.XCircle size={18} /> Not Billable (Requires greater specificity)
                         </div>
                         <span style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 'normal' }}>You cannot bill this code. You must select a more specific child code.</span>
                       </div>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ncci' && (
        <div className="ca-tab-content">
          <div className="ca-ncci-box glass-card">
            <h2>Check Code Compatibility</h2>
            <p className="ca-ncci-subtitle">Enter two CPT/HCPCS codes to check for National Correct Coding Initiative (NCCI) Procedure-to-Procedure (PTP) edits.</p>
            
            <form onSubmit={handleNcciCheck} className="ca-ncci-form">
              <div className="ca-ncci-inputs">
                <div className="ca-ncci-field">
                  <label>Code 1 (Primary)</label>
                  <input type="text" placeholder="e.g. 99214" value={code1} onChange={e=>setCode1(e.target.value)} required maxLength={5} />
                </div>
                <div className="ca-ncci-vs">VS</div>
                <div className="ca-ncci-field">
                  <label>Code 2 (Secondary)</label>
                  <input type="text" placeholder="e.g. 20610" value={code2} onChange={e=>setCode2(e.target.value)} required maxLength={5} />
                </div>
              </div>
              <button type="submit" className={`btn btn-primary ${isNcciLoading ? 'loading' : ''}`} disabled={isNcciLoading}>
                {isNcciLoading ? 'Checking Database...' : 'Check NCCI Edits'}
              </button>
            </form>
            {ncciError && <div className="ca-error"><Icon.AlertCircle size={16} /> {ncciError}</div>}
          </div>

          {ncciResult && (
            <div className={`ca-ncci-result-card glass-card status-${ncciResult.status.replace(/\s+/g, '-').toLowerCase()}`}>
              <div className="ncci-result-header">
                {ncciResult.status === 'Allowed' && <Icon.CheckCircle size={40} color="#10b981" />}
                {ncciResult.status === 'Modifier Required' && <Icon.AlertTriangle size={40} color="#f59e0b" />}
                {ncciResult.status === 'Mutually Exclusive' && <Icon.XCircle size={40} color="#ef4444" />}
                
                <div className="ncci-result-title">
                  <h3>{ncciResult.c1} + {ncciResult.c2}</h3>
                  <div className="status-badge">{ncciResult.status}</div>
                </div>
              </div>
              
              <div className="ncci-result-body">
                {ncciResult.status === 'Allowed' && (
                  <p>No NCCI conflicts found. These codes can generally be billed together without special modifiers, assuming clinical necessity.</p>
                )}
                {ncciResult.status === 'Modifier Required' && (
                  <>
                    <p><strong>Modifier Indicator 1:</strong> These codes are mutually exclusive, BUT you may bill them together if an appropriate NCCI-associated modifier (e.g., 59, 25, RT/LT) is appended to indicate a distinct procedural service.</p>
                    <div className="modifier-tip">Ensure the medical record clearly documents that these were distinct, separate procedures.</div>
                  </>
                )}
                {ncciResult.status === 'Mutually Exclusive' && (
                  <p><strong>Modifier Indicator 0:</strong> These codes cannot be billed together under any circumstances. They are considered mutually exclusive or inherently part of the same procedure. Do not append a modifier.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
