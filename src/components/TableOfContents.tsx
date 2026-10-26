'use client';

import { useState, useEffect, useRef } from 'react';
import * as Icon from 'react-feather';

type Heading = {
  id: string;
  text: string;
  el: HTMLElement;
};

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const elementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const articleContent = document.querySelector('.blog-article-content');
      if (!articleContent) return;

      // Only grab top-level H2 sections (ignore H3 sub-items and injected CTA headers)
      const elements = Array.from(articleContent.querySelectorAll('h2')) as HTMLElement[];
      const newHeadings: Heading[] = [];

      elements.forEach((el, index) => {
        if (el.closest('.micro-cta-widget')) return;
        const text = (el.textContent || '').trim();
        if (!text) return;
        if (!el.id) {
          el.id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${index}`;
        }
        el.style.scrollMarginTop = '96px';
        newHeadings.push({
          id: el.id,
          text,
          el
        });
      });

      elementsRef.current = newHeadings.map(h => h.el);
      setHeadings(newHeadings);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (headings.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.45)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '14px 20px',
      marginBottom: '28px'
    }}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: '#f8fafc'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.95rem' }}>
          <Icon.List size={18} color="#3b82f6" />
          <span>Table of Contents</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>
            ({headings.length} sections)
          </span>
        </div>
        <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? <Icon.ChevronUp size={18} /> : <Icon.ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: '16px 0 4px 0',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '10px 24px'
        }}>
          {headings.map((h, i) => (
            <li key={i}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  h.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveId(h.id);
                }}
                style={{
                  color: activeId === h.id ? '#3b82f6' : '#cbd5e1',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: activeId === h.id ? 600 : 400,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  lineHeight: 1.4
                }}
              >
                <span style={{ color: '#3b82f6', fontSize: '0.78rem', fontFamily: 'monospace' }}>{i + 1}.</span>
                <span>{h.text}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
