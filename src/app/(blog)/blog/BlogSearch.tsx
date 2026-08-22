"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from 'react-feather';

export default function BlogSearch({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/blog?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/blog');
    }
  };

  return (
    <form onSubmit={handleSearch} style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 40px auto', width: '100%' }}>
      <Icon.Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
      <input
        type="text"
        placeholder="Search articles, guides, and payer rules..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '16px 24px 16px 48px',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(15, 23, 42, 0.6)',
          color: '#fff',
          fontSize: '1.05rem',
          outline: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease'
        }}
        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
      <button 
        type="submit" 
        style={{ 
          position: 'absolute', 
          right: '8px', 
          top: '8px', 
          bottom: '8px', 
          background: '#3b82f6', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '999px', 
          padding: '0 20px', 
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Search
      </button>
    </form>
  );
}
