'use client';

import Link from 'next/link';
import TopNav from '@/components/TopNav';
import * as Icon from 'react-feather';

export default function NotFound() {
  return (
    <>
      <TopNav />
      <div 
        style={{ 
          minHeight: 'calc(100vh - 70px)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <div 
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '24px',
            borderRadius: '50%',
            marginBottom: '32px',
            display: 'inline-flex',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.1)'
          }}
        >
          <Icon.MapPin size={48} color="#3b82f6" />
        </div>
        
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', color: '#f8fafc', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          404
        </h1>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '24px' }}>
          Page not found
        </h2>
        
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 40px', lineHeight: '1.6', fontSize: '1.1rem' }}>
          We searched everywhere, but the page you're looking for doesn't exist or has been moved.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" passHref>
            <button 
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              <Icon.ArrowLeft size={18} />
              Return Home
            </button>
          </Link>
          
          <Link href="/blog" passHref>
            <button 
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <Icon.BookOpen size={18} />
              Knowledge Base
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
