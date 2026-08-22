'use client';

import { useState, useEffect } from 'react';
import * as Icon from 'react-feather';

type Heading = {
  id: string;
  text: string;
  level: number;
};

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Wait for the server component HTML to fully paint
    setTimeout(() => {
      const articleContent = document.querySelector('.blog-article-content');
      if (!articleContent) return;

      const elements = Array.from(articleContent.querySelectorAll('h2, h3'));
      const newHeadings: Heading[] = [];

      elements.forEach((el, index) => {
        // WordPress usually generates IDs, but if it doesn't, we make one
        if (!el.id) {
          el.id = el.textContent?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `heading-${index}`;
        }
        newHeadings.push({
          id: el.id,
          text: el.textContent || '',
          level: el.tagName === 'H2' ? 2 : 3
        });
      });

      setHeadings(newHeadings);
    }, 100);

    // Track which heading is currently active while scrolling
    const callback = (entries: IntersectionObserverEntry[]) => {
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length > 0) {
        // Find the topmost visible heading
        visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveId(visibleEntries[0].target.id);
      }
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: '-80px 0px -60% 0px' // Adjust offsets for the TopNav
    });

    setTimeout(() => {
      document.querySelectorAll('.blog-article-content h2, .blog-article-content h3').forEach((h) => observer.observe(h));
    }, 200);

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '40px',
      maxWidth: '600px'
    }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '600' }}>
          <Icon.List size={18} color="#3b82f6" />
          Table of Contents
        </div>
        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <Icon.ChevronUp size={20} /> : <Icon.ChevronDown size={20} />}
        </div>
      </div>
      
      {isExpanded && (
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: '20px 0 0 0', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          {headings.map((h, i) => (
            <li key={i} style={{ paddingLeft: h.level === 3 ? '24px' : '0' }}>
              <a 
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(h.id);
                  if (target) {
                    // Smooth scroll accounting for sticky topnav offset
                    const y = target.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                  setActiveId(h.id);
                }}
                style={{
                  color: activeId === h.id ? '#3b82f6' : '#94a3b8',
                  textDecoration: 'none',
                  fontSize: h.level === 2 ? '0.95rem' : '0.85rem',
                  fontWeight: activeId === h.id ? '600' : '400',
                  transition: 'color 0.2s',
                  display: 'block',
                  lineHeight: '1.4'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                onMouseOut={(e) => {
                  if (activeId !== h.id) e.currentTarget.style.color = '#94a3b8';
                }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
