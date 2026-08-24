"use client";

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#1e293b', padding: '40px', borderRadius: '12px', border: '1px solid #334155' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none', marginBottom: 24, fontSize: '0.9rem' }}>
          &larr; Back to Home
        </Link>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#fff' }}>Privacy Policy & HIPAA BAA</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Last Updated: August 2026</p>

        <div style={{ lineHeight: 1.6, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>1. Introduction</h2>
            <p>Welcome to 1500 Claim Billing ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your data, particularly Protected Health Information (PHI) as defined by the Health Insurance Portability and Accountability Act (HIPAA).</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>2. Data Collection and Usage</h2>
            <p>When you use our CMS-1500 medical billing software, you may upload PDFs, text files, or manually enter data containing PHI (e.g., patient names, dates of birth, medical codes). This data is processed strictly for the purpose of validating and formatting your medical claims.</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>3. AI Processing & Third Parties</h2>
            <p>We utilize advanced AI models (such as Google Gemini) to automate data extraction. By using our service, you consent to the transmission of document contents to these trusted third-party subprocessors exclusively for the purpose of data extraction. All data transmitted is encrypted in transit using TLS 1.2+.</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>4. Data Retention</h2>
            <p>Your claim data is saved to your secure account dashboard. You have full rights to delete any claim at any time. When a claim is deleted, the data is permanently removed from our active databases.</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>5. HIPAA Business Associate Agreement (BAA)</h2>
            <p>For covered entities, this agreement serves as an acknowledgment that 1500 Claim Billing utilizes commercially reasonable administrative, physical, and technical safeguards to protect PHI. If you require a signed BAA, please contact our support team before processing live patient data.</p>
          </section>
          
          <hr style={{ borderColor: '#334155', margin: '20px 0' }} />

          <section>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              If you have any questions regarding this policy, please contact us at compliance@cms1500claimbilling.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
