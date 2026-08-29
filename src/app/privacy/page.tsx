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
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>3. "Zero Data Retention" AI Processing</h2>
            <p>Our platform uses advanced Artificial Intelligence (the "AI Auto-Coder") to extract medical concepts from your operative notes. We maintain a strict <strong>Zero Data Retention policy</strong> for all AI endpoints. Specifically:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1' }}>
              <li><strong>No Model Training:</strong> Your clinical notes and Protected Health Information (PHI) are <strong>never</strong> used to train, fine-tune, or improve our AI models or third-party AI models.</li>
              <li><strong>Stateless Processing:</strong> Text submitted to the AI Auto-Coder is processed in memory and discarded immediately upon returning the suggested codes. We do not store your raw clinical notes in our databases unless you explicitly choose to save a claim.</li>
              <li><strong>Encrypted Pipelines:</strong> All data sent to our enterprise AI subprocessors is transmitted via secure, encrypted channels (TLS 1.2+) under strict enterprise confidentiality agreements.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>4. Data Retention & Your Dashboard</h2>
            <p>If you choose to export your codes into a CMS-1500 claim form on your dashboard, that claim data is saved to your secure, encrypted database instance. You maintain absolute control over this data. You have full rights to permanently delete any claim, patient profile, or billing record at any time.</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>5. HIPAA Compliance & Business Associate Agreement (BAA)</h2>
            <p>We built this platform from the ground up for healthcare professionals. 1500 Claim Billing implements commercially reasonable administrative, physical, and technical safeguards in compliance with HIPAA guidelines.</p>
            <p style={{ marginTop: '8px' }}>For clinics, hospitals, and medical billing agencies (Covered Entities), we offer a formalized <strong>Business Associate Agreement (BAA)</strong>. Executing a BAA with us ensures that utilizing our AI Auto-Coder is legally compliant for your organization. Please contact our compliance team to execute a signed BAA before submitting live PHI.</p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>6. Data Source Attributions & Copyrights</h2>
            <p>Our platform aggregates medical coding rules and reference data from authoritative bodies to provide real-time validation. By using this software, you acknowledge the following data sources and their respective copyrights:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#94a3b8' }}>
              <li><strong>American Medical Association (AMA):</strong> CPT® (Current Procedural Terminology) codes, descriptions, and other data are copyright of the American Medical Association. All rights reserved. CPT is a registered trademark of the AMA.</li>
              <li><strong>Centers for Medicare & Medicaid Services (CMS):</strong> NCCI (National Correct Coding Initiative) Edits, Clinical Rules, Physician Fee Schedules, and ICD-10-CM code sets are public domain data provided by CMS.gov.</li>
              <li><strong>NPPES:</strong> National Provider Identifier (NPI) verification utilizes the public NPPES API endpoint.</li>
            </ul>
          </section>
          
          <hr style={{ borderColor: '#334155', margin: '20px 0' }} />

          <section>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              If you have any questions regarding this policy, please contact us at contact@cms1500claimbilling.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


