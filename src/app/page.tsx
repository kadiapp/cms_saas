import './landing.css';
import TopNav from '@/components/TopNav';
import Link from 'next/link';
import * as Icon from 'react-feather';

export default function Home() {
  return (
    <div className="landing-page">
      <TopNav />
      
      <main className="landing-hero">
        <div className="landing-glow" />

        <div className="landing-badge">
          <Icon.Zap size={13} />
          <span>1500 Claim Billing 2.0 is Live</span>
        </div>
        
        <h1 className="landing-headline">
          The Modern OS for <br/>
          <span className="landing-headline-accent">Medical Billing</span>
        </h1>
        
        <p className="landing-subheading">
          Validate CMS-1500 forms instantly. Eliminate rejections with real-time payer rules. Turn any medical document into a completed claim in seconds with AI.
        </p>
        
        <div className="landing-ctas">
          <Link href="/app/editor" className="landing-btn-primary">
            <Icon.Edit3 size={20} />
            Launch the Editor
          </Link>
          <Link href="/blog" className="landing-btn-secondary">
            <Icon.BookOpen size={20} />
            Read the Guides
          </Link>
        </div>

        <div className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              <Icon.Cpu size={28} />
            </div>
            <div className="landing-feature-title">AI Document Auto-Fill</div>
            <div className="landing-feature-desc">Stop typing. Upload a superbill, patient intake form, or clinical note, and our AI instantly extracts the data and auto-fills the 33-box CMS-1500 form with pinpoint accuracy.</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon green">
              <Icon.CheckCircle size={28} />
            </div>
            <div className="landing-feature-title">Instant Claim Validation</div>
            <div className="landing-feature-desc">A built-in medical coder watching your back. Automatically catch missing NPIs, incorrect ICD-10 codes, and formatting errors in real-time before you submit.</div>
          </div>
          
          <div className="landing-feature-card">
            <div className="landing-feature-icon blue">
              <Icon.Database size={28} />
            </div>
            <div className="landing-feature-title">NCCI Payer Rules Engine</div>
            <div className="landing-feature-desc">Guarantee your claim is accepted on the first try. We tap into a massive database of Medicare NCCI edits and payer-specific clinical rules to flag conflicts instantly.</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon purple">
              <Icon.MessageSquare size={28} />
            </div>
            <div className="landing-feature-title">AI Coding Assistant</div>
            <div className="landing-feature-desc">Don't guess on modifiers. Describe the patient encounter to our AI assistant and get the exact ICD-10 and CPT codes you need, backed by our 470+ expert guides.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
