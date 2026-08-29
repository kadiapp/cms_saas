"use client";

import React, { useState } from 'react';
import * as Icon from 'react-feather';
import { verifyCptCode, verifyIcdCode, getFeeSchedule, searchCodeDictionary, checkCodePair } from '@/api/supabase';
import { extractTextFromPdf } from '@/pdfTextExtractor';
import './CodingAssistant.css';

export default function CodingAssistant() {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'ncci' | 'auto'>('dictionary');
  
  // Tab 1: Dictionary State
  const [dictQuery, setDictQuery] = useState('');
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [dictResults, setDictResults] = useState<{cpt: any[], icd: any[]} | null>(null);
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<any>(null);
  const [selectedCodeType, setSelectedCodeType] = useState<'CPT' | 'ICD'>('CPT');
  const [selectedFee, setSelectedFee] = useState<any>(null);
  
  // Tab 3: Auto-Coder State
  const [autoNote, setAutoNote] = useState('');
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoResults, setAutoResults] = useState<any>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPdfLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);
      setAutoNote(text);
    } catch (err) {
      console.error(err);
      alert("Failed to extract text from PDF.");
    } finally {
      setIsPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };
  
  // Tab 2: NCCI State
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [isNcciLoading, setIsNcciLoading] = useState(false);
  const [ncciResult, setNcciResult] = useState<any>(null);
  const [ncciError, setNcciError] = useState('');

  // -----------------------------------------------------
  // Auto-Coder Logic
  // -----------------------------------------------------
  const handleAutoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoNote.trim()) return;
    
    setIsAutoLoading(true);
    setAutoResults(null);
    try {
      const res = await fetch('/api/code-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: autoNote })
      });
      if (!res.ok) throw new Error("Failed to process note");
      const data = await res.json();
      setAutoResults(data.data);
    } catch(err) {
      console.error(err);
      alert("Error processing clinical note.");
    } finally {
      setIsAutoLoading(false);
    }
  };

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
        <button 
          className={`ca-tab ${activeTab === 'auto' ? 'active' : ''}`}
          onClick={() => setActiveTab('auto')}
          style={{color: '#a855f7'}}
        >
          <Icon.Cpu size={18} /> AI Auto-Coder
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
                      <div style={{ flex: 1 }}><strong>{c.code}</strong> - {c.short_description}</div>
                      <Icon.ChevronRight size={16} color="#64748b" />
                    </div>
                  ))}
                  {dictResults.cpt.length === 0 && <p className="ca-empty-text">No CPT codes found.</p>}

                  <h4 className="ca-result-header" style={{ marginTop: '24px' }}>ICD-10 Diagnoses ({dictResults.icd.length})</h4>
                  {dictResults.icd.map(c => (
                    <div key={c.code} className="ca-result-item" onClick={() => handleSelectCode(c.code, 'ICD')}>
                      <span className="ca-badge icd">ICD</span>
                      <div style={{ flex: 1 }}><strong>{c.code}</strong> - {c.short_description}</div>
                      <Icon.ChevronRight size={16} color="#64748b" />
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
      
      {activeTab === 'auto' && (
        <div className="ca-tab-content">
          <div className="ca-card">
            <h2 className="ca-card-title">AI Auto-Coder</h2>
            <p className="ca-card-subtitle" style={{marginBottom: 20}}>Paste a clinical note, operative report, or visit summary. Our AI will extract the medical concepts and use semantic search to suggest validated CPT and ICD-10 codes.</p>
            
            <form onSubmit={handleAutoCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <textarea
                  value={autoNote}
                  onChange={e => setAutoNote(e.target.value)}
                  placeholder="Patient presents today with severe right knee pain. X-rays were taken showing advanced osteoarthritis. Administered a 40mg Kenalog injection into the right knee joint under ultrasound guidance..."
                  style={{ width: '100%', height: '200px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button type="submit" className={`btn btn-primary ca-btn ${isAutoLoading ? 'loading' : ''}`} disabled={isAutoLoading || !autoNote.trim()}>
                    {isAutoLoading ? 'Analyzing Note...' : 'Auto-Code Note'}
                  </button>
                  <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
                  <button type="button" className="btn btn-secondary ca-btn" onClick={() => fileInputRef.current?.click()} disabled={isPdfLoading}>
                    {isPdfLoading ? 'Reading PDF...' : <><Icon.Upload size={16} style={{marginRight: 8}}/> Upload PDF</>}
                  </button>
                </div>
              </form>
          </div>
          
          {isAutoLoading && (
            <div className="ca-card" style={{ marginTop: 24, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <Icon.Loader size={32} className="spinning" style={{marginBottom: 16}} />
              <p>Reading note, extracting concepts, and querying vector database...</p>
            </div>
          )}
          
          {autoResults && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {autoResults.diagnoses?.length > 0 && (
                <div className="ca-card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#fff' }}>ICD-10 Diagnoses</h3>
                  {autoResults.diagnoses.map((diag: any, i: number) => (
                    <div key={i} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                      <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px' }}>Concept: {diag.concept}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px', borderLeft: '2px solid #334155', paddingLeft: '12px' }}>
                        "{diag.quote}"
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Top Database Matches:</div>
                        {diag.suggestions.map((sug: any, j: number) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <div>
                              <strong style={{ color: '#fff' }}>{sug.code}</strong> - {sug.short_description}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                                {sug.billable ? (
                                  <span className="ca-badge" style={{background: 'rgba(34,197,94,0.2)', color: '#4ade80'}}>Billable</span>
                                ) : (
                                  <span className="ca-badge" style={{background: 'rgba(239,68,68,0.2)', color: '#f87171'}}>Parent (Need Child)</span>
                                )}
                                <button type="button" onClick={() => handleCopyCode(sug.code)} style={{ padding: '4px 8px', background: copiedCode === sug.code ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)', border: copiedCode === sug.code ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: copiedCode === sug.code ? '#4ade80' : '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                  {copiedCode === sug.code ? <><Icon.Check size={12}/> Copied</> : <><Icon.Copy size={12}/> Copy</>}
                                </button>
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {autoResults.procedures?.length > 0 && (
                <div className="ca-card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#fff' }}>CPT Procedures</h3>
                  {autoResults.procedures.map((proc: any, i: number) => (
                    <div key={i} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                      <div style={{ fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>Concept: {proc.concept}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px', borderLeft: '2px solid #334155', paddingLeft: '12px' }}>
                        "{proc.quote}"
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Top Database Matches:</div>
                        {proc.suggestions.map((sug: any, j: number) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <div>
                              <strong style={{ color: '#fff' }}>{sug.code}</strong> - {sug.short_description}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
            </div>
          )}
        </div>
      )}

    </div>
  );
}
