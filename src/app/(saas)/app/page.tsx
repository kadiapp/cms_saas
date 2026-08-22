"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/api/supabase';
import { validateClaim, computeReadiness } from '@/validation';
import { parse277CA } from '@/edi277';
import * as Icon from 'react-feather';
import './ClaimsDashboard.css';

interface ClaimRecord {
  id: string;
  patient_name: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export default function ClaimsDashboard() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Modal States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [alertInfo, setAlertInfo] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
    } else {
      setClaims(data || []);
    }
    setLoading(false);
  };

    const triggerDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const { error } = await supabase.from('claims').delete().eq('id', confirmDeleteId);
    if (!error) {
      setClaims(claims.filter(c => c.id !== confirmDeleteId));
    }
    setConfirmDeleteId(null);
  };

  const handle277Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const result = parse277CA(text);
            if (result.status === 'Rejected') {
        setAlertInfo({ title: 'Clearinghouse Rejection', message: result.messages.join('\n') });
      } else {
        setAlertInfo({ title: `Clearinghouse Status: ${result.status}`, message: result.messages.join('\n') });
      }
      
      // In a real app, we would update the status of `result.claimId` in Supabase here!
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const filteredClaims = claims.filter(c => {
    const s = searchTerm.toLowerCase();
    const pName = (c.patient_name || '').toLowerCase();
    const pId = (c.form_data?.payerId || '').toLowerCase();
    const pN = (c.form_data?.payerName || '').toLowerCase();
    return pName.includes(s) || pId.includes(s) || pN.includes(s);
  });

  return (<><div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Claims Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label 
            className="btn btn-secondary" 
            style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px' }}
          >
            <Icon.UploadCloud size={18} /> Process 277CA
            <input type="file" accept=".txt,.edi" style={{ display: 'none' }} onChange={handle277Upload} />
          </label>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/app/editor')}
            style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon.Plus size={18} /> New Blank Claim
          </button>
        </div>
      </div>

      <div className="dashboard-controls">
        <div className="dashboard-search">
          <Icon.Search size={18} className="dashboard-search-icon" />
          <input 
            type="text" 
            placeholder="Search by patient or payer..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="claims-table-wrapper">
        <table className="claims-table">
          <thead>
            <tr>
              <th>Patient & Payer</th>
              <th>Date of Service</th>
              <th>Score</th>
              <th>Last Updated</th>
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading claims...</td>
              </tr>
            ) : filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <Icon.FileText size={48} color="rgba(255,255,255,0.1)" />
                    <h3>No claims found</h3>
                    <p>{searchTerm ? 'Try a different search term.' : 'You haven\'t saved any claims yet.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClaims.map(claim => {
                const results = validateClaim(claim.form_data);
                const score = computeReadiness(results);
                
                return (
                  <tr 
                    key={claim.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/app/editor/${claim.id}`)}
                  >
                    <td>
                      <div className="claim-patient-name">{claim.patient_name || 'Unknown Patient'}</div>
                      <div className="claim-payer">{claim.form_data?.payerName || 'No Payer Selected'}</div>
                    </td>
                    <td>{claim.form_data?.dateOfCurrentIllness || '—'}</td>
                    <td>
                      <span className={`claim-score-badge ${score === 100 ? 'score-perfect' : score >= 80 ? 'score-good' : 'score-bad'}`}>
                        {score}%
                      </span>
                    </td>
                    <td>
                      {new Date(claim.updated_at).toLocaleDateString()} {new Date(claim.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-icon" 
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); router.push(`/app/editor/${claim.id}`); }}
                        >
                          <Icon.Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon danger" 
                          title="Delete"
                          onClick={(e) => triggerDelete(claim.id, e)}
                        >
                          <Icon.Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
        </div>
      
      {/* --- Custom Confirm Delete Modal --- */}
      {confirmDeleteId && (
        <div className="custom-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#ef4444' }}><Icon.AlertTriangle size={20} /> Delete Claim</h3>
            <p>Are you sure you want to delete this claim? This action cannot be undone.</p>
            <div className="custom-modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Custom Alert Modal --- */}
      {alertInfo && (
        <div className="custom-modal-overlay" onClick={() => setAlertInfo(null)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <h3><Icon.Info size={20} /> {alertInfo.title}</h3>
            <p>{alertInfo.message}</p>
            <div className="custom-modal-actions">
              <button className="btn btn-primary" onClick={() => setAlertInfo(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
