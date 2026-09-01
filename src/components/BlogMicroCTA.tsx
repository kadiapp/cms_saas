"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

interface BlogMicroCTAProps {
  type: 'ncci' | 'mednec' | 'dictionary';
  defaultCode?: string;
}

export default function BlogMicroCTA({ type, defaultCode = '' }: BlogMicroCTAProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultCode);

  const configs = {
    ncci: {
      icon: <Icon.Shield size={20} color="#3b82f6" />,
      title: "Check NCCI Edits Instantly",
      desc: "Not sure if these codes bundle? Check the 2025 Medicare NCCI database before you bill.",
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
    }
  };

  const config = configs[type] || configs.dictionary;

  const handleRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/app/coding-assistant?tab=${type}&${config.param}=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="micro-cta-widget" style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
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
        <button type="submit" style={{
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}>
          {config.btnText}
        </button>
      </form>
    </div>
  );
}
