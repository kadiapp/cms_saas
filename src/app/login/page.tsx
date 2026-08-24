"use client";
import React, { useState } from 'react';
import { supabase } from '@/api/supabase';
import { useRouter } from 'next/navigation';
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created successfully! Please check your email for a confirmation link to activate your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/app';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ width: '100%' }}>
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🩺</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>1500 Claim Billing</h1>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontSize: '1.2rem' }}>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{success}</div>}
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#94a3b8' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="login-input" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#94a3b8' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="login-input" />
          </div>
          {isSignUp && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
              <input 
                type="checkbox" 
                id="terms" 
                checked={acceptedTerms} 
                onChange={e => setAcceptedTerms(e.target.checked)} 
                required={isSignUp}
                style={{ marginTop: 4 }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                I have read and agree to the <a href="/privacy" target="_blank" style={{ color: '#3b82f6', textDecoration: 'none' }}>Privacy Policy & HIPAA BAA</a> and consent to securely processing PHI.
              </label>
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, marginTop: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.95rem', color: '#94a3b8' }}>
          {isSignUp ? 'Already have an account?' : 'Need an account?'} 
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginLeft: 8, fontSize: '0.95rem' }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
