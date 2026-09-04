"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import * as Icon from 'react-feather';
import { supabase } from '@/api/supabase';
import './TopNav.css';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className={`topnav ${isMobileMenuOpen ? 'mobile-expanded' : ''}`}>
      <div className="topnav-inner">
        {/* Brand / Logo */}
        <div className="topnav-brand" onClick={() => { closeMenu(); router.push('/app'); }} role="button" tabIndex={0}>
          <div className="topnav-logo-icon">🩺</div>
          <div className="topnav-brand-text">
            <div className="topnav-logo-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              1500 Claim Billing
              <span style={{ 
                fontSize: '0.65rem', 
                background: 'rgba(59, 130, 246, 0.2)', 
                color: '#60a5fa', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>BETA</span>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button className="topnav-hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          {isMobileMenuOpen ? <Icon.X size={24} /> : <Icon.Menu size={24} />}
        </button>

        {/* Navigation Links */}
        <nav className={`topnav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link href="/app" className={`topnav-link ${pathname === '/app' ? 'active' : ''}`} onClick={closeMenu}>
            <Icon.Grid size={16} />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/app/editor" 
            className={`topnav-link ${pathname === '/app/editor' ? 'active' : ''}`} 
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).clarity) {
                (window as any).clarity('event', 'ai_autofill_nav_clicked');
              }
              closeMenu();
            }}
          >
            <Icon.Edit3 size={16} />
            <span>AI Auto-Fill</span>
          </Link>
          <Link href="/app/coding-assistant" className={`topnav-link ${pathname === '/app/coding-assistant' ? 'active' : ''}`} onClick={closeMenu}>
            <Icon.Activity size={16} />
            <span>Assistant</span>
          </Link>
          <Link href="/blog" className={`topnav-link ${pathname === '/blog' || pathname.startsWith('/blog/') ? 'active' : ''}`} onClick={closeMenu}>
            <Icon.FileText size={16} />
            <span>Guides</span>
          </Link>
          
          <Link href="/app/settings" className={`topnav-link ${pathname === '/app/settings' ? 'active' : ''}`} onClick={closeMenu}>
            <Icon.Settings size={16} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* User / Actions */}
        <div className={`topnav-actions ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {user ? (
            <button className="btn-signout" onClick={async (e) => {
              e.preventDefault();
              try {
                await supabase.auth.signOut();
              } catch (err) {
                console.error('Sign out error:', err);
              } finally {
                closeMenu();
                window.location.href = '/';
              }
            }}>
              <Icon.LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link href="/login" className="btn-signout" style={{ color: '#3b82f6' }} onClick={closeMenu}>
              <Icon.LogIn size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

