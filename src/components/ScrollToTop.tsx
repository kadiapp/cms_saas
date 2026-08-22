'use client';

import { useState, useEffect } from 'react';
import * as Icon from 'react-feather';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className="scroll-to-top-btn"
      style={{

        position: 'fixed',
        bottom: '40px',
        right: '40px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
        zIndex: 9999,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)'
      }}
      onMouseOver={(e) => {
        if (!isVisible) return;
        e.currentTarget.style.backgroundColor = '#2563eb';
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.15) inset';
      }}
      onMouseOut={(e) => {
        if (!isVisible) return;
        e.currentTarget.style.backgroundColor = '#3b82f6';
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset';
      }}
      aria-label="Scroll to top"
    >
      <Icon.ArrowUp size={24} />
    </button>
  );
}
