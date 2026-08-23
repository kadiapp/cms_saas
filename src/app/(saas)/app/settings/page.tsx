"use client";

import React, { useState, useEffect } from 'react';
import * as Icon from 'react-feather';
import RuleBuilder from '../rules/page';
import { 
  getProviders, saveProvider, deleteProvider, ProviderRecord,
  getPatients, savePatient, deletePatient, PatientRecord 
} from '@/api/supabase';
import './Settings.css';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'patients' | 'rules'>('providers');
  
  // Providers State
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [editingProvider, setEditingProvider] = useState<Partial<ProviderRecord> | null>(null);
  
  // Patients State
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [editingPatient, setEditingPatient] = useState<Partial<PatientRecord> | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'providers') {
        const data = await getProviders();
        setProviders(data);
      } else {
        const data = await getPatients();
        setPatients(data);
      }
    } catch (err: any) {
      alert(err.message || "Failed to save provider");
      console.error(err);
    }
  };

  const handleProviderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    setIsLoading(true);
    try {
      await saveProvider(editingProvider as ProviderRecord);
      setEditingProvider(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save patient");
      console.error(err);
    }
    setIsLoading(false);
  };

  const handlePatientSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setIsLoading(true);
    try {
      await savePatient(editingPatient as PatientRecord);
      setEditingPatient(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1><Icon.Settings size={28} /> Workspace Settings</h1>
        <p>Manage your address books for quick autofill during claim creation.</p>
      </div>

      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          <Icon.Briefcase size={18} /> My Providers & Facilities
        </button>
        <button 
          className={`settings-tab ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          <Icon.Users size={18} /> My Patients
        </button>
        <button 
          className={`settings-tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Icon.Shield size={18} /> Custom Payer Rules
        </button>
      </div>

      {activeTab === 'providers' && (
        <div className="settings-content">
          <div className="glass-card settings-card">
            <h3>{editingProvider?.id ? 'Edit Provider' : 'Add New Provider'}</h3>
            <form onSubmit={handleProviderSave}>
              <div className="settings-form-grid">
                <div className="settings-form-group full">
                  <label>Provider / Facility Name</label>
                  <input 
                    required 
                    type="text" 
                    value={editingProvider?.name || ''} 
                    onChange={e => setEditingProvider({...editingProvider, name: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>National Provider ID (NPI)</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={10}
                    value={editingProvider?.npi || ''} 
                    onChange={e => setEditingProvider({...editingProvider, npi: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Tax ID (EIN/SSN)</label>
                  <input 
                    type="text" 
                    value={editingProvider?.tax_id || ''} 
                    onChange={e => setEditingProvider({...editingProvider, tax_id: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Taxonomy Code (Optional)</label>
                  <input 
                    type="text" 
                    value={editingProvider?.taxonomy_code || ''} 
                    onChange={e => setEditingProvider({...editingProvider, taxonomy_code: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group full">
                  <label>Street Address</label>
                  <input 
                    type="text" 
                    value={(editingProvider?.address || '').split(',')[0] || ''} 
                    onChange={e => {
                      const parts = (editingProvider?.address || ',,').split(',');
                      parts[0] = e.target.value;
                      setEditingProvider({...editingProvider, address: parts.join(',')});
                    }} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    value={(editingProvider?.address || ',').split(',')[1]?.trim() || ''} 
                    onChange={e => {
                      const parts = (editingProvider?.address || ',,').split(',');
                      parts[1] = ' ' + e.target.value;
                      setEditingProvider({...editingProvider, address: parts.join(',')});
                    }} 
                  />
                </div>
                <div className="settings-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label>State</label>
                    <input 
                      type="text" 
                      maxLength={2}
                      style={{ width: '100%' }}
                      value={((editingProvider?.address || ',,').split(',')[2] || '').trim().split(' ')[0] || ''} 
                      onChange={e => {
                        const parts = (editingProvider?.address || ',,').split(',');
                        const stZip = (parts[2] || ' ').trim().split(' ');
                        stZip[0] = e.target.value;
                        parts[2] = ' ' + stZip.join(' ');
                        setEditingProvider({...editingProvider, address: parts.join(',')});
                      }} 
                    />
                  </div>
                  <div>
                    <label>ZIP</label>
                    <input 
                      type="text"
                      style={{ width: '100%' }}
                      value={((editingProvider?.address || ',,').split(',')[2] || '').trim().split(' ')[1] || ''} 
                      onChange={e => {
                        const parts = (editingProvider?.address || ',,').split(',');
                        const stZip = (parts[2] || ' ').trim().split(' ');
                        stZip[1] = e.target.value;
                        parts[2] = ' ' + stZip.join(' ');
                        setEditingProvider({...editingProvider, address: parts.join(',')});
                      }} 
                    />
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="(555) 555-5555"
                    value={editingProvider?.phone || ''} 
                    onChange={e => setEditingProvider({...editingProvider, phone: e.target.value})} 
                  />
                </div>
              </div>
              <div className="settings-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProvider(null)}>Clear</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading || !editingProvider?.name}>
                  <Icon.Save size={16} /> Save Provider
                </button>
              </div>
            </form>
          </div>

          <div className="settings-list">
            {providers.map(p => (
              <div key={p.id} className="settings-list-item">
                <div className="settings-list-info">
                  <strong>{p.name}</strong>
                  <span>NPI: {p.npi} {p.tax_id ? `• Tax ID: ${p.tax_id}` : ''}</span>
                </div>
                <div className="settings-list-actions">
                  <button className="btn-icon" onClick={() => setEditingProvider(p)}><Icon.Edit2 size={16} /></button>
                  <button className="btn-icon danger" onClick={async () => {
                    if (confirm('Delete this provider?')) {
                      await deleteProvider(p.id!);
                      loadData();
                    }
                  }}><Icon.Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="settings-content">
          <div className="glass-card settings-card">
            <h3>{editingPatient?.id ? 'Edit Patient' : 'Add New Patient'}</h3>
            <form onSubmit={handlePatientSave}>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label>First Name</label>
                  <input 
                    required 
                    type="text" 
                    value={editingPatient?.first_name || ''} 
                    onChange={e => setEditingPatient({...editingPatient, first_name: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Last Name</label>
                  <input 
                    required 
                    type="text" 
                    value={editingPatient?.last_name || ''} 
                    onChange={e => setEditingPatient({...editingPatient, last_name: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Date of Birth</label>
                  <input 
                    type="date" 
                    value={editingPatient?.dob || ''} 
                    onChange={e => setEditingPatient({...editingPatient, dob: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Sex</label>
                  <select 
                    value={editingPatient?.sex || ''} 
                    onChange={e => setEditingPatient({...editingPatient, sex: e.target.value})}
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="settings-form-group">
                  <label>Insurance ID</label>
                  <input 
                    type="text" 
                    value={editingPatient?.insurance_id || ''} 
                    onChange={e => setEditingPatient({...editingPatient, insurance_id: e.target.value})} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>Insurance Type</label>
                  <select 
                    value={editingPatient?.insurance_type || ''} 
                    onChange={e => setEditingPatient({...editingPatient, insurance_type: e.target.value})}
                  >
                    <option value="">Select...</option>
                    <option value="Medicare">Medicare</option>
                    <option value="Medicaid">Medicaid</option>
                    <option value="Tricare">Tricare</option>
                    <option value="FECA">FECA</option>
                    <option value="Group">Group</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="settings-form-group full">
                  <label>Street Address</label>
                  <input 
                    type="text" 
                    value={(editingPatient?.address || '').split(',')[0] || ''} 
                    onChange={e => {
                      const parts = (editingPatient?.address || ',,').split(',');
                      parts[0] = e.target.value;
                      setEditingPatient({...editingPatient, address: parts.join(',')});
                    }} 
                  />
                </div>
                <div className="settings-form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    value={(editingPatient?.address || ',').split(',')[1]?.trim() || ''} 
                    onChange={e => {
                      const parts = (editingPatient?.address || ',,').split(',');
                      parts[1] = ' ' + e.target.value;
                      setEditingPatient({...editingPatient, address: parts.join(',')});
                    }} 
                  />
                </div>
                <div className="settings-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label>State</label>
                    <input 
                      type="text" 
                      maxLength={2}
                      style={{ width: '100%' }}
                      value={((editingPatient?.address || ',,').split(',')[2] || '').trim().split(' ')[0] || ''} 
                      onChange={e => {
                        const parts = (editingPatient?.address || ',,').split(',');
                        const stZip = (parts[2] || ' ').trim().split(' ');
                        stZip[0] = e.target.value;
                        parts[2] = ' ' + stZip.join(' ');
                        setEditingPatient({...editingPatient, address: parts.join(',')});
                      }} 
                    />
                  </div>
                  <div>
                    <label>ZIP Code</label>
                    <input 
                      type="text"
                      style={{ width: '100%' }}
                      value={((editingPatient?.address || ',,').split(',')[2] || '').trim().split(' ')[1] || ''} 
                      onChange={e => {
                        const parts = (editingPatient?.address || ',,').split(',');
                        const stZip = (parts[2] || ' ').trim().split(' ');
                        stZip[1] = e.target.value;
                        parts[2] = ' ' + stZip.join(' ');
                        setEditingPatient({...editingPatient, address: parts.join(',')});
                      }} 
                    />
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="(555) 555-5555"
                    value={editingPatient?.phone || ''} 
                    onChange={e => setEditingPatient({...editingPatient, phone: e.target.value})} 
                  />
                </div>
              </div>
              <div className="settings-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPatient(null)}>Clear</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading || !editingPatient?.first_name}>
                  <Icon.Save size={16} /> Save Patient
                </button>
              </div>
            </form>
          </div>

          <div className="settings-list">
            {patients.map(p => (
              <div key={p.id} className="settings-list-item">
                <div className="settings-list-info">
                  <strong>{p.first_name} {p.last_name}</strong>
                  <span>DOB: {p.dob || 'N/A'} • Ins: {p.insurance_id || 'N/A'}</span>
                </div>
                <div className="settings-list-actions">
                  <button className="btn-icon" onClick={() => setEditingPatient(p)}><Icon.Edit2 size={16} /></button>
                  <button className="btn-icon danger" onClick={async () => {
                    if (confirm('Delete this patient?')) {
                      await deletePatient(p.id!);
                      loadData();
                    }
                  }}><Icon.Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {activeTab === 'rules' && (
        <div className="settings-content" style={{ marginTop: '-32px' }}>
          <RuleBuilder />
        </div>
      )}
    </div>
  );
}
