"use client";

import React, { useState } from 'react';
import * as Icon from 'react-feather';
import { verifyCptCode, getFeeSchedule, getClinicalRules, getNcciConflictsForCode } from '@/api/supabase';
import './CodingAssistant.css';

export default function CodingAssistant() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Results State
  const [cptInfo, setCptInfo] = useState<any>(null);
  const [feeSchedule, setFeeSchedule] = useState<any>(null);
  const [ncciConflicts, setNcciConflicts] = useState<any[]>([]);
  const [clinicalRules, setClinicalRules] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const code = query.trim().toUpperCase();
    setIsLoading(true);
    setHasSearched(false);
    setErrorMsg('');
    setCptInfo(null);
    setFeeSchedule(null);
    setNcciConflicts([]);
    setClinicalRules([]);

    try {
      // 1. Verify CPT Code
      const cptResult = await verifyCptCode(code);
      if (!cptResult.valid) {
        setErrorMsg(`CPT code ${code} not found in the CMS database.`);
        setIsLoading(false);
        return;
      }
      setCptInfo(cptResult);

      // 2. Fetch Fee Schedule
      const fees = await getFeeSchedule([code]);
      if (fees && fees.length > 0) {
        setFeeSchedule(fees[0]);
      }

      // 3. Fetch NCCI Conflicts
      const conflicts = await getNcciConflictsForCode(code);
      setNcciConflicts(conflicts);

      // 4. Fetch Clinical Rules (Filter globally)
      const allRules = await getClinicalRules();
      const applicableRules = allRules.filter(rule => 
        rule.values_array && rule.values_array.includes(code)
      );
      setClinicalRules(applicableRules);

      setHasSearched(true);
    } catch (err) {
      setErrorMsg('An error occurred while querying the coding engine.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="coding-assistant-container">
      <div className="ca-header">
        <h1><Icon.Activity size={28} /> Medical Coding Assistant</h1>
        <p>Real-time Medicare Fee Schedule and NCCI PTP Edit lookup.</p>
      </div>

      <div className="ca-search-box glass-card">
        <form onSubmit={handleSearch} className="ca-form">
          <div className="ca-input-wrapper">
            <Icon.Search size={20} className="ca-search-icon" />
            <input 
              type="text" 
              placeholder="Enter CPT Code (e.g. 99214)" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ca-input"
              maxLength={5}
            />
          </div>
          <button type="submit" className={`btn btn-primary ca-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? 'Querying Engine...' : 'Analyze Code'}
          </button>
        </form>
        {errorMsg && <div className="ca-error"><Icon.AlertCircle size={16} /> {errorMsg}</div>}
      </div>

      {hasSearched && cptInfo && (
        <div className="ca-results">
          
          <div className="ca-grid">
            {/* Primary Info Card */}
            <div className="glass-card ca-card">
              <div className="ca-card-header">
                <h3><Icon.Info size={18} /> Code Definition</h3>
              </div>
              <div className="ca-card-body">
                <div className="ca-huge-code">{cptInfo.code}</div>
                <p className="ca-desc">{cptInfo.description}</p>
              </div>
            </div>

            {/* Fee Schedule Card */}
            <div className="glass-card ca-card">
              <div className="ca-card-header">
                <h3><Icon.DollarSign size={18} /> Medicare Fee Schedule</h3>
              </div>
              <div className="ca-card-body">
                {feeSchedule ? (
                  <div className="ca-fee-stats">
                    <div className="ca-stat">
                      <span className="ca-stat-label">Non-Facility (Office)</span>
                      <span className="ca-stat-val">${feeSchedule.non_facility_fee || '0.00'}</span>
                    </div>
                    <div className="ca-stat">
                      <span className="ca-stat-label">Facility (Hospital)</span>
                      <span className="ca-stat-val">${feeSchedule.facility_fee || '0.00'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="ca-empty">No fee schedule data available for this code.</p>
                )}
              </div>
            </div>
            
            {/* Clinical Rules Card */}
            <div className="glass-card ca-card ca-full-width">
              <div className="ca-card-header">
                <h3><Icon.Shield size={18} /> Clinical Demographic Rules</h3>
              </div>
              <div className="ca-card-body">
                {clinicalRules.length > 0 ? (
                  <ul className="ca-rule-list">
                    {clinicalRules.map((rule, idx) => (
                      <li key={idx} className="ca-rule-item">
                        <Icon.AlertTriangle size={16} color="#fbbf24" />
                        <span><strong>{rule.rule_key}:</strong> {rule.description}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ca-empty"><Icon.CheckCircle size={16} color="#10b981" /> No specific age or gender restrictions found for this code.</p>
                )}
              </div>
            </div>

            {/* NCCI Conflicts Card */}
            <div className="glass-card ca-card ca-full-width">
              <div className="ca-card-header">
                <h3><Icon.XOctagon size={18} /> NCCI Mutually Exclusive Codes</h3>
                <span className="ca-badge">{ncciConflicts.length} Conflicts</span>
              </div>
              <div className="ca-card-body">
                {ncciConflicts.length > 0 ? (
                  <>
                    <p className="ca-ncci-warn">
                      You cannot bill {cptInfo.code} on the same claim with any of the following codes unless a modifier is permitted.
                    </p>
                    <div className="ca-ncci-table-wrap">
                      <table className="ca-table">
                        <thead>
                          <tr>
                            <th>Conflicting Code</th>
                            <th>Modifier Allowed?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ncciConflicts.slice(0, 100).map((conflict, idx) => {
                            const otherCode = conflict.code_1 === cptInfo.code ? conflict.code_2 : conflict.code_1;
                            const modAllowed = conflict.modifier_indicator === '1';
                            return (
                              <tr key={idx}>
                                <td className="ca-conflict-code">{otherCode}</td>
                                <td>
                                  {modAllowed ? (
                                    <span className="ca-mod-yes"><Icon.Check size={14}/> Yes (e.g. 59)</span>
                                  ) : (
                                    <span className="ca-mod-no"><Icon.X size={14}/> No</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {ncciConflicts.length > 100 && (
                      <p className="ca-ncci-more">...and {ncciConflicts.length - 100} more conflicting codes.</p>
                    )}
                  </>
                ) : (
                  <p className="ca-empty"><Icon.CheckCircle size={16} color="#10b981" /> No NCCI Procedure-to-Procedure edits found. This code can generally be billed with others.</p>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
