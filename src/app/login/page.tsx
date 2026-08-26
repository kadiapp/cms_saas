"use client";
import React, { useState } from 'react';
import { supabase } from '@/api/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Icon from 'react-feather';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();

  const handleOAuth = async (provider: 'google' | 'azure') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: \\/app\
        }
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message || \Failed to connect to \\);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isSignUp) {
        if (!acceptedTerms) {
          throw new Error('You must accept the terms and conditions');
        }
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Show success message for email verification
        setSuccess("Account created! You can now log in.");
        setIsSignUp(false); // Switch back to login view automatically
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/app'); // Redirect on successful login
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      
      {/* Left Panel: Social Proof & Features */}
      <div className="login-left-panel">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
          <div style={{ background: '#3b82f6', color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🩺</span>
          </div>
          <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>1500 Claim Billing</span>
        </Link>
        
        <h1>Stop dealing with denied claims.</h1>
        <p>Join thousands of billers and providers who use our AI to automatically fill out and validate CMS-1500 forms.</p>
        
        <div className="login-feature-list">
          <div className="login-feature-item">
            <div className="login-feature-icon"><Icon.Cloud size={20} /></div>
            <div className="login-feature-text">
              <h3>Cloud Sync & Storage</h3>
              <p>Save all your claims and access them from anywhere.</p>
            </div>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-icon"><Icon.Download size={20} /></div>
            <div className="login-feature-text">
              <h3>Export PDF & EDI 837P</h3>
              <p>Download print-ready PDFs and HIPAA compliant 837P files.</p>
            </div>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-icon"><Icon.Shield size={20} /></div>
            <div className="login-feature-text">
              <h3>Real-Time Rules Engine</h3>
              <p>Validate NPIs, CPT codes, and ICD-10s against CMS databases.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="login-right-panel">
        <div className="login-box">
          <div className="login-box-header">
            <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>
              {isSignUp ? 'Start automating your medical billing.' : 'Log in to access your claims.'}
            </p>
          </div>

          <button type="button" className="oauth-btn google" onClick={() => handleOAuth('google')}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          
          <button type="button" className="oauth-btn microsoft" onClick={() => handleOAuth('azure')}>
            <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Continue with Microsoft
          </button>

          <div className="oauth-divider">or continue with email</div>

          <form onSubmit={handleAuth} className="login-form">
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>
            
            {isSignUp && (
              <div className="form-group terms-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required={isSignUp}
                />
                <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  I agree to the <Link href="/privacy" style={{ color: '#3b82f6' }}>Privacy Policy & HIPAA BAA</Link>
                </label>
              </div>
            )}

            {error && <div className="error-message" style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</div>}
            {success && <div className="success-message" style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '16px', background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px' }}>{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary login-submit" style={{ width: '100%', padding: '12px', marginTop: '16px' }}>
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="login-footer" style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
            {isSignUp ? 'Already have an account? ' : 'Need an account? '}
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
