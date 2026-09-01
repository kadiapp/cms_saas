"use client";

import React, { useState } from 'react';
import * as Icon from 'react-feather';
import { useRouter } from 'next/navigation';
import { EMPTY_FORM } from '@/types';
import { verifyCptCode, verifyIcdCode, getFeeSchedule, searchCodeDictionary, checkCodePair, getMedicalNecessity } from '@/api/supabase';
import { extractTextFromPdf } from '@/pdfTextExtractor';
import './CodingAssistant.css';

export default function CodingAssistant() {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'ncci' | 'auto' | 'mednec'>('dictionary');
  
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
  const [autoMedNecWarnings, setAutoMedNecWarnings] = useState<any[]>([]);

  // Tab 4: Medical Necessity State
  const [medNecQuery, setMedNecQuery] = useState('');
  const [medNecFilter, setMedNecFilter] = useState('');
  const [isMedNecLoading, setIsMedNecLoading] = useState(false);
  const [medNecResults, setMedNecResults] = useState<string[] | null>(null);
  const [medNecSearchedCode, setMedNecSearchedCode] = useState('');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'dictionary' || tab === 'ncci' || tab === 'auto' || tab === 'mednec') {
        setActiveTab(tab);
      }
      
      const code = params.get('code');
      const code1 = params.get('code1');
      
      if (tab === 'dictionary' && code) setDictQuery(code);
      if (tab === 'ncci' && code1) setCode1(code1);
      if (tab === 'mednec' && code) setMedNecQuery(code);
      
      // Auto-trigger search if code is present
      if (tab === 'mednec' && code) {
        // We'll let the user click Check Coverage so they see what's happening, 
        // or we could auto-execute. For now, just pre-filling is great.
      }
    }
  }, []);

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
  const router = useRouter();

  const handleSendToClaim = () => {
    if (!autoResults) return;
    
    // Parse existing or start fresh
    let savedForm;
    try {
      const saved = localStorage.getItem('cms1500_autosave');
      savedForm = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(EMPTY_FORM));
    } catch (e) {
      savedForm = JSON.parse(JSON.stringify(EMPTY_FORM));
    }

    // Ensure arrays exist
    if (!savedForm.diagnosisCodes) savedForm.diagnosisCodes = Array(12).fill('');
    if (!savedForm.serviceLines) savedForm.serviceLines = JSON.parse(JSON.stringify(EMPTY_FORM.serviceLines));

    // 1. Populate ICD-10 into Box 21 (without decimals)
    const extractedDiags = (autoResults.diagnoses || []).map((d: any) => d.code.replace(/\./g, ''));
    extractedDiags.slice(0, 12).forEach((code: string, i: number) => {
      savedForm.diagnosisCodes[i] = code;
    });

    // 2. Populate CPT into Box 24D
    const extractedProcs = autoResults.procedures || [];
    extractedProcs.slice(0, 6).forEach((proc: any, i: number) => {
      if (savedForm.serviceLines[i]) {
        savedForm.serviceLines[i].cptCode = proc.code;
        // Default point to first diagnosis (A) if not already set and we have diags
        if (!savedForm.serviceLines[i].diagnosisPointer && extractedDiags.length > 0) {
          savedForm.serviceLines[i].diagnosisPointer = 'A';
        }
      }
    });

    // Save back to local storage and redirect to editor
    localStorage.setItem('cms1500_autosave', JSON.stringify(savedForm));
    router.push('/app/editor');
  };

  const runAutoCoder = async (noteText: string) => {
    if (!noteText.trim()) return;
    setIsAutoLoading(true);
    setAutoResults(null);
    try {
      const res = await fetch('/api/code-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText })
      });
      if (!res.ok) throw new Error("Failed to process note");
      const data = await res.json();
      const results = data.data;

      // Run medical necessity checks on extracted codes
      const warnings = [];
      if (results.procedures && results.diagnoses) {
        for (const proc of results.procedures) {
          const cptCode = proc.code;
          const coveredIcds = await getMedicalNecessity(cptCode);
          if (coveredIcds.length > 0) {
            const extractedIcds = results.diagnoses.map((d: any) => d.code.replace(/\./g, ''));
            const hasCovered = extractedIcds.some((icd: string) => coveredIcds.includes(icd));
            if (!hasCovered) {
              warnings.push({
                cpt: cptCode,
                message: `None of the extracted diagnoses are on the strict Medicare LCD/NCD covered list for CPT ${cptCode}.`
              });
            }
          }
        }
      }
      setAutoMedNecWarnings(warnings);
      setAutoResults(results);
    } catch(err) {
      console.error(err);
      alert("Error processing clinical note.");
    } finally {
      setIsAutoLoading(false);
    }
  };

  const handleAutoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAutoCoder(autoNote);
  };

  React.useEffect(() => {
    const savedNote = sessionStorage.getItem('pending_auto_note');
    if (savedNote) {
      setActiveTab('auto');
      setAutoNote(savedNote);
      sessionStorage.removeItem('pending_auto_note');
      setTimeout(() => runAutoCoder(savedNote), 50);
    }
  }, []);


  // -----------------------------------------------------
  // Medical Necessity Logic
  // -----------------------------------------------------
  const handleMedNecSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNecQuery.trim()) return;

    setIsMedNecLoading(true);
    setMedNecResults(null);
    setMedNecSearchedCode(medNecQuery.trim().toUpperCase());
    try {
      const results = await getMedicalNecessity(medNecQuery.trim().toUpperCase());
      setMedNecResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMedNecLoading(false);
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
          style={{color: '#3b82f6'}}
        >
          <Icon.Cpu size={18} /> AI Auto-Coder
        </button>
        <button 
          className={`ca-tab ${activeTab === 'mednec' ? 'active' : ''}`}
          onClick={() => setActiveTab('mednec')}
          style={{color: '#10b981'}}
        >
          <Icon.CheckCircle size={18} /> Medical Necessity
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
                      <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Concept: {diag.concept}</span>
                          {diag.ai_code && <span style={{ fontSize: '0.7rem', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '4px', padding: '2px 8px' }}>AI suggests: {diag.ai_code}</span>}
                        </div>
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
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {sug.source === 'ai' ? (
                                  <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246)', color: '#c084fc', border: '1px solid rgba(59,130,246)', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>🤖 AI Coded</span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                                )}
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
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Concept: {proc.concept}</span>
                          {proc.ai_code && <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246)', color: '#3b82f6', border: '1px solid rgba(59,130,246)', borderRadius: '4px', padding: '2px 8px' }}>AI suggests: {proc.ai_code}</span>}
                        </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px', borderLeft: '2px solid #334155', paddingLeft: '12px' }}>
                        "{proc.quote}"
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Top Database Matches:</div>
                        {proc.suggestions.map((sug: any, j: number) => (
                            <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div>
                                  <strong style={{ color: '#fff' }}>{sug.code}</strong> - {sug.short_description}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {sug.source === 'ai' ? (
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246)', color: '#c084fc', border: '1px solid rgba(59,130,246)', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>🤖 AI Coded</span>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Sim: {(sug.similarity * 100).toFixed(1)}%</span>
                                  )}
                                  <button type="button" onClick={() => handleCopyCode(sug.code)} style={{ padding: '4px 8px', background: copiedCode === sug.code ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)', border: copiedCode === sug.code ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: copiedCode === sug.code ? '#4ade80' : '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                    {copiedCode === sug.code ? <><Icon.Check size={12}/> Copied</> : <><Icon.Copy size={12}/> Copy</>}
                                  </button>
                                </div>
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Generic NCCI Edit Warning if multiple procedures exist */}
                  {autoResults.procedures.length > 1 && (
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', color: '#fef08a' }}>
                      <Icon.AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#eab308' }} />
                      <div>
                        <strong>Multiple Procedures Detected:</strong> The AI has extracted multiple CPT codes. Please use the <strong>NCCI Edit Checker</strong> tab to verify that these codes are not bundled together before submitting your claim.
                      </div>
                    </div>
                  )}

                  {autoMedNecWarnings.map((warning: any, i: number) => (
                    <div key={i} style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', color: '#fca5a5' }}>
                      <Icon.Shield size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
                      <div>
                        <strong>Medical Necessity Risk (CPT {warning.cpt}):</strong> {warning.message}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
                    <button 
                      onClick={handleSendToClaim}
                      className="ca-btn ca-btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Icon.Send size={16} /> Send to Claim Form
                    </button>
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>
      )}

      {activeTab === 'mednec' && (
        <div className="ca-tab-content">
          <div className="ca-ncci-box glass-card">
            <h2>Medical Necessity (LCD/NCD) Checker</h2>
            <p className="ca-ncci-subtitle">Enter a CPT procedure code to find its Medicare-approved ICD-10 diagnosis codes.</p>
            
            <form onSubmit={handleMedNecSearch} className="ca-ncci-form" style={{ maxWidth: '500px' }}>
              <div className="ca-input-wrapper">
                <Icon.Search size={20} className="ca-search-icon" />
                <input 
                  type="text" 
                  placeholder="Enter CPT Code (e.g., 82306)" 
                  value={medNecQuery}
                  onChange={(e) => setMedNecQuery(e.target.value.toUpperCase())}
                  className="ca-input"
                />
              </div>
              <button type="submit" className="btn btn-primary ca-btn" disabled={isMedNecLoading || !medNecQuery.trim()}>
                {isMedNecLoading ? 'Checking...' : 'Check Coverage'}
              </button>
            </form>

            {medNecResults && medNecResults.length > 0 && (
              <div className="ca-ncci-result" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.3)', marginTop: '24px' }}>
                <div className="ca-ncci-result-header" style={{ color: '#10b981', marginBottom: '16px' }}>
                  <Icon.CheckCircle size={24} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{medNecResults.length} Approved Diagnoses Found for CPT {medNecSearchedCode}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>These ICD-10 codes satisfy Medicare NCD/LCD medical necessity requirements for this procedure.</p>
                  </div>
                </div>

                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <Icon.Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Filter ICD-10 codes..."
                    value={medNecFilter}
                    onChange={(e) => setMedNecFilter(e.target.value)}
                    className="ca-input"
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {medNecResults.filter(icd => icd.toLowerCase().includes(medNecFilter.toLowerCase())).map(icd => (
                    <span key={icd} style={{ background: 'rgba(15,23,42,0.8)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {icd}
                    </span>
                  ))}
                  {medNecResults.filter(icd => icd.toLowerCase().includes(medNecFilter.toLowerCase())).length === 0 && (
                    <div style={{ color: '#94a3b8', padding: '12px 0', fontStyle: 'italic' }}>
                      No diagnosis codes match "{medNecFilter}"
                    </div>
                  )}
                </div>
              </div>
            )}
            {medNecResults && medNecResults.length === 0 && (
              <div className="ca-ncci-result" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', marginTop: '24px' }}>
                <div className="ca-ncci-result-header" style={{ color: '#f59e0b' }}>
                  <Icon.Info size={24} />
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>No specific LCD/NCD rules found</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>We couldn't find a strict national coverage list for {medNecSearchedCode}. Standard medical necessity documentation rules apply.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
