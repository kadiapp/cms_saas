"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

interface BlogMicroCTAProps {
  type: 'ncci' | 'mednec' | 'dictionary' | 'box17' | 'ub04' | 'box24' | 'tldr_ai';
  defaultCode?: string;
}

export default function BlogMicroCTA({ type, defaultCode = '' }: BlogMicroCTAProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultCode);

  const configs = {
    ncci: {
      icon: <Icon.Shield size={20} color="#3b82f6" />,
      title: "Check NCCI Edits Instantly",
      desc: "Not sure if these codes bundle? Check the latest Medicare NCCI database updates before you bill.",
      placeholder: "e.g., 74178",
      btnText: "Check Edits",
      param: 'code1'
    },
    mednec: {
      icon: <Icon.FileText size={20} color="#10b981" />,
      title: "Verify Medical Necessity",
      desc: "Don't risk a denial. See if your ICD-10 code is on the approved Medicare LCD list.",
      placeholder: "Enter CPT (e.g. 74178)",
      btnText: "Check Coverage",
      param: 'code'
    },
    dictionary: {
      icon: <Icon.Book size={20} color="#06b6d4" />,
      title: "Compare CPT Codes",
      desc: "Confused between with vs. without contrast? Look up the official code descriptions.",
      placeholder: "Enter CPT (e.g. 74177)",
      btnText: "Lookup Code",
      param: 'q'
    },
    box17: {
      icon: <Icon.UserCheck size={20} color="#8b5cf6" />,
      title: "Verify Referring Provider NPI",
      desc: "Box 17 requires a valid NPI and qualifier (DN, DK, DQ). Look up any provider instantly.",
      placeholder: "Enter 10-digit NPI",
      btnText: "Lookup NPI",
      param: 'npi',
      targetTab: 'npi'
    },
    ub04: {
      icon: <Icon.Activity size={20} color="#f43f5e" />,
      title: "UB-04 Discharge Status AI",
      desc: "Not sure which Patient Discharge Status Code (FL 17) applies? Let our AI analyze the scenario.",
      placeholder: "e.g., Patient transferred to SNF...",
      btnText: "Ask AI Auto-Coder",
      param: 'note',
      targetTab: 'auto'
    },
    box24: {
      icon: <Icon.Calendar size={20} color="#f59e0b" />,
      title: "Stop Fighting Box 24 Dates",
      desc: "Formatting dates of service (MM DD YY) is a massive pain. Let our AI auto-fill the dates and the rest of the CMS-1500 for you in seconds.",
      placeholder: "",
      btnText: "Try AI Auto-Fill",
      param: '',
      targetTab: 'editor_upload',
      hideInput: true
    },
    tldr_ai: {
      icon: <Icon.Zap size={20} color="#eab308" />,
      title: "TL;DR Quick Answer",
      desc: "Short on time? Don't want to read the whole guide? Ask our AI your specific billing question and get an instant answer.",
      placeholder: "e.g., Does 90283 need a modifier?",
      btnText: "Ask AI",
      param: 'note',
      targetTab: 'auto'
    }
  };

  const config = configs[type] || configs.dictionary;

  const handleRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && (window as any).clarity) {
      (window as any).clarity('event', `${type}_cta_clicked`);
    }

    const tab = (config as any).targetTab || type;
    
    if (tab === 'editor_upload') {
      router.push(`/app/editor?action=auto_fill`);
      return;
    }

    if (!(config as any).hideInput && !query.trim()) return;
    router.push(`/app/coding-assistant?tab=${tab}&${config.param}=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="micro-cta-widget" style={{
      background: 'var(--bg-card)',
      border: `1px solid ${type === 'tldr_ai' ? 'rgba(234, 179, 8, 0.4)' : type === 'box24' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
      borderRadius: '12px',
      padding: '20px',
      margin: '32px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {config.icon}
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>{config.title}</h3>
      </div>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>{config.desc}</p>
      
      <form onSubmit={handleRoute} style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
        {!(config as any).hideInput && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={config.placeholder}
            style={{
              flex: 1,
              minWidth: '200px',
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none'
            }}
          />
        )}
        <button type="submit" style={{
          background: type === 'tldr_ai' ? '#eab308' : type === 'box24' ? '#f59e0b' : '#3b82f6',
          color: type === 'tldr_ai' ? '#000' : '#fff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flex: (config as any).hideInput ? 1 : 'none'
        }}>
          {config.btnText}
        </button>
      </form>
    </div>
  );
}
