"use client";

import React, { useState } from 'react';
import { supabase } from '@/api/supabase';
import * as Icon from 'react-feather';
import './RuleBuilder.css';

export default function RuleBuilder() {
  const [payerId, setPayerId] = useState('');
  const [field, setField] = useState('patientDob');
  const [operator, setOperator] = useState('regex');
  const [value, setValue] = useState('');
  const [severity, setSeverity] = useState('error');
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const ruleConfig = {
      field,
      operator,
      value,
      severity,
      message
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('community_payer_rules').insert([
        {
          payer_id: payerId,
          rule_config: ruleConfig,
          description: description,
          submitted_by: user?.id || null
        }
      ]);

      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'Rule successfully submitted to the community database!' });
      // Reset form
      setPayerId('');
      setValue('');
      setMessage('');
      setDescription('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to submit rule.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rule-builder-container">
      <div className="rule-builder-header">
        <Icon.Settings size={32} />
        <h1>Community Rule Builder</h1>
      </div>

      <div className="glass-card rule-builder-card">
        <p className="rule-builder-intro">
          Did a payer reject your claim for a weird formatting reason? Add the rule here to build the community database and prevent the error for everyone else!
        </p>

        {status && (
          <div className={`status-message ${status.type}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rule-builder-form">
          <div className="rule-grid-2">
            <div className="form-group">
              <label>Payer ID (e.g., medicare, bcbs_tx)</label>
              <input type="text" required value={payerId} onChange={e => setPayerId(e.target.value)} 
                placeholder="bcbs_tx" />
            </div>
            <div className="form-group">
              <label>Description / Reason</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} 
                placeholder="BCBS Texas requires modifier 25 on 99214" />
            </div>
          </div>

          <div className="rule-grid-3">
            <div className="form-group highlight">
              <label>If Field...</label>
              <select value={field} onChange={e => setField(e.target.value)}>
                <option value="patientDob">Patient DOB (Box 3)</option>
                <option value="patientZip">Patient Zip (Box 5)</option>
                <option value="billingProviderZip">Billing Zip (Box 33)</option>
                <option value="priorAuthNumber">Prior Auth (Box 23)</option>
                <option value="totalCharge">Total Charge (Box 28)</option>
              </select>
            </div>
            <div className="form-group highlight">
              <label>Condition...</label>
              <select value={operator} onChange={e => setOperator(e.target.value)}>
                <option value="regex">Must Match Regex</option>
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="required">Is Required (Not Empty)</option>
              </select>
            </div>
            <div className="form-group highlight">
              <label>Value...</label>
              <input type="text" value={value} onChange={e => setValue(e.target.value)} 
                placeholder="^\d{9}$" />
            </div>
          </div>

          <div className="rule-grid-2">
            <div className="form-group">
              <label>Severity if Failed</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)}>
                <option value="warn">Warning (Yellow)</option>
                <option value="error">Error (Red)</option>
                <option value="critical">Critical (Flashing Red)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Error Message to Display</label>
              <input type="text" required value={message} onChange={e => setMessage(e.target.value)} 
                placeholder="This payer requires a 9 digit zip code." />
            </div>
          </div>

          <div className="rule-builder-footer">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
              {isSubmitting ? 'Submitting...' : 'Share Rule with Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

