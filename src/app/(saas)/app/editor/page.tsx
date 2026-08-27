"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Select from 'react-select';

import './App.css';
import type { ClaimForm, ServiceLine } from '@/types';
import { EMPTY_FORM, SAMPLE_CLAIM } from '@/types';
import { validateClaim, computeReadiness, runAdvancedClinicalValidation } from '@/validation';
import type { ValidationResult } from '@/validation';
import { importFromPdf } from '@/pdfImport';
import { exportToPdf } from '@/pdfExport';
import { extractTextFromPdf } from '@/pdfTextExtractor';
import { generate837P } from '@/ediExport';
import { verifyNpi, type NpiResult } from '@/api/nppes';
import { verifyIcdCode, verifyCptCode, extractClaimFromText, supabase, saveClaim, getUserClaims, deleteClaim, getClaimById, getPayerRules, getProviders, getPatients, logActivity, type CodeResult, type SavedClaim, type ProviderRecord, type PatientRecord } from '@/api/supabase';
import { preScrubClaim } from '@/api/clearinghouse';

// ============================================================
// Tiny icon components (inline SVG)
// ============================================================
const Icon = {
  Shield:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.88 5.76L20 9l-4.88 4.24L16.72 19 12 15.76 7.28 19l1.6-5.76L4 9l6.12-.24z"/></svg>,
  Upload:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Rows:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>,
  Check:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Warn:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Plus:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Chevron:  ({open}: {open: boolean}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: open ? 'rotate(180deg)' : 'none', transition: '180ms'}}>  <polyline points="6 9 12 15 18 9"/></svg>,
  Play:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Info:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Document: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  LogOut:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,

  Send:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,

  CheckCircle: ({size=16, color="currentColor", style={}}: {size?: number, color?: string, style?: any}) => <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
};

// ============================================================
// Field component
// ============================================================
interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  boxNum?: string;
  helpSlug?: string;
}

function Field({ label, required, children, error, boxNum, helpSlug }: FieldProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {boxNum && <span style={{ color: 'var(--text-muted)', marginRight: 4, fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{boxNum}.</span>}
        {label}
        {required && <span className="required">*</span>}
        {helpSlug && (
          <a
            href={`/${helpSlug}`}
            target="_blank"
            rel="noreferrer"
            title="Read our guide on this field"
            style={{ 
              marginLeft: 8, 
              display: 'inline-flex', 
              alignItems: 'center', 
              color: 'var(--accent-2)', 
              textDecoration: 'none',
              background: 'rgba(6, 182, 212, 0.1)',
              padding: '2px 4px',
              borderRadius: '4px',
              border: '1px solid var(--accent-2)'
            }}
          >
            <Icon.Info size={14} style={{ marginRight: 4 }} />
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Guide</span>
          </a>
        )}
      </label>
      {children}
      {error && <div className="field-error"><Icon.Warn />{error}</div>}
    </div>
  );
}

// ============================================================
// Section component (collapsible)
// ============================================================
interface SectionProps {
  num: number | string;
  title: string;
  children: React.ReactNode;
  badge?: 'complete' | 'incomplete' | 'error';
  defaultOpen?: boolean;
}

function Section({ num, title, children, badge, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card form-section">
      <div className="section-header" onClick={() => setOpen(o => !o)} role="button" tabIndex={0}
           onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}>
        <div className="section-number">{num}</div>
        <span className="section-title">{title}</span>
        {badge && (
          <span className={`section-badge badge-${badge}`}>
            {badge === 'complete' ? '✓ Complete' : badge === 'error' ? '✗ Errors' : '○ Incomplete'}
          </span>
        )}
        <span className="section-field-count">
          {open ? 'Click to collapse' : 'Click to expand'}
        </span>
        <span className={`section-chevron ${open ? 'open' : ''}`}><Icon.Chevron open={open} /></span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

// ============================================================
// Validation Modal
// ============================================================
interface ValidationModalProps {
  results: ValidationResult[];
  readiness: number;
  onClose: () => void;
}

function SidebarValidationReport({ results }: { results: ValidationResult[] }) {
  const criticals = results.filter(r => r.status === 'critical');
  const errors = results.filter(r => r.status === 'error');
  const warns  = results.filter(r => r.status === 'warn');
  const infos  = results.filter(r => r.status === 'info');
  const oks    = results.filter(r => r.status === 'ok');

  return (
    <div className="glass-card sidebar-card validation-report-card">
      <div className="validation-report-header">
        <Icon.FileText size={18} />
        <h3>Detailed Report</h3>
      </div>
      
      {(criticals.length > 0 || errors.length > 0) && (
        <div className="validation-summary-text">
          Found {criticals.length + errors.length} issues to resolve before export.
        </div>
      )}

      <div className="validation-list">
          {criticals.length > 0 && (
            <div className="validation-section critical">
              <div className="validation-section-header">
                <Icon.Warn /> Critical Failures ({criticals.length})
              </div>
              <div className="validation-section-body">
                {criticals.map((c, i) => (
                  <div key={i} className="validation-item critical" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="validation-badge">{c.label.split('.')[0]}</div>
                    <div className="validation-message">
                      <strong>{c.label.substring(c.label.indexOf('.') + 1).trim()}:</strong> {c.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="validation-section error">
              <div className="validation-section-header">
                <Icon.Warn /> Required Fields Missing ({errors.length})
              </div>
              <div className="validation-section-body">
                {errors.map((e, i) => (
                  <div key={i} className="validation-item error" style={{ animationDelay: `${(criticals.length + i) * 0.1}s` }}>
                    <div className="validation-badge">{e.label.split('.')[0] || 'Req'}</div>
                    <div className="validation-message">
                      <strong>{e.label.includes('.') ? e.label.substring(e.label.indexOf('.') + 1).trim() : e.label}:</strong> {e.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warns.length > 0 && (
            <div className="validation-section warn">
              <div className="validation-section-header">
                <Icon.Warn /> Warnings ({warns.length})
              </div>
              <div className="validation-section-body">
                {warns.map((w, i) => (
                  <div key={i} className="validation-item warn" style={{ animationDelay: `${(criticals.length + errors.length + i) * 0.1}s` }}>
                    <div className="validation-badge">{w.label.split('.')[0] || 'Warn'}</div>
                    <div className="validation-message">
                      <strong>{w.label.includes('.') ? w.label.substring(w.label.indexOf('.') + 1).trim() : w.label}:</strong> {w.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {infos.length > 0 && (
            <div className="validation-section info">
              <div className="validation-section-header">
                <Icon.Check /> Verified Info ({infos.length})
              </div>
              <div className="validation-section-body">
                {infos.map((info, i) => (
                  <div key={i} className="validation-item info" style={{ animationDelay: `${(criticals.length + errors.length + warns.length + i) * 0.1}s` }}>
                    <div className="validation-badge">{info.label.split('.')[0] || 'Info'}</div>
                    <div className="validation-message">
                      <strong>{info.label.includes('.') ? info.label.substring(info.label.indexOf('.') + 1).trim() : info.label}:</strong> {info.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {oks.length > 0 && (
            <div className="validation-section ok">
              <details>
                <summary>
                  <Icon.Check /> Passed ({oks.length})
                </summary>
                <div className="validation-section-body">
                  {oks.map((ok, i) => (
                    <div key={i} className="validation-item ok">
                      <div className="validation-badge">{ok.label.split('.')[0] || 'OK'}</div>
                      <div className="validation-message">
                        <strong>{ok.label.includes('.') ? ok.label.substring(ok.label.indexOf('.') + 1).trim() : ok.label}:</strong> {ok.message}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
  );
}

// ============================================================
// Toast
// ============================================================
interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

// ============================================================
// AI Text Input sub-component
// ============================================================
function AiTextInput({ onExtract, isLoading }: { onExtract: (text: string) => void; isLoading: boolean }) {
  const [text, setText] = React.useState('');
  const SAMPLE = `Patient: John Doe, DOB: 03/15/1965, Male
Address: 500 Oak Lane, Denver, CO 80203, Phone: 7205551234
Insurance: Medicare, Member ID: 1EG4-TE5-MK72
Referring Physician: Dr. Sarah Williams, NPI: 1234567893

Visit Date: 08/01/2026
Chief Complaint: Type 2 Diabetes follow-up and hypertension management
Diagnoses: E11.9 (Type 2 Diabetes mellitus without complications), I10 (Essential hypertension)

Services Rendered:
- 99214 - Office or outpatient visit, moderate complexity - $180.00
- 83036 - Hemoglobin A1C - $45.00

Facility: Denver Family Medicine, 500 Oak Lane, Denver CO 80203
Billing Provider: Dr. James Carter MD, NPI: 9876543211
Tax ID: 84-1234567
Prior Auth: PA-2026-88421`;

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <textarea
          id="ai-autofill-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={isLoading}
          placeholder="Paste doctor's notes, patient intake text, encounter summaries, referral letters..."
          style={{
            width: '100%',
            minHeight: 200,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            padding: '0.875rem',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.6,
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,0.5)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        />
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: '0.7rem', color: 'var(--text-secondary)',
        }}>
          {text.length} chars
        </div>
      </div>

      {/* Sample fill button */}
      {!isLoading && (
        <button
          type="button"
          style={{
            background: 'none', border: 'none', color: 'rgba(168,85,247,0.8)',
            fontSize: '0.78rem', cursor: 'pointer', padding: 0,
            marginBottom: '1rem', textDecoration: 'underline',
          }}
          onClick={() => setText(SAMPLE)}
        >
          Use sample medical note to demo
        </button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.75rem 1rem',
          background: 'rgba(168,85,247,0.08)',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: 'rgba(168,85,247,0.9)',
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>✦</span>
          Gemini is extracting claim data... this may take a few seconds.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          id="btn-ai-extract"
          className="btn btn-primary"
          disabled={isLoading || text.trim().length < 20}
          onClick={() => onExtract(text)}
          style={{
            flex: 1,
            background: isLoading ? undefined : 'linear-gradient(135deg, #a855f7, #6366f1)',
            boxShadow: isLoading ? 'none' : '0 4px 15px rgba(168,85,247,0.35)',
          }}
        >
          {isLoading ? '⏳ Extracting…' : '✦ Extract & Fill Form'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [form, setForm] = useState<ClaimForm>(() => {
    try {
      const saved = localStorage.getItem('cms1500_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...EMPTY_FORM, ...parsed };
      }
    } catch (e) {}
    return EMPTY_FORM;
  });
  const [localValidationResults, setLocalValidationResults] = useState<ValidationResult[]>([]);
  const [deepValidationResults, setDeepValidationResults] = useState<ValidationResult[]>([]);
  const validationResults = [...localValidationResults, ...deepValidationResults];
  const [hasValidated, setHasValidated] = useState(false);
  const [showInvalidTemplateModal, setShowInvalidTemplateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Address Books
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  
  useEffect(() => {
    getProviders().then(setProviders).catch(() => {});
    getPatients().then(setPatients).catch(() => {});
  }, []);
  
  const autofillPatient = (id: string) => {
    if (!id) return;
    const p = patients.find(x => x.id === id);
    if (!p) return;
    
    setForm(f => {
      const next = { ...f };
      next.patientFirstName = p.first_name || '';
      next.patientLastName = p.last_name || '';
      
      // Convert YYYY-MM-DD to MM/DD/YYYY
      if (p.dob && p.dob.includes('-')) {
        const [y, m, d] = p.dob.split('-');
        next.patientDob = `${m}/${d}/${y}`;
      } else {
        next.patientDob = p.dob || '';
      }
      
      next.insurerId = p.insurance_id || '';
      next.insuranceType = p.insurance_type || '';
      if (p.sex === 'Male') next.patientSex = 'M';
      else if (p.sex === 'Female') next.patientSex = 'F';
      else next.patientSex = p.sex || '';
      
      // Parse Address (e.g. "123 Main St, Springfield, IL 62701")
      const parts = (p.address || '').split(',');
      next.patientAddress = parts[0]?.trim() || '';
      if (parts.length > 1) {
          next.patientCity = parts[1]?.trim() || '';
      }
      if (parts.length > 2) {
          const stZip = parts[2].trim().split(' ');
          next.patientState = stZip[0] || '';
          next.patientZip = stZip[1] || '';
      }
      
      // Automatically assume the Patient is the Primary Insured to save time!
      next.patientRelationship = 'Self';
      next.insuredFirstName = p.first_name || '';
      next.insuredLastName = p.last_name || '';
      next.insuredDob = next.patientDob;
      next.insuredSex = next.patientSex;
      next.patientPhone = p.phone || '';
      next.insuredPhone = p.phone || '';
      next.insuredAddress = next.patientAddress;
      next.insuredCity = next.patientCity;
      next.insuredState = next.patientState;
      next.insuredZip = next.patientZip;
      
      return next;
    });
    showToast('Patient autofilled perfectly!', 'info');
  };
  
  const autofillProvider = (id: string, type: 'billing' | 'facility' | 'referring') => {
    if (!id) return;
    const p = providers.find(x => x.id === id);
    if (!p) return;
    
    setForm(f => {
      const next = { ...f };
      if (type === 'billing') {
        next.billingProviderName = p.name || '';
        next.billingNpi = p.npi || '';
        next.federalTaxId = p.tax_id || '';
        const parts = (p.address || '').split(',');
        next.billingProviderAddress = parts[0]?.trim() || '';
        if (parts.length > 2) {
            next.billingProviderCity = parts[1]?.trim() || '';
            const stZip = (parts[2] || '').trim().split(' ');
            next.billingProviderState = stZip[0] || '';
            next.billingProviderZip = stZip[1] || '';
          }
          next.billingProviderPhone = p.phone || '';
      } else if (type === 'facility') {
        next.facilityName = p.name || '';
        next.facilityNpi = p.npi || '';
        const parts = (p.address || '').split(',');
        next.facilityAddress = parts[0]?.trim() || '';
        if (parts.length > 1) {
            next.facilityCity = parts[1]?.trim() || '';
        }
        if (parts.length > 2) {
            const stZip = (parts[2] || '').trim().split(' ');
            next.facilityState = stZip[0] || '';
            next.facilityZip = stZip[1] || '';
        }
      }
      return next;
    });
    showToast(type + ' provider autofilled', 'info');
  };


  
  // DB Persistence State
  const { id: currentClaimId } = useParams<{ id: string }>();
  const router = useRouter();

  // Load claim when URL changes
  useEffect(() => {
    async function loadClaim() {
      if (currentClaimId && currentClaimId !== 'new') {
        try {
          const fullClaim = await getClaimById(currentClaimId);
          setForm({ ...EMPTY_FORM, ...(fullClaim.form_data || {}) });
          setLocalValidationResults([]);
          setDeepValidationResults([]);
        } catch (e: any) {
          console.error(e);
        }
      } else {
        // Clear form when navigating to /app/editor or /app/editor/new
        setForm(EMPTY_FORM);
        setLocalValidationResults([]); setDeepValidationResults([]);
      }
    }
    loadClaim();
  }, [currentClaimId]);
  const [savedClaims, setSavedClaims] = useState<SavedClaim[]>([]);
  
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistClearinghouse, setWaitlistClearinghouse] = useState('');
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
const [isSaving, setIsSaving] = useState(false);
  const [verifiedNpis, setVerifiedNpis] = useState<Record<string, NpiResult>>({});
  const [verifyingNpi, setVerifyingNpi] = useState<Record<string, boolean>>({});
  const [npiErrors, setNpiErrors] = useState<Record<string, string>>({});
  const [npiModalState, setNpiModalState] = useState<{ show: boolean, status: 'loading'|'success'|'error', title: string, message: string, data?: NpiResult }>({ show: false, status: 'loading', title: '', message: '' });
  
  const [verifiedIcds, setVerifiedIcds] = useState<Record<string, CodeResult>>({});
  const [icdErrors, setIcdErrors] = useState<Record<string, string>>({});
  
  const [verifiedCpts, setVerifiedCpts] = useState<Record<string, CodeResult>>({});
  const [cptErrors, setCptErrors] = useState<Record<string, string>>({});
  
      const [dbModalState, setDbModalState] = useState<{ show: boolean, status: 'loading'|'success'|'error', title: string, message: string, data?: CodeResult }>({ show: false, status: 'loading', title: '', message: '' });
    
    // Custom Confirm Modal for deletions
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);


  const [isValidating, setIsValidating] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

    const [exportWarning, setExportWarning] = useState<{show: boolean, type: 'PDF' | 'EDI', errorCount: number}>({show: false, type: 'PDF', errorCount: 0});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const readiness = computeReadiness(validationResults);

  // Auto-validate as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLocalValidationResults(validateClaim(form, verifiedNpis, npiErrors, verifiedIcds, icdErrors, verifiedCpts, cptErrors));
      // Auto-save
      localStorage.setItem('cms1500_autosave', JSON.stringify(form));
    }, 400);
    return () => clearTimeout(timer);
  }, [form, verifiedNpis, npiErrors, verifiedIcds, icdErrors, verifiedCpts, cptErrors]);

  const loadSavedClaims = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const claims = await getUserClaims(user.id);
      setSavedClaims(claims.slice(0, 5));
    } catch (e: any) {
      console.error('Failed to load saved claims:', e);
    }
  }, []);

  useEffect(() => {
    loadSavedClaims();
  }, [loadSavedClaims]);

  const handleSaveToCloud = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShowSignupModal(true);
        return;
      }
      
      const patientName = `${form.patientLastName || 'Unknown'}, ${form.patientFirstName || 'Patient'}`;
      const newId = await saveClaim(user.id, patientName, form, currentClaimId);
      if (newId !== currentClaimId) router.push(`/app/editor/${newId}`);
      showToast('Claim saved to cloud!', 'success');
      loadSavedClaims();
    } catch (e: any) {
      showToast(e.message || 'Failed to save claim', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  
  const handleDeleteCloudClaim = async (claimId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved claim?')) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await deleteClaim(claimId, user.id);
      if (currentClaimId === claimId) {
        router.push('/app/editor');
      }
      showToast('Claim deleted.', 'info');
      loadSavedClaims();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };


  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const set = useCallback((key: keyof ClaimForm, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const setDx = useCallback((idx: number, value: string) => {
    setForm(f => {
      const codes = [...f.diagnosisCodes];
      codes[idx] = value;
      return { ...f, diagnosisCodes: codes };
    });
  }, []);

  const setLine = useCallback((id: string, key: keyof ServiceLine, value: string) => {
    setForm(f => ({
      ...f,
      serviceLines: f.serviceLines.map(l => l.id === id ? { ...l, [key]: value } : l),
    }));
  }, []);

  const addLine = useCallback(() => {
    setForm(f => ({
      ...f,
      serviceLines: [...f.serviceLines, {
        id: crypto.randomUUID(), dateFrom: '', dateTo: '',
        placeOfService: '', emg: '', cptCode: '', modifier1: '', modifier2: '', modifier3: '', modifier4: '',
        diagnosisPointer: '', charges: '', daysUnits: '1', epsdt: '', qualId: '', renderingNpi: '', renderingOtherId: ''
      }],
    }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setForm(f => ({ ...f, serviceLines: f.serviceLines.filter(l => l.id !== id) }));
  }, []);

  const handleVerifyNpi = useCallback(async (npiStr: string, fieldId: string) => {
    if (!/^\d{10}$/.test(npiStr)) {
      setNpiModalState({ show: true, status: 'error', title: 'Invalid Format', message: 'NPI must be exactly 10 digits to verify.' });
      return;
    }
    
    setVerifyingNpi(prev => ({ ...prev, [fieldId]: true }));
    setNpiModalState({ show: true, status: 'loading', title: 'Verifying NPI', message: `Querying NPPES registry for ${npiStr}...` });

    try {
      const result = await verifyNpi(npiStr);
      setVerifiedNpis(prev => ({ ...prev, [fieldId]: result }));
      const providerName = result.type === 'individual' ? `${result.firstName} ${result.lastName}` : result.organizationName;
      setNpiModalState({ 
        show: true, 
        status: 'success', 
        title: 'NPI Verified Successfully', 
        message: 'The NPI was found in the official registry.',
        data: result
      });
    } catch (err) {
      setVerifiedNpis(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      setNpiModalState({ 
        show: true, 
        status: 'error', 
        title: 'Verification Failed', 
        message: err instanceof Error ? err.message : 'NPI verification failed. The NPI may not exist in the registry.' 
      });
    } finally {
      setVerifyingNpi(prev => ({ ...prev, [fieldId]: false }));
    }
  }, []);

  const handleVerifyDbCode = useCallback(async (code: string, type: 'ICD' | 'CPT') => {
    if (!code) return;
    setDbModalState({ show: true, status: 'loading', title: `Verifying ${type}`, message: `Checking ${code}...` });
    try {
      const result = type === 'ICD' ? await verifyIcdCode(code) : await verifyCptCode(code);
      if (type === 'ICD') { setVerifiedIcds(p => ({ ...p, [code]: result })); setIcdErrors(p => { const n = {...p}; delete n[code]; return n; }); }
      else { setVerifiedCpts(p => ({ ...p, [code]: result })); setCptErrors(p => { const n = {...p}; delete n[code]; return n; }); }
      setDbModalState({ show: true, status: 'success', title: 'Verified', message: 'Valid code.', data: result });
    } catch (err) {
      setDbModalState({ show: true, status: 'error', title: 'Failed', message: 'Not found.' });
    }
  }, []);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    showToast('Validating claim data...', 'info');

    // Deep check NPIs
    const newVerifiedNpis = { ...verifiedNpis };
    const newNpiErrors = { ...npiErrors };
    for (const key of ['referringProviderNpi', 'billingNpi'] as const) {
      const npi = form[key];
      if (npi && !newVerifiedNpis[key] && /^\d{10}$/.test(npi)) {
        try { newVerifiedNpis[key] = await verifyNpi(npi); delete newNpiErrors[key]; }
        catch (err) { newNpiErrors[key] = err instanceof Error ? err.message : 'Not found'; }
      }
    }
    setVerifiedNpis(newVerifiedNpis);
    setNpiErrors(newNpiErrors);

    // Deep check ICD codes
    const newVerifiedIcds = { ...verifiedIcds };
    const newIcdErrors = { ...icdErrors };
    for (const code of form.diagnosisCodes) {
      if (code && !newVerifiedIcds[code]) {
        try { newVerifiedIcds[code] = await verifyIcdCode(code); delete newIcdErrors[code]; }
        catch (err) { newIcdErrors[code] = 'Not found'; }
      }
    }
    setVerifiedIcds(newVerifiedIcds);
    setIcdErrors(newIcdErrors);

    // Deep check CPT codes
    const newVerifiedCpts = { ...verifiedCpts };
    const newCptErrors = { ...cptErrors };
    for (const line of form.serviceLines) {
      if (line.cptCode && !newVerifiedCpts[line.cptCode]) {
        try { newVerifiedCpts[line.cptCode] = await verifyCptCode(line.cptCode); delete newCptErrors[line.cptCode]; }
        catch (err) { newCptErrors[line.cptCode] = 'Not found'; }
      }
    }
    setVerifiedCpts(newVerifiedCpts);
    setCptErrors(newCptErrors);

    // Fetch dynamic rules from Supabase for Phase 1
    let customRules;
    if (form.payerId) {
      customRules = await getPayerRules(form.payerId) || undefined;
    }

    // Re-run the main sync validator with updated DB results
    const localResults = validateClaim(form, newVerifiedNpis, newNpiErrors, newVerifiedIcds, newIcdErrors, newVerifiedCpts, newCptErrors, customRules);
    
    // Phase 2: Call the Clearinghouse Pre-Scrub API
    showToast('Connecting to Clearinghouse API...', 'info');
    const chResults = await preScrubClaim(form);

    // Phase 4: Advanced Clinical Rules & NCCI Edits
    showToast('Running Advanced Clinical Rules...', 'info');
    const advancedResults = await runAdvancedClinicalValidation(form);

    setLocalValidationResults(localResults);
    setDeepValidationResults([...chResults, ...advancedResults]);

    setIsValidating(false);
    setHasValidated(true);
    showToast('Validation complete', 'success');
  }, [form, verifiedNpis, npiErrors, verifiedIcds, icdErrors, verifiedCpts, cptErrors, showToast]);

  
    const doExportPdf = async () => {
      try {
        const response = await fetch('/cms1500_template.pdf');
        if (!response.ok) throw new Error('Template not found');
        const arrayBuffer = await response.arrayBuffer();
        const pdfBytes = await exportToPdf(form, arrayBuffer);
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claim_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('PDF exported!', 'success');
        logActivity('export_pdf');
      } catch (e) {
        showToast('Error exporting PDF', 'error');
      }
    };

    const doExportEdi = () => {
      const ediContent = generate837P(form);
      const blob = new Blob([ediContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim_${Date.now()}.edi`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('EDI 837P exported!', 'success');
    };

    
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWaitlist(true);
    try {
      const { error: waitlistError } = await supabase.from('clearinghouse_waitlist').insert([{
        email: waitlistEmail,
        clearinghouse: waitlistClearinghouse
      }]);
      setWaitlistSuccess(true);
      logActivity('join_waitlist', { clearinghouse: waitlistClearinghouse });
    } catch(err) {
      console.error(err);
      showToast('Error joining waitlist', 'error');
    }
    setIsSubmittingWaitlist(false);
  };
const handleExportClick = async (type: 'PDF' | 'EDI') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setShowSignupModal(true);
      return;
    }
    const errors = validationResults.filter(r => r.status === 'error' || r.status === 'critical');
    if (errors.length > 0) {
      setExportWarning({ show: true, type, errorCount: errors.length });
    } else {
      if (type === 'PDF') doExportPdf();
      else doExportEdi();
    }
  };
  
    const loadSample = useCallback(() => {
    setForm(SAMPLE_CLAIM);
    setLocalValidationResults([]);
    setDeepValidationResults([]);
    setHasValidated(false);
  }, []);

  const handleAutoFill = useCallback(() => {
    setShowAiModal(true);
  }, []);

  const handleAiExtract = useCallback(async (text: string, base64Pdf?: string) => {
    setIsAutofilling(true);
    try {
      const extracted = await extractClaimFromText(text, base64Pdf);
      // Merge extracted data into form, preserving structure
      setForm(prev => {
        const diagnosisCodes = Array.isArray(extracted.diagnosisCodes)
          ? [...(extracted.diagnosisCodes as string[]), ...Array(12).fill('')].slice(0, 12)
          : prev.diagnosisCodes;

        const serviceLines = Array.isArray(extracted.serviceLines) && (extracted.serviceLines as unknown[]).length > 0
          ? (extracted.serviceLines as Record<string, string>[]).map(sl => ({
              id: crypto.randomUUID(),
              dateFrom: sl.dateFrom || '',
              dateTo: sl.dateTo || '',
              placeOfService: sl.placeOfService || '11',
              emg: '',
              cptCode: sl.cptCode || '',
              modifier1: sl.modifier1 || '',
              modifier2: '',
              modifier3: '',
              modifier4: '',
              diagnosisPointer: sl.diagnosisPointer || 'A',
              charges: sl.charges || '',
              daysUnits: sl.daysUnits || '1',
              epsdt: '',
              qualId: '',
              renderingNpi: '',
              renderingOtherId: '',
            }))
          : prev.serviceLines;

        // Build the merged form — keep existing values where AI returned empty string
        const merged: ClaimForm = { ...prev };
        const stringFields: (keyof ClaimForm)[] = [
          // Carrier / Payer
          'payerName','payerAddress','payerCity','payerState','payerZip','payerId',
          // Patient
          'patientLastName','patientFirstName','patientMI','patientDob','patientSex',
          'patientAddress','patientCity','patientState','patientZip','patientPhone',
          // Insurance / Insured
          'insuranceType','insurerId',
          'insuredLastName','insuredFirstName','insuredMI',
          'insuredAddress','insuredCity','insuredState','insuredZip','insuredPhone',
          'insuredDobBox11','insuredSexBox11','patientRelationship',
          'insuredPolicyGroup','insuredPolicyName','anotherPlan',
          // Signatures
          'patientSignature','patientSignatureDate','insuredSignature',
          'physicianSignature','signatureDate',
          // Clinical
          'dateCurrentIllnessFrom','dateCurrentIllnessQual','otherDate','otherDateQual',
          'unableToWorkFrom','unableToWorkTo','hospitalizationFrom','hospitalizationTo',
          // Providers
          'referringProviderName','referringProviderNpi',
          'referringProviderQual','referringProviderOtherIdQual','referringProviderOtherId',
          // Conditions / Notes
          'conditionEmployment','conditionAuto','conditionAutoState','conditionOther',
          'additionalClaimInfo','outsideLab','outsideLabCharges','icdIndicator',
          // Billing admin
          'resubmissionCode','originalRefNum','priorAuthNumber',
          'federalTaxId','taxIdType','patientAccountNo','acceptAssignment',
          'totalCharge','amountPaid',
          // Facility (Box 32)
          'facilityName','facilityAddress','facilityCity','facilityState','facilityZip',
          'facilityNpi','facilityOtherId',
          // Billing Provider (Box 33)
          'billingProviderName','billingProviderAddress','billingProviderCity',
          'billingProviderState','billingProviderZip','billingProviderPhone',
          'billingNpi','billingProviderOtherIdQual','billingProviderOtherId','taxonomyCode',
        ];
        for (const k of stringFields) {
          const val = extracted[k];
          if (typeof val === 'string' && val.trim() !== '') {
            (merged as any)[k] = val;
          }
        }
        merged.diagnosisCodes = diagnosisCodes;
        merged.serviceLines = serviceLines;
        return merged;
      });
      setLocalValidationResults([]); setDeepValidationResults([]);
      setShowAiModal(false);
      showToast('AI extracted data successfully! Review the filled fields.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI extraction failed.', 'error');
    } finally {
      setIsAutofilling(false);
    }
  }, [showToast]);

  const handleImportPdf = useCallback(async (file: File) => {
    try {
      showToast('Importing PDF...', 'info');
      // Attempt standard CMS-1500 fillable form import
      const importedForm = await importFromPdf(file);
      setForm(importedForm);
      setLocalValidationResults([]); setDeepValidationResults([]);
      showToast('Form imported successfully', 'success');
    } catch (err) {
            // If it fails (e.g. flat PDF, scanned note), fallback to AI vision extraction
      try {
        showToast('Standard import failed. Attempting AI vision extraction...', 'info');
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Pdf = btoa(binaryString);
        await handleAiExtract('', base64Pdf);
      } catch (aiErr) {
        setShowInvalidTemplateModal(true);
      }
    }
  }, [showToast, handleAiExtract]);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type === 'application/pdf') {
      handleImportPdf(file);
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) handleAiExtract(text, undefined);
      };
      reader.readAsText(file);
    } else {
      showToast('Please upload a valid PDF or .txt file', 'error');
    }
  }, [handleImportPdf, handleAiExtract, showToast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleClear = useCallback(() => {
    setForm(EMPTY_FORM);
    setLocalValidationResults([]);
    setDeepValidationResults([]);
    router.push('/app/editor');
    localStorage.removeItem('cms1500_autosave');
    showToast('Form cleared', 'info');
  }, [showToast]);

  // Sidebar checklist items
  const sidebarChecks = [
    { label: 'Insurance & Patient Info', fields: ['insuranceType','insurerId','patientLastName','patientDob'] },
    { label: 'Insured Details',          fields: ['insuredLastName','insuredPolicyGroup'] },
    { label: 'Signatures (12/13)',        fields: ['patientSignature','insuredSignature'] },
    { label: 'Illness Dates (14)',        fields: ['dateCurrentIllnessFrom'] },
    { label: 'Diagnosis Codes (21)',      fields: ['diagnosisCodes'] },
    { label: 'Service Lines (24)',        fields: ['serviceLines'] },
    { label: 'Tax ID (25)',              fields: ['federalTaxId'] },
    { label: 'Billing Provider (33)',    fields: ['billingNpi','billingProviderName'] },
  ];

  const getCheckStatus = (fieldNames: string[]) => {
    if (fieldNames.includes('diagnosisCodes')) {
      return form.diagnosisCodes.some(d => d.trim()) ? 'done' : 'pending';
    }
    if (fieldNames.includes('serviceLines')) {
      return form.serviceLines.every(l => l.cptCode && l.dateFrom) ? 'done' : 'pending';
    }
    const allOk = fieldNames.every(f => {
      const val = form[f as keyof ClaimForm];
      return typeof val === 'string' ? !!val : true;
    });
    return allOk ? 'done' : 'pending';
  };

  // Compute total charges
  const totalCalc = form.serviceLines.reduce((sum, l) => sum + (parseFloat(l.charges) || 0), 0);

  const inputClass = (field: string) => {
    if (!validationResults.length) return 'form-input';
    const r = validationResults.find(v => v.field === field);
    if (!r) return 'form-input';
    return `form-input ${r.status === 'ok' ? 'valid' : r.status === 'error' ? 'invalid' : ''}`;
  };

  const completedSections = sidebarChecks.filter(item => getCheckStatus(item.fields) === 'done').length;
  const completionPct = Math.round((completedSections / sidebarChecks.length) * 100);

  // If they have loaded a saved claim OR started a 'new' claim, we always want to show the form, even if it happens to be empty.
  const isFormEmpty = !currentClaimId && !form.patientLastName && !form.billingProviderName && 
    !(form.diagnosisCodes || []).some(c => c) && (!(form.serviceLines || [])[0] || !form.serviceLines[0].cptCode);

  return (
    <div className="app-shell">
      {/* Hidden file input for uploads */}
      <input 
        type="file" 
        accept="application/pdf, text/plain" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
      />

      <main onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div className={`main-content ${isFormEmpty ? 'welcome-mode' : ''}`}>
          <div className="form-column">

            {/* =========================================== */}
            {/* WELCOME DASHBOARD (shown when form is empty) */}
            {/* =========================================== */}
            {isFormEmpty ? (
            <div className="welcome-dashboard">

              {/* --- Top: Dropzone --- */}
              <div
                className={`welcome-dropzone ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="welcome-dropzone-icon">
                  {isDragging ? '📂' : '☁️'}
                </div>
                <div className="welcome-dropzone-title">
                  {isDragging ? 'Release to upload' : 'Drop your file here'}
                </div>
                <div className="welcome-dropzone-sub">
                  Supports CMS-1500 PDF forms and plain-text clinical notes (.txt)
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1.25rem', pointerEvents: isDragging ? 'none' : 'auto' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Icon.Upload /> Upload & Autofill with AI
                </button>
              </div>

              {/* --- Middle: Divider or Start Blank --- */}
              <div className="welcome-divider">
                <span>or</span>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '12px 32px', fontSize: '1rem' }}
                  onClick={(e) => { e.stopPropagation(); loadSample(); }}
                >
                  <Icon.Play /> Try Sample Claim
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '12px 32px', fontSize: '1rem', marginLeft: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Start a blank claim by setting a dummy currentClaimId trigger
                    router.push('/app/editor/new');
                  }}
                >
                  📝 Start Blank Claim
                </button>
              </div>

              {/* --- Bottom: 3-Step Visual Flow --- */}
              <div className="welcome-steps">
                <div className="welcome-step">
                  <div className="welcome-step-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                    <Icon.Document />
                  </div>
                  <div className="welcome-step-num">Step 1</div>
                  <div className="welcome-step-title">Upload Your Note</div>
                  <div className="welcome-step-desc">Drop any PDF, scanned form, or clinical .txt note</div>
                </div>
                <div className="welcome-step-arrow">→</div>
                <div className="welcome-step">
                  <div className="welcome-step-icon" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                    <Icon.Sparkles />
                  </div>
                  <div className="welcome-step-num">Step 2</div>
                  <div className="welcome-step-title">AI Extracts & Maps</div>
                  <div className="welcome-step-desc">ICD-10, CPT, NPI & patient data — auto-filled instantly</div>
                </div>
                <div className="welcome-step-arrow">→</div>
                <div className="welcome-step">
                  <div className="welcome-step-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <Icon.Check />
                  </div>
                  <div className="welcome-step-num">Step 3</div>
                  <div className="welcome-step-title">Validate & Export</div>
                  <div className="welcome-step-desc">Get a 100% Readiness Score, then export EDI 837P</div>
                </div>
              </div>

            </div>
            ) : null}

            {/* ──────────────────────────────────────────── */}
            {/* CONDITIONAL RENDER: Only show form if not empty */}
            {/* ──────────────────────────────────────────── */}
            {!isFormEmpty && (
              <>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION A — Carrier / Payer */}
            {/* ──────────────────────────────────────────── */}
            <Section num="A" title="Carrier / Payer" defaultOpen={true}>
              <div className="grid-2">
                <Field label="Payer Name" boxNum="Carrier">
                  <input id="field-payer-name" className={inputClass('insurerId')} placeholder="Select or type payer…" value={form.payerName}
                    onChange={e => set('payerName', e.target.value)} />
                </Field>
                <Field label="Payer ID" required boxNum="Carrier">
                  <input id="field-payer-id" className={inputClass('payerId')} placeholder="e.g. 87726" value={form.payerId}
                    onChange={e => set('payerId', e.target.value)} />
                </Field>
              </div>
              <Field label="Payer Address (Windows Envelope)">
                <input id="field-payer-address" className="form-input" placeholder="Address" value={form.payerAddress}
                  onChange={e => set('payerAddress', e.target.value)} />
              </Field>
              <div className="grid-4">
                <div className="col-span-2">
                  <Field label="City">
                    <input id="field-payer-city" className="form-input" value={form.payerCity}
                      onChange={e => set('payerCity', e.target.value)} placeholder="City" />
                  </Field>
                </div>
                <Field label="ST">
                  <input id="field-payer-state" className="form-input" maxLength={2} value={form.payerState}
                    onChange={e => set('payerState', e.target.value.toUpperCase())} placeholder="IL" />
                </Field>
                <Field label="Zip">
                  <input id="field-payer-zip" className="form-input" maxLength={10} value={form.payerZip}
                    onChange={e => set('payerZip', e.target.value)} placeholder="00000" />
                </Field>
              </div>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 1 — Patient & Insured Information */}
            {/* ──────────────────────────────────────────── */}
            <Section num="1" title="Patient & Insured Information" defaultOpen={true}>
              {/* Box 1 — Insurance type */}
              <Field label="Type of Insurance" required boxNum="1" helpSlug="what-is-the-patient-portion-of-the-cms-1500-what-info-does-it-require">
                <div className="radio-group">
                  {['Medicare','Medicaid','Tricare','FECA','Group','Other'].map(t => (
                    <label key={t} className="radio-label">
                      <input type="radio" name="insuranceType" value={t}
                        checked={form.insuranceType === t}
                        onChange={() => set('insuranceType', t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </Field>

              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Autofill from Address Book</label>
                <Select 
                  placeholder="Type to search saved patients..."
                  isClearable
                  options={patients.map(p => ({
                    value: p.id,
                    label: `${p.last_name}, ${p.first_name} (DOB: ${p.dob || 'N/A'})`
                  }))}
                  onChange={(selected: any) => autofillPatient(selected?.value || '')}
                  styles={{ 
                    control: (base) => ({ ...base, background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }), 
                    menu: (base) => ({ ...base, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }), 
                    option: (base, state) => ({...base, background: state.isFocused ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }),
                    singleValue: (base) => ({...base, color: 'var(--text-primary)'}),
                    input: (base) => ({...base, color: 'var(--text-primary)'})
                  }}
                />
              </div>
              
              {/* Box 1a */}
              <Field label="Insured's ID Number" required boxNum="1a">
                <input id="field-insured-id" className={inputClass('insurerId')} placeholder="Policy / Medicare / Medicaid ID"
                  value={form.insurerId} onChange={e => set('insurerId', e.target.value)} />
              </Field>

              <div className="grid-3">
                {/* Box 2 */}
                <Field label="Patient Last Name" required boxNum="2">
                  <input id="field-patient-last" className={inputClass('patientLastName')} placeholder="Doe"
                    value={form.patientLastName} onChange={e => set('patientLastName', e.target.value)} />
                </Field>
                <Field label="First Name" boxNum="2">
                  <input id="field-patient-first" className="form-input" placeholder="John"
                    value={form.patientFirstName} onChange={e => set('patientFirstName', e.target.value)} />
                </Field>
                <Field label="MI" boxNum="2">
                  <input id="field-patient-mi" className="form-input" maxLength={1} placeholder="A"
                    value={form.patientMI} onChange={e => set('patientMI', e.target.value)} />
                </Field>
              </div>

              {/* Box 3 */}
              <div className="grid-2">
                <Field label="Patient Date of Birth (MM/DD/YYYY)" required boxNum="3">
                  <input id="field-patient-dob" className={inputClass('patientDob')} placeholder="mm/dd/yyyy"
                    value={form.patientDob} onChange={e => set('patientDob', e.target.value)} />
                </Field>
                <Field label="Sex" required boxNum="3">
                  <div className="radio-group" style={{ marginTop: 8 }}>
                    {['M','F'].map(s => (
                      <label key={s} className="radio-label">
                        <input type="radio" name="patientSex" value={s}
                          checked={form.patientSex === s}
                          onChange={() => set('patientSex', s)} />
                        {s === 'M' ? 'Male' : 'Female'}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>

              {/* Box 4 — Insured name */}
              <div className="grid-3">
                <Field label="Insured Last Name" required boxNum="4">
                  <input id="field-insured-last" className={inputClass('insuredLastName')} placeholder="Doe"
                    value={form.insuredLastName} onChange={e => set('insuredLastName', e.target.value)} />
                </Field>
                <Field label="First Name" boxNum="4">
                  <input id="field-insured-first" className="form-input" placeholder="John"
                    value={form.insuredFirstName} onChange={e => set('insuredFirstName', e.target.value)} />
                </Field>
                <Field label="MI" boxNum="4">
                  <input id="field-insured-mi" className="form-input" maxLength={1} placeholder="A"
                    value={form.insuredMI} onChange={e => set('insuredMI', e.target.value)} />
                </Field>
              </div>

              {/* Box 5 — Patient address */}
              <Field label="Patient Address (No., Street)" required boxNum="5">
                <input id="field-patient-address" className={inputClass('patientAddress')} placeholder="123 Main St"
                  value={form.patientAddress} onChange={e => set('patientAddress', e.target.value)} />
              </Field>
              <div className="grid-4">
                <div className="col-span-2">
                  <Field label="City" boxNum="5">
                    <input id="field-patient-city" className="form-input" placeholder="Springfield"
                      value={form.patientCity} onChange={e => set('patientCity', e.target.value)} />
                  </Field>
                </div>
                <Field label="ST" boxNum="5">
                  <input id="field-patient-state" className="form-input" maxLength={2} placeholder="IL"
                    value={form.patientState} onChange={e => set('patientState', e.target.value.toUpperCase())} />
                </Field>
                <Field label="ZIP" required boxNum="5">
                  <input id="field-patient-zip" className={inputClass('patientZip')} placeholder="62701" maxLength={10}
                    value={form.patientZip} onChange={e => set('patientZip', e.target.value)} />
                </Field>
              </div>
              <Field label="Telephone (Include Area Code)" boxNum="5">
                <input id="field-patient-phone" className="form-input" placeholder="(217) 555-1234"
                  value={form.patientPhone} onChange={e => set('patientPhone', e.target.value)} />
              </Field>

              {/* Box 6 */}
              <Field label="Patient Relationship to Insured" required boxNum="6">
                <div className="radio-group">
                  {['Self','Spouse','Child','Other'].map(r => (
                    <label key={r} className="radio-label">
                      <input type="radio" name="patientRelationship" value={r}
                        checked={form.patientRelationship === r}
                        onChange={() => set('patientRelationship', r)} />
                      {r}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Box 7 — Insured address */}
              <Field label="Insured Address" boxNum="7">
                <input id="field-insured-address" className="form-input" placeholder="123 Main St"
                  value={form.insuredAddress} onChange={e => set('insuredAddress', e.target.value)} />
              </Field>
              <div className="grid-4">
                <div className="col-span-2">
                  <Field label="City" boxNum="7">
                    <input id="field-insured-city" className="form-input" value={form.insuredCity}
                      onChange={e => set('insuredCity', e.target.value)} placeholder="Springfield" />
                  </Field>
                </div>
                <Field label="ST"><input id="field-insured-state" className="form-input" maxLength={2}
                  value={form.insuredState} onChange={e => set('insuredState', e.target.value.toUpperCase())} placeholder="IL" /></Field>
                <Field label="ZIP"><input id="field-insured-zip" className="form-input" maxLength={10}
                  value={form.insuredZip} onChange={e => set('insuredZip', e.target.value)} placeholder="62701" /></Field>
              </div>
              <Field label="Telephone (Include Area Code)" boxNum="7">
                <input id="field-insured-phone" className="form-input" placeholder="(217) 555-1234"
                  value={form.insuredPhone} onChange={e => set('insuredPhone', e.target.value)} />
              </Field>

              {/* Box 8 */}
              <Field label="Reserved for NUCC Use" boxNum="8">
                <input id="field-reserved-nucc" className="form-input" placeholder="Reserved"
                  value={form.reservedNucc} onChange={e => set('reservedNucc', e.target.value)} />
              </Field>

              {/* Box 9 */}
              <Field label="Other Insured's Name" boxNum="9">
                <input id="field-other-insured-name" className="form-input" placeholder="Last Name, First Name, MI"
                  value={form.otherInsuredName} onChange={e => set('otherInsuredName', e.target.value)} />
              </Field>
              <div className="grid-2">
                <Field label="Other Insured's Policy or Group Number" boxNum="9a">
                  <input id="field-other-insured-policy" className="form-input" placeholder="Policy Number"
                    value={form.otherInsuredPolicy} onChange={e => set('otherInsuredPolicy', e.target.value)} />
                </Field>
                <Field label="Reserved for NUCC Use" boxNum="9b">
                  <input id="field-other-insured-reserved" className="form-input" placeholder="Reserved"
                    value={form.otherInsuredReserved} onChange={e => set('otherInsuredReserved', e.target.value)} />
                </Field>
                <Field label="Reserved for NUCC Use" boxNum="9c">
                  <input id="field-other-insured-reserved-2" className="form-input" placeholder="Reserved"
                    value={form.otherInsuredReserved2} onChange={e => set('otherInsuredReserved2', e.target.value)} />
                </Field>
                <Field label="Insurance Plan Name or Program Name" boxNum="9d">
                  <input id="field-other-insurance-plan" className="form-input" placeholder="Plan Name"
                    value={form.otherInsurancePlan} onChange={e => set('otherInsurancePlan', e.target.value)} />
                </Field>
              </div>

              {/* Box 10 — Condition related to */}
              <div className="grid-3">
                <Field label="Employment?" boxNum="10a">
                  <div className="radio-group">
                    {['Yes','No'].map(v => <label key={v} className="radio-label">
                      <input type="radio" name="condEmp" value={v} checked={form.conditionEmployment === v}
                        onChange={() => set('conditionEmployment', v)} />{v}
                    </label>)}
                  </div>
                </Field>
                <Field label="Auto Accident?" boxNum="10b">
                  <div className="radio-group">
                    {['Yes','No'].map(v => <label key={v} className="radio-label">
                      <input type="radio" name="condAuto" value={v} checked={form.conditionAuto === v}
                        onChange={() => set('conditionAuto', v)} />{v}
                    </label>)}
                  </div>
                </Field>
                <Field label="Other Accident?" boxNum="10c">
                  <div className="radio-group">
                    {['Yes','No'].map(v => <label key={v} className="radio-label">
                      <input type="radio" name="condOther" value={v} checked={form.conditionOther === v}
                        onChange={() => set('conditionOther', v)} />{v}
                    </label>)}
                  </div>
                </Field>
              </div>
              <div className="grid-2">
                <Field label="Auto Accident State" boxNum="10b">
                  <input className="form-input" placeholder="e.g. TX"
                    value={form.conditionAutoState} onChange={e => set('conditionAutoState', e.target.value)} />
                </Field>
                <Field label="Claim Codes (Designated by NUCC)" boxNum="10d">
                  <input className="form-input" placeholder="e.g. 10.d"
                    value={form.claimCodes} onChange={e => set('claimCodes', e.target.value)} />
                </Field>
              </div>
              {/* Box 11 */}
              <Field label="Insured's Policy, Group or FECA Number" required boxNum="11" helpSlug="cms-1500-box-11-insureds-policy-group-or-feca-number">
                <input id="field-insured-group" className={inputClass('insuredPolicyGroup')} placeholder="GRP001"
                  value={form.insuredPolicyGroup} onChange={e => set('insuredPolicyGroup', e.target.value)} />
              </Field>
              <div className="grid-2">
                <Field label="Insured DOB" boxNum="11a">
                  <input id="field-insured-dob" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.insuredDobBox11} onChange={e => set('insuredDobBox11', e.target.value)} />
                </Field>
                <Field label="Sex" boxNum="11a">
                  <div className="radio-group" style={{ marginTop: 8 }}>
                    {['M','F'].map(s => <label key={s} className="radio-label">
                      <input type="radio" name="insuredSex11" value={s} checked={form.insuredSexBox11 === s}
                        onChange={() => set('insuredSexBox11', s)} />{s === 'M' ? 'Male' : 'Female'}
                    </label>)}
                  </div>
                </Field>
              </div>
              <div className="grid-2">
                <Field label="Other Claim ID" boxNum="11b">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="form-input" placeholder="Qual" style={{ width: '60px', textAlign: 'center' }}
                      value={form.otherClaimIdQual} onChange={e => set('otherClaimIdQual', e.target.value)} />
                    <input id="field-other-claim-id" className="form-input" placeholder="Other Claim ID" style={{ flex: 1 }}
                      value={form.otherClaimId} onChange={e => set('otherClaimId', e.target.value)} />
                  </div>
                </Field>
                <Field label="Insurance Plan Name" boxNum="11c">
                  <input id="field-insured-plan" className="form-input" placeholder="Plan Name"
                    value={form.insuredPolicyName} onChange={e => set('insuredPolicyName', e.target.value)} />
                </Field>
              </div>
              <Field label="Another Health Plan?" boxNum="11d">
                <div className="radio-group">
                  {['Yes','No'].map(v => <label key={v} className="radio-label">
                    <input type="radio" name="anotherPlan" value={v} checked={form.anotherPlan === v}
                      onChange={() => set('anotherPlan', v)} />{v}
                  </label>)}
                </div>
              </Field>

              {/* Box 12 / 13 */}
              <div className="grid-2">
                <Field label="Patient/Authorized Signature" required boxNum="12">
                  <input id="field-patient-sig" className={inputClass('patientSignature')} placeholder="Signature on File"
                    value={form.patientSignature} onChange={e => set('patientSignature', e.target.value)} />
                  <div style={{ marginTop: 6 }}>
                    <input id="field-patient-sig-date" className="form-input" placeholder="mm/dd/yyyy"
                      value={form.patientSignatureDate} onChange={e => set('patientSignatureDate', e.target.value)} />
                  </div>
                </Field>
                <Field label="Insured's Signature" required boxNum="13">
                  <input id="field-insured-sig" className={inputClass('insuredSignature')} placeholder="Signature on File"
                    value={form.insuredSignature} onChange={e => set('insuredSignature', e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 2 — Physician / Supplier Info */}
            {/* ──────────────────────────────────────────── */}
            <Section num="2" title="Physician or Supplier Information">
              {/* Box 14 */}
              <div className="grid-2">
                <Field label="Date of Current Illness / Injury (MM/DD/YYYY)" required boxNum="14">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="form-input" style={{ width: 100 }}
                      value={form.dateCurrentIllnessQual} onChange={e => set('dateCurrentIllnessQual', e.target.value)}>
                      <option value="">Qual</option>
                      <option value="431">431 Onset of Illness</option>
                      <option value="484">484 Last Menstrual Period</option>
                    </select>
                    <input id="field-illness-from" className={inputClass('dateCurrentIllnessFrom')} placeholder="mm/dd/yyyy" style={{ flex: 1 }}
                      value={form.dateCurrentIllnessFrom} onChange={e => set('dateCurrentIllnessFrom', e.target.value)} />
                  </div>
                </Field>
                <Field label="Other Date" boxNum="15">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select id="field-other-date-qual" className="form-select" style={{ width: 80 }}
                      value={form.otherDateQual} onChange={e => set('otherDateQual', e.target.value)}>
                      <option value="">Qual</option>
                      <option value="454">454</option>
                      <option value="304">304</option>
                      <option value="453">453</option>
                    </select>
                    <input id="field-other-date" className="form-input" placeholder="mm/dd/yyyy"
                      value={form.otherDate} onChange={e => set('otherDate', e.target.value)} />
                  </div>
                </Field>
              </div>

              {/* Box 16 — Unable to work */}
              <div className="grid-2">
                <Field label="Dates Unable to Work — From" boxNum="16">
                  <input id="field-unable-from" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.unableToWorkFrom} onChange={e => set('unableToWorkFrom', e.target.value)} />
                </Field>
                <Field label="To" boxNum="16">
                  <input id="field-unable-to" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.unableToWorkTo} onChange={e => set('unableToWorkTo', e.target.value)} />
                </Field>
              </div>

              {/* Box 17 */}
              <Field label="Name of Referring Provider or Other Source" boxNum="17" helpSlug="who-is-referring-physician-and-ordering-physician-box-17">
                <div style={{ display: 'flex', gap: 8 }}>
                  <select id="field-ref-qual" className="form-select" style={{ width: 80 }}
                    value={form.referringProviderQual} onChange={e => set('referringProviderQual', e.target.value)}>
                    <option value="">Qual</option>
                    <option value="DN">DN</option>
                    <option value="DK">DK</option>
                    <option value="DQ">DQ</option>
                  </select>
                  <input id="field-ref-name" className="form-input" placeholder="Last, First MI"
                    value={form.referringProviderName} onChange={e => set('referringProviderName', e.target.value)} />
                </div>
              </Field>
              <div className="grid-2">
                <Field label="Other ID" boxNum="17a">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select id="field-ref-other-qual" className="form-select" style={{ width: 80 }}
                      value={form.referringProviderOtherIdQual} onChange={e => set('referringProviderOtherIdQual', e.target.value)}>
                      <option value="">Qual</option>
                      <option value="0B">0B</option>
                      <option value="1G">1G</option>
                      <option value="G2">G2</option>
                      <option value="LU">LU</option>
                      <option value="DQ">DQ</option>
                    </select>
                    <input id="field-ref-other-id" className="form-input" placeholder="Other ID"
                      value={form.referringProviderOtherId} onChange={e => set('referringProviderOtherId', e.target.value)} />
                  </div>
                </Field>
                <Field label="Referring NPI" boxNum="17b">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="field-ref-npi" className={inputClass('referringProviderNpi')} placeholder="1234567890" maxLength={10}
                      value={form.referringProviderNpi} onChange={e => set('referringProviderNpi', e.target.value)} />
                    <button className="btn btn-secondary btn-sm" onClick={() => handleVerifyNpi(form.referringProviderNpi, 'referringProviderNpi')} disabled={verifyingNpi.referringProviderNpi}>
                      {verifyingNpi.referringProviderNpi ? '...' : 'Verify'}
                    </button>
                  </div>
                  {verifiedNpis.referringProviderNpi && (
                    <div style={{ fontSize: '0.8rem', color: '#00d2ff', marginTop: 4 }}>
                      ✓ {verifiedNpis.referringProviderNpi.type === 'individual' ? `${verifiedNpis.referringProviderNpi.firstName} ${verifiedNpis.referringProviderNpi.lastName}` : verifiedNpis.referringProviderNpi.organizationName}
                      {verifiedNpis.referringProviderNpi.primaryTaxonomy && ` - ${verifiedNpis.referringProviderNpi.primaryTaxonomy}`}
                    </div>
                  )}
            {savedClaims.length > 0 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Link href="/app" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                  View All Claims →
                </Link>
              </div>
            )}
                </Field>
              </div>

              {/* Box 18 */}
              <div className="grid-2">
                <Field label="Hospitalization Dates — From" boxNum="18">
                  <input id="field-hosp-from" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.hospitalizationFrom} onChange={e => set('hospitalizationFrom', e.target.value)} />
                </Field>
                <Field label="To" boxNum="18">
                  <input id="field-hosp-to" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.hospitalizationTo} onChange={e => set('hospitalizationTo', e.target.value)} />
                </Field>
              </div>

              {/* Box 19 / 20 */}
              <div className="grid-2">
                <Field label="Additional Claim Info / Discharge Status" boxNum="19" helpSlug="cms-1500-box-19-a-crucial-section-for-local-use">
                  <textarea id="field-additional-info" className="form-textarea" placeholder="Additional info…"
                    value={form.additionalClaimInfo} onChange={e => set('additionalClaimInfo', e.target.value)} rows={2} />
                </Field>
                <Field label="Outside Lab?" boxNum="20">
                  <div className="radio-group" style={{ marginTop: 8 }}>
                    {['Yes','No'].map(v => <label key={v} className="radio-label">
                      <input type="radio" name="outsideLab" value={v} checked={form.outsideLab === v}
                        onChange={() => set('outsideLab', v)} />{v}
                    </label>)}
                  </div>
                  {form.outsideLab === 'Yes' && (
                    <input id="field-lab-charges" className="form-input" placeholder="$0.00" style={{ marginTop: 8 }}
                      value={form.outsideLabCharges} onChange={e => set('outsideLabCharges', e.target.value)} />
                  )}
                </Field>
              </div>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 3 — Diagnosis Codes (21) */}
            {/* ──────────────────────────────────────────── */}
            <Section num="21" title="Diagnosis Codes (ICD-10)">
              <Field label="ICD Indicator" boxNum="21" helpSlug="cms-1500-box-21-diagnosis-codes-filling-instruction">
                <div className="radio-group">
                  {['ICD-9','ICD-10'].map(v => <label key={v} className="radio-label">
                    <input type="radio" name="icdInd" value={v} checked={form.icdIndicator === v}
                      onChange={() => set('icdIndicator', v)} />{v}
                  </label>)}
                </div>
              </Field>
              <div className="dx-grid">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="dx-cell">
                    <div className="dx-label">{String.fromCharCode(65 + i)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          id={`field-dx-${String.fromCharCode(65+i)}`}
                          className="form-input"
                          placeholder="e.g. E11.9"
                          value={form.diagnosisCodes[i]}
                          onChange={e => setDx(i, e.target.value.toUpperCase())}
                          style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', flex: 1 }}
                        />
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleVerifyDbCode(form.diagnosisCodes[i], 'ICD')}
                          disabled={!form.diagnosisCodes[i]}
                          style={{ padding: '0 8px' }}
                        >
                          Verify
                        </button>
                      </div>
                      {verifiedIcds[form.diagnosisCodes[i]] && (
                        <div style={{ fontSize: '0.75rem', color: '#00d2ff', lineHeight: 1.1 }}>
                          ✓ {verifiedIcds[form.diagnosisCodes[i]].short_description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Box 22 / 23 */}
              <div className="grid-2">
                <Field label="Resubmission Code" boxNum="22" helpSlug="box-22-medicaid-resubmission-status-how-to-use">
                  <input id="field-resub-code" className="form-input" placeholder="Code"
                    value={form.resubmissionCode} onChange={e => set('resubmissionCode', e.target.value)} />
                </Field>
                <Field label="Prior Authorization Number" boxNum="23" helpSlug="box-23-cms-1500-when-to-use-authorization-or-clia-or-zip-code-on">
                  <input id="field-prior-auth" className="form-input" placeholder="Authorization number"
                    value={form.priorAuthNumber} onChange={e => set('priorAuthNumber', e.target.value)} />
                </Field>
              </div>
              <Field label="Original Ref. No." boxNum="22">
                <input id="field-orig-ref" className="form-input" placeholder="Original reference"
                  value={form.originalRefNum} onChange={e => set('originalRefNum', e.target.value)} />
              </Field>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 4 — Service Lines (24) */}
            {/* ──────────────────────────────────────────── */}
            <Section num="24" title="Service Lines">
              <div style={{ overflowX: 'auto' }}>
                <table className="service-table">
                  <thead>
                    <tr>
                      <th>A. Dates of Service</th>
                      <th>B. POS</th>
                      <th>C. EMG</th>
                      <th>D. CPT/HCPCS · Modifiers</th>
                      <th>E. Dx Ptr</th>
                      <th>F. Charges</th>
                      <th>G. Units</th>
                      <th>H. EPSDT</th>
                      <th>I. Qual</th>
                      <th>J. Other ID</th>
                      <th>J. Rendering NPI</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.serviceLines.map((line, i) => (
                      <tr key={line.id}>
                        <td style={{ minWidth: 200 }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input id={`field-svc-from-${i}`} type="text" placeholder="mm/dd/yy"
                              value={line.dateFrom} onChange={e => setLine(line.id, 'dateFrom', e.target.value)} style={{ width: 85 }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>to</span>
                            <input id={`field-svc-to-${i}`} type="text" placeholder="mm/dd/yy"
                              value={line.dateTo} onChange={e => setLine(line.id, 'dateTo', e.target.value)} style={{ width: 85 }} />
                          </div>
                        </td>
                        <td style={{ minWidth: 50 }}>
                          <input id={`field-svc-pos-${i}`} type="text" placeholder="11" maxLength={2}
                            value={line.placeOfService} onChange={e => setLine(line.id, 'placeOfService', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 40 }}>
                          <input id={`field-svc-emg-${i}`} type="text" maxLength={1}
                            value={line.emg} onChange={e => setLine(line.id, 'emg', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input id={`field-svc-cpt-${i}`} type="text" placeholder="CPT" maxLength={5} style={{ width: 60, fontFamily: 'var(--font-mono)' }}
                                value={line.cptCode} onChange={e => setLine(line.id, 'cptCode', e.target.value)} />
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => handleVerifyDbCode(line.cptCode, 'CPT')}
                                disabled={!line.cptCode}
                                style={{ padding: '0 4px', minWidth: 'auto' }}
                                title="Verify CPT"
                              >
                                ?
                              </button>
                              <input id={`field-svc-mod1-${i}`} type="text" placeholder="M1" maxLength={2} style={{ width: 36 }}
                                value={line.modifier1} onChange={e => setLine(line.id, 'modifier1', e.target.value)} />
                              <input id={`field-svc-mod2-${i}`} type="text" placeholder="M2" maxLength={2} style={{ width: 36 }}
                                value={line.modifier2} onChange={e => setLine(line.id, 'modifier2', e.target.value)} />
                              <input id={`field-svc-mod3-${i}`} type="text" placeholder="M3" maxLength={2} style={{ width: 36 }}
                                value={line.modifier3} onChange={e => setLine(line.id, 'modifier3', e.target.value)} />
                              <input id={`field-svc-mod4-${i}`} type="text" placeholder="M4" maxLength={2} style={{ width: 36 }}
                                value={line.modifier4} onChange={e => setLine(line.id, 'modifier4', e.target.value)} />
                            </div>
                            {verifiedCpts[line.cptCode] && (
                              <div style={{ fontSize: '0.65rem', color: '#00d2ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                                ✓ {verifiedCpts[line.cptCode].short_description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ minWidth: 60 }}>
                          <input id={`field-svc-ptr-${i}`} type="text" placeholder="A" maxLength={4} style={{ fontFamily: 'var(--font-mono)' }}
                            value={line.diagnosisPointer} onChange={e => setLine(line.id, 'diagnosisPointer', e.target.value.toUpperCase())} />
                        </td>
                        <td style={{ minWidth: 80 }}>
                          <input id={`field-svc-charges-${i}`} type="text" placeholder="0.00"
                            value={line.charges} onChange={e => setLine(line.id, 'charges', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 50 }}>
                          <input id={`field-svc-units-${i}`} type="text" maxLength={3}
                            value={line.daysUnits} onChange={e => setLine(line.id, 'daysUnits', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 60 }}>
                          <input id={`field-svc-epsdt-${i}`} type="text" maxLength={2} style={{ fontFamily: 'var(--font-mono)' }}
                            value={line.epsdt} onChange={e => setLine(line.id, 'epsdt', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 60 }}>
                          <input id={`field-svc-qual-${i}`} type="text" maxLength={2} style={{ fontFamily: 'var(--font-mono)' }}
                            value={line.qualId} onChange={e => setLine(line.id, 'qualId', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input id={`field-svc-other-${i}`} type="text" placeholder="ID" style={{ fontFamily: 'var(--font-mono)' }}
                            value={line.renderingOtherId} onChange={e => setLine(line.id, 'renderingOtherId', e.target.value)} />
                        </td>
                        <td style={{ minWidth: 120 }}>
                          <input id={`field-svc-npi-${i}`} type="text" placeholder="NPI" maxLength={10} style={{ fontFamily: 'var(--font-mono)' }}
                            value={line.renderingNpi} onChange={e => setLine(line.id, 'renderingNpi', e.target.value)} />
                        </td>
                        <td>
                          {form.serviceLines.length > 1 && (
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeLine(line.id)} title="Remove line" aria-label="Remove line">
                              <Icon.Trash />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button id="btn-add-line" className="add-line-btn" onClick={addLine}>
                <Icon.Plus /> Add Line
              </button>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 5 — Billing / Tax / Totals (25-30) */}
            {/* ──────────────────────────────────────────── */}
            <Section num="25–30" title="Tax ID · Totals · Assignment" defaultOpen={false}>
              <div className="grid-3">
                <Field label="Federal Tax ID Number" required boxNum="25">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input id="field-tax-id" className={inputClass('federalTaxId')} placeholder="12-3456789"
                      value={form.federalTaxId} onChange={e => set('federalTaxId', e.target.value)} style={{ flex: 1 }} />
                    <label className="radio-label" style={{ whiteSpace: 'nowrap' }}>
                      <input type="radio" name="taxIdType" value="EIN" checked={form.taxIdType === 'EIN'} onChange={() => set('taxIdType', 'EIN')} />EIN
                    </label>
                    <label className="radio-label" style={{ whiteSpace: 'nowrap' }}>
                      <input type="radio" name="taxIdType" value="SSN" checked={form.taxIdType === 'SSN'} onChange={() => set('taxIdType', 'SSN')} />SSN
                    </label>
                  </div>
                </Field>
                <Field label="Patient Account No." boxNum="26">
                  <input id="field-acct-no" className="form-input" placeholder="ACC-001"
                    value={form.patientAccountNo} onChange={e => set('patientAccountNo', e.target.value)} />
                </Field>
                <Field label="Accept Assignment?" required boxNum="27">
                  <div className="radio-group" style={{ marginTop: 8 }}>
                    {['Yes','No'].map(v => <label key={v} className="radio-label">
                      <input type="radio" name="acceptAssign" value={v} checked={form.acceptAssignment === v}
                        onChange={() => set('acceptAssignment', v)} />{v}
                    </label>)}
                  </div>
                </Field>
              </div>

              <div className="grid-3">
                <Field label="Total Charge" required boxNum="28">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>$</span>
                    <input id="field-total-charge" className={inputClass('totalCharge')} placeholder="0.00"
                      value={form.totalCharge || totalCalc.toFixed(2)}
                      onChange={e => set('totalCharge', e.target.value)} style={{ paddingLeft: 22 }} />
                  </div>
                </Field>
                <Field label="Amount Paid" boxNum="29">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>$</span>
                    <input id="field-amount-paid" className="form-input" placeholder="0.00"
                      value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} style={{ paddingLeft: 22 }} />
                  </div>
                </Field>
                <Field label="Balance Due" boxNum="30">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>$</span>
                    <input id="field-balance-due" className="form-input" placeholder="0.00"
                      value={form.balanceDue} onChange={e => set('balanceDue', e.target.value)} style={{ paddingLeft: 22 }} />
                  </div>
                </Field>
              </div>
            </Section>

            {/* ──────────────────────────────────────────── */}
            {/* SECTION 6 — Signatures + Facility + Billing */}
            {/* ──────────────────────────────────────────── */}
            <Section num="31–33" title="Signatures · Facility · Billing Provider" defaultOpen={false}>
              {/* Box 31 */}
              <div className="grid-2">
                <Field label="Signature of Physician or Supplier" required boxNum="31">
                  <input id="field-phys-sig" className={inputClass('physicianSignature')} placeholder="Signature on File"
                    value={form.physicianSignature} onChange={e => set('physicianSignature', e.target.value)} />
                </Field>
                <Field label="Date Signed" boxNum="31">
                  <input id="field-sig-date" className="form-input" placeholder="mm/dd/yyyy"
                    value={form.signatureDate} onChange={e => set('signatureDate', e.target.value)} />
                </Field>
              </div>

              {/* Box 32 — Facility */}
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Autofill Facility from Address Book</label>
                  <Select 
                    placeholder="Type to search saved facilities..."
                    isClearable
                    options={providers.map(p => ({
                      value: p.id,
                      label: `${p.name} (NPI: ${p.npi})`
                    }))}
                    onChange={(selected: any) => autofillProvider(selected?.value || '', 'facility')}
                    styles={{ 
                      control: (base) => ({ ...base, background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }), 
                      menu: (base) => ({ ...base, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }), 
                      option: (base, state) => ({...base, background: state.isFocused ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }),
                      singleValue: (base) => ({...base, color: 'var(--text-primary)'}),
                      input: (base) => ({...base, color: 'var(--text-primary)'})
                    }}
                  />
                </div>
                <Field label="Service Facility Location" boxNum="32">
                <input id="field-facility-name" className="form-input" placeholder="Facility Name"
                  value={form.facilityName} onChange={e => set('facilityName', e.target.value)} />
                <div style={{ marginTop: 6 }}>
                  <input id="field-facility-addr" className="form-input" placeholder="Address"
                    value={form.facilityAddress} onChange={e => set('facilityAddress', e.target.value)} />
                </div>
                <div className="grid-4" style={{ marginTop: 6 }}>
                  <div className="col-span-2">
                    <input id="field-facility-city" className="form-input" placeholder="City"
                      value={form.facilityCity} onChange={e => set('facilityCity', e.target.value)} />
                  </div>
                  <input id="field-facility-state" className="form-input" maxLength={2} placeholder="ST"
                    value={form.facilityState} onChange={e => set('facilityState', e.target.value.toUpperCase())} />
                  <input id="field-facility-zip" className="form-input" maxLength={10} placeholder="ZIP"
                    value={form.facilityZip} onChange={e => set('facilityZip', e.target.value)} />
                </div>
                <div className="grid-2" style={{ marginTop: 6 }}>
                  <Field label="Facility NPI" boxNum="32a">
                    <input id="field-facility-npi" className="form-input" placeholder="NPI"
                      value={form.facilityNpi} onChange={e => set('facilityNpi', e.target.value)} />
                  </Field>
                  <Field label="Facility Other ID" boxNum="32b">
                    <input id="field-facility-other" className="form-input" placeholder="Other ID"
                      value={form.facilityOtherId} onChange={e => set('facilityOtherId', e.target.value)} />
                  </Field>
                </div>
              </Field>

              {/* Box 33 — Billing */}
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Autofill Billing Provider from Address Book</label>
                  <Select 
                    placeholder="Type to search saved providers..."
                    isClearable
                    options={providers.map(p => ({
                      value: p.id,
                      label: `${p.name} (NPI: ${p.npi})`
                    }))}
                    onChange={(selected: any) => autofillProvider(selected?.value || '', 'billing')}
                    styles={{ 
                      control: (base) => ({ ...base, background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }), 
                      menu: (base) => ({ ...base, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }), 
                      option: (base, state) => ({...base, background: state.isFocused ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }),
                      singleValue: (base) => ({...base, color: 'var(--text-primary)'}),
                      input: (base) => ({...base, color: 'var(--text-primary)'})
                    }}
                  />
                </div>
                <Field label="Billing Provider Info & Ph #" required boxNum="33">
                <div className="grid-2" style={{ gap: 8 }}>
                  <input id="field-billing-name" className={inputClass('billingProviderName')} placeholder="Provider Name"
                    value={form.billingProviderName} onChange={e => set('billingProviderName', e.target.value)} />
                  <input id="field-billing-phone" className="form-input" placeholder="Phone"
                    value={form.billingProviderPhone} onChange={e => set('billingProviderPhone', e.target.value)} />
                </div>
                <div style={{ marginTop: 6 }}>
                  <input id="field-billing-addr" className="form-input" placeholder="Address"
                    value={form.billingProviderAddress} onChange={e => set('billingProviderAddress', e.target.value)} />
                </div>
                <div className="grid-4" style={{ marginTop: 6 }}>
                  <div className="col-span-2">
                    <input id="field-billing-city" className="form-input" placeholder="City"
                      value={form.billingProviderCity} onChange={e => set('billingProviderCity', e.target.value)} />
                  </div>
                  <input id="field-billing-state" className="form-input" maxLength={2} placeholder="ST"
                    value={form.billingProviderState} onChange={e => set('billingProviderState', e.target.value.toUpperCase())} />
                  <input id="field-billing-zip" className="form-input" maxLength={10} placeholder="ZIP"
                    value={form.billingProviderZip} onChange={e => set('billingProviderZip', e.target.value)} />
                </div>
              </Field>
              <div className="grid-4">
                <Field label="Billing NPI" required boxNum="33a">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="field-billing-npi" className={inputClass('billingNpi')} placeholder="1234567890" maxLength={10}
                      style={{ fontFamily: 'var(--font-mono)' }}
                      value={form.billingNpi} onChange={e => set('billingNpi', e.target.value)} />
                    <button className="btn btn-secondary btn-sm" onClick={() => handleVerifyNpi(form.billingNpi, 'billingNpi')} disabled={verifyingNpi.billingNpi}>
                      {verifyingNpi.billingNpi ? '...' : 'Verify'}
                    </button>
                  </div>
                  {verifiedNpis.billingNpi && (
                    <div style={{ fontSize: '0.8rem', color: '#00d2ff', marginTop: 4 }}>
                      ✓ {verifiedNpis.billingNpi.type === 'individual' ? `${verifiedNpis.billingNpi.firstName} ${verifiedNpis.billingNpi.lastName}` : verifiedNpis.billingNpi.organizationName}
                      {verifiedNpis.billingNpi.primaryTaxonomy && ` - ${verifiedNpis.billingNpi.primaryTaxonomy}`}
                    </div>
                  )}
                </Field>
                <Field label="Other ID / Taxonomy" boxNum="33b">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select id="field-billing-other-qual" className="form-select" style={{ width: 100 }}
                      value={form.billingProviderOtherIdQual} onChange={e => set('billingProviderOtherIdQual', e.target.value)}>
                      <option value="">Qual</option>
                      <option value="0B">0B</option>
                      <option value="1G">1G</option>
                      <option value="G2">G2</option>
                      <option value="LU">LU</option>
                      <option value="ZZ">ZZ (Tax)</option>
                    </select>
                    <input id="field-billing-other" className="form-input" placeholder="ID or Taxonomy Code"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      value={form.billingProviderOtherIdQual === 'ZZ' ? form.taxonomyCode : form.billingProviderOtherId} 
                      onChange={e => {
                        if (form.billingProviderOtherIdQual === 'ZZ') {
                          set('taxonomyCode', e.target.value);
                        } else {
                          set('billingProviderOtherId', e.target.value);
                        }
                      }} />
                  </div>
                </Field>
              </div>
            </Section>

            </>
            )}

            {/* ===== STICKY BOTTOM ACTION BAR ===== */}
            {!isFormEmpty && (
            <div className="sticky-action-bar">
              <div className="sticky-action-bar-inner">
                <div className="sticky-score">
                  <div className="sticky-score-ring" style={{
                    background: `conic-gradient(${readiness < 50 ? '#ef4444' : readiness < 80 ? '#f59e0b' : '#10b981'} ${readiness * 3.6}deg, rgba(255,255,255,0.06) 0deg)`
                  }}>
                    <div className="sticky-score-ring-inner">
                      <span>{!hasValidated ? '?' : `${readiness}%`}</span>
                    </div>
                  </div>
                  <div>
                    <div className="sticky-score-label">Readiness Score</div>
                    <div className="sticky-score-sub">{!hasValidated ? 'Pending validation' : (readiness < 50 ? 'Needs attention' : readiness < 80 ? 'Getting there' : readiness < 100 ? 'Almost ready' : '✨ Ready!')}</div>
                  </div>
                </div>
                <div className="sticky-actions">
                  <button className="btn btn-secondary" onClick={handleClear}>
                    <Icon.Trash /> Clear
                  </button>
                  <button className={`btn btn-secondary ${isSaving ? 'loading' : ''}`} onClick={handleSaveToCloud} disabled={isSaving}>
                    <Icon.Check /> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleExportClick('PDF')}
                    disabled={!hasValidated}
                    title={!hasValidated ? "Please run Validate Claim first" : "Export as PDF"}
                    style={{ opacity: !hasValidated ? 0.5 : 1, cursor: !hasValidated ? 'not-allowed' : 'pointer' }}
                  >
                    <Icon.Download /> Export PDF
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleExportClick('EDI')}
                    disabled={!hasValidated}
                    title={!hasValidated ? "Please run Validate Claim first" : "Export as EDI 837P"}
                    style={{ background: '#059669', opacity: !hasValidated ? 0.5 : 1, cursor: !hasValidated ? 'not-allowed' : 'pointer' }}
                  >
                    <Icon.Download /> Export EDI
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowWaitlistModal(true)}
                    style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                  >
                    <Icon.Send /> Submit Electronically
                  </button>

                </div>
              </div>
            </div>
            )}
          </div>

          {/* ===== SIDEBAR ===== */}
          <aside className="sidebar">
            {!isFormEmpty && (
              <>
            {/* Score card */}
            <div className="glass-card sidebar-card">
              <h3><Icon.Shield /> Readiness Score</h3>
              <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                <div style={{
                  fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em',
                  backgroundImage: `linear-gradient(135deg, ${!hasValidated ? '#64748b' : (readiness < 50 ? '#ef4444' : readiness < 80 ? '#f59e0b' : '#10b981')}, #06b6d4)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  display: 'inline-block'
                }}>
                  {!hasValidated ? '?' : `${readiness}%`}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                  {!hasValidated ? 'Click Validate to score' : (readiness < 50 ? 'Needs attention' : readiness < 80 ? 'Getting there' : readiness < 100 ? 'Almost ready' : '✨ Ready!')}
                </div>
              </div>
              <div className="progress-track" style={{ marginBottom: 16 }}>
                  <div className="progress-fill" style={{ width: `${readiness}%` }} />
                </div>
                
                <button 
                  className={`btn btn-primary ${isValidating ? 'loading' : ''}`} 
                  onClick={handleValidate} 
                  disabled={isValidating}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', fontWeight: 600 }}
                >
                  <Icon.Check size={18} /> {isValidating ? 'Running Validation...' : 'Validate Claim'}
                </button>
              </div>

            {/* Validation Report OR Checklist */}
            {hasValidated && validationResults.length > 0 ? (
              <SidebarValidationReport results={validationResults} />
            ) : (
              <div className="glass-card sidebar-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3><Icon.Check /> Section Checklist</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{completionPct}% Filled</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#2d3348', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 16px' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${completionPct}%`,
                      background: completionPct < 50 ? 'var(--danger)' : completionPct < 100 ? 'var(--warning)' : 'var(--success)',
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                  <div className="checklist">
                  {sidebarChecks.map((item, i) => {
                  const status = getCheckStatus(item.fields);
                  return (
                    <div key={i} className="checklist-item">
                      <div className={`checklist-dot ${status}`} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
            </>
            )}




          </aside>
        </div>
      </main>

      {/* ===== AI Loading Overlay ===== */}
      {isAutofilling && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-content">
            <div className="ai-spinner"></div>
            <h2 className="ai-loading-title">AI is analyzing your document...</h2>
            <p className="ai-loading-sub">Extracting patient data, mapping ICD-10 & CPT codes, and validating against clearinghouse rules.</p>
          </div>
        </div>
      )}

      {/* ===== Validation Loading Overlay ===== */}
      {isValidating && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-content" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <div className="ai-spinner" style={{ borderTopColor: '#10b981' }}></div>
            <h2 className="ai-loading-title">Validating claim...</h2>
            <p className="ai-loading-sub">Checking NPI registries, ICD-10/CPT codes, and running advanced clearinghouse rules.</p>
          </div>
        </div>
      )}

      {/* ===== Validation Loading Overlay ===== */}
      {isValidating && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-content" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <div className="ai-spinner" style={{ borderTopColor: '#10b981' }}></div>
            <h2 className="ai-loading-title">Validating claim...</h2>
            <p className="ai-loading-sub">Checking NPI registries, ICD-10/CPT codes, and running advanced clearinghouse rules.</p>
          </div>
        </div>
      )}

      {/* ===== Validation Modal Removed ===== */}

      
      {/* ===== Export Warning Modal ===== */}
      {exportWarning.show && (
        <div className="modal-overlay" onClick={() => setExportWarning({show: false, type: 'PDF', errorCount: 0})}>
          <div className="glass-card modal-panel" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1rem', color: '#ff4d4f' }}>
              <Icon.Warn />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Validation Warnings</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This claim has {exportWarning.errorCount} missing or invalid fields. Exporting it now may result in an incomplete or rejected claim.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to download the {exportWarning.type} anyway?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setExportWarning({show: false, type: 'PDF', errorCount: 0})} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => {
                setExportWarning({show: false, type: 'PDF', errorCount: 0});
                if (exportWarning.type === 'PDF') doExportPdf();
                else doExportEdi();
              }} style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}>
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ===== Invalid Template Modal ===== */}
      {showInvalidTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowInvalidTemplateModal(false)}>
          <div className="glass-card modal-panel" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1rem', color: '#ff4d4f' }}>
              <Icon.Warn />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Invalid PDF Format</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              The PDF you uploaded doesn't seem to be an official CMS-1500 form. Our importer requires the standard fillable template to map your data correctly.
            </p>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Please download and use the official template:</p>
              <a href="/cms1500_template.pdf" download="cms1500_template.pdf" style={{ color: '#00d2ff', textDecoration: 'none', fontWeight: 600 }}>
                ⬇️ Download Official CMS-1500 PDF
              </a>
            </div>
            <button className="btn btn-primary" onClick={() => setShowInvalidTemplateModal(false)} style={{ width: '100%' }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ===== AI Autofill Modal ===== */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => !isAutofilling && setShowAiModal(false)}>
          <div className="glass-card modal-panel" style={{ maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon.Sparkles />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.125rem' }}>AI Autofill</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Powered by Gemini 2.5 Flash · Paste any medical notes or patient intake text
                </p>
              </div>
              {!isAutofilling && (
                <button className="btn btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setShowAiModal(false)} aria-label="Close">
                  <Icon.X />
                </button>
              )}
            </div>

            {/* Instructions */}
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              💡 Paste raw text such as a <strong>doctor's note</strong>, <strong>patient intake form</strong>, <strong>encounter summary</strong>, or <strong>referral letter</strong>. Gemini will extract and map fields like patient name, DOB, diagnosis codes, CPT codes, and service dates automatically.
            </div>

            {/* Textarea */}
            <AiTextInput onExtract={handleAiExtract} isLoading={isAutofilling} />
          </div>
        </div>
      )}

      
      {/* ===== Signup Prompt Modal (PLG) ===== */}
      {showSignupModal && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="glass-card modal-panel" style={{ maxWidth: '450px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1.5rem', color: '#3b82f6' }}>
              <Icon.Shield />
            </div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>Create a Free Account</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
              You need to create a free account to save claims to the cloud, export them to PDF, and unlock the full dashboard. It takes 10 seconds.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowSignupModal(false)}>
                Continue Editing
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/login')}>
                Sign Up Free &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NPI Result Modal ===== */}
      {npiModalState.show && (
        <div className="modal-overlay" onClick={() => npiModalState.status !== 'loading' && setNpiModalState(prev => ({ ...prev, show: false }))}>
          <div className="glass-card modal-panel" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1rem', color: npiModalState.status === 'success' ? '#00d2ff' : npiModalState.status === 'error' ? '#ff4d4f' : 'var(--text-secondary)' }}>
              {npiModalState.status === 'success' && <Icon.Check />}
              {npiModalState.status === 'error' && <Icon.Warn />}
              {npiModalState.status === 'loading' && <Icon.Rows />}
            </div>
            <h2 style={{ marginBottom: '1rem' }}>{npiModalState.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {npiModalState.message}
            </p>
            
            {npiModalState.status === 'success' && npiModalState.data && (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
                <div style={{ marginBottom: '0.5rem' }}><strong>Name:</strong> {npiModalState.data.type === 'individual' ? `${npiModalState.data.firstName} ${npiModalState.data.lastName}` : npiModalState.data.organizationName}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{npiModalState.data.type}</span></div>
                {npiModalState.data.primaryTaxonomy && <div><strong>Taxonomy:</strong> {npiModalState.data.primaryTaxonomy}</div>}
              </div>
            )}

            {npiModalState.status !== 'loading' && (
              <button className="btn btn-primary" onClick={() => setNpiModalState(prev => ({ ...prev, show: false }))} style={{ width: '100%' }}>
                {npiModalState.status === 'success' ? 'Awesome' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== DB Code Result Modal ===== */}
      {dbModalState.show && (
        <div className="modal-overlay" onClick={() => dbModalState.status !== 'loading' && setDbModalState(prev => ({ ...prev, show: false }))}>
          <div className="glass-card modal-panel" style={{ maxWidth: '500px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1rem', color: dbModalState.status === 'success' ? '#00d2ff' : dbModalState.status === 'error' ? '#ff4d4f' : 'var(--text-secondary)' }}>
              {dbModalState.status === 'success' && <Icon.Check />}
              {dbModalState.status === 'error' && <Icon.Warn />}
              {dbModalState.status === 'loading' && <Icon.Rows />}
            </div>
            <h2 style={{ marginBottom: '1rem' }}>{dbModalState.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {dbModalState.message}
            </p>
            
            {dbModalState.status === 'success' && dbModalState.data && (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
                <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: '#fff' }}><strong>{dbModalState.data.code}</strong></div>
                <div style={{ marginBottom: '0.5rem', color: '#00d2ff', fontWeight: 600 }}>{dbModalState.data.short_description}</div>
                {dbModalState.data.long_description && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{dbModalState.data.long_description}</div>}
              </div>
            )}

            {dbModalState.status !== 'loading' && (
              <button className="btn btn-primary" onClick={() => setDbModalState(prev => ({ ...prev, show: false }))} style={{ width: '100%' }}>
                {dbModalState.status === 'success' ? 'Got It' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <Icon.Check /> : toast.type === 'error' ? <Icon.X /> : <Icon.Info />}
          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{toast.message}</span>
        </div>
      )}
    
      {/* CLEARINGHOUSE FAKE DOOR MODAL */}
      {showWaitlistModal && (
        <div className="modal-overlay" onClick={() => setShowWaitlistModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            {waitlistSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <Icon.CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                <h2>You're on the list!</h2>
                <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
                  We are building direct API integrations with major clearinghouses right now. We'll email you the moment it's ready for beta testing!
                </p>
                <button className="btn btn-primary" onClick={() => setShowWaitlistModal(false)} style={{ marginTop: '1.5rem', width: '100%' }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2>Submit Electronically</h2>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  We are currently building direct API integrations with major clearinghouses so you can submit claims with one click! 
                  <br/><br/>
                  Join the Beta waitlist below and tell us which clearinghouse you prefer.
                </p>
                <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={waitlistEmail}
                      onChange={e => setWaitlistEmail(e.target.value)}
                      placeholder="you@practice.com"
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>Which clearinghouse do you currently use? (Optional)</label>
                    <input 
                      type="text" 
                      value={waitlistClearinghouse}
                      onChange={e => setWaitlistClearinghouse(e.target.value)}
                      placeholder="e.g. ClaimMD, Availity, Change Healthcare..."
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowWaitlistModal(false)} style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className={`btn btn-primary ${isSubmittingWaitlist ? 'loading' : ''}`} disabled={isSubmittingWaitlist} style={{ flex: 2 }}>
                      {isSubmittingWaitlist ? 'Joining...' : 'Join Beta Waitlist'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
</div>
  );
}

