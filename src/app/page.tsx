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
          Validate CMS-1500 forms instantly. Eliminate rejections with real-time payer rules. Master compliance with our massive knowledge base.
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
            <div className="landing-feature-icon green">
              <Icon.CheckCircle size={28} />
            </div>
            <div className="landing-feature-title">Instant Validation</div>
            <div className="landing-feature-desc">Automatically catch missing NPIs, incorrect ICD-10 codes, and formatting errors before you submit.</div>
          </div>
          
          <div className="landing-feature-card">
            <div className="landing-feature-icon blue">
              <Icon.Database size={28} />
            </div>
            <div className="landing-feature-title">Payer Rules Engine</div>
            <div className="landing-feature-desc">Tap into our massive database of specific payer rules to guarantee your claim is accepted on the first try.</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon purple">
              <Icon.Search size={28} />
            </div>
            <div className="landing-feature-title">470+ Expert Guides</div>
            <div className="landing-feature-desc">Search our built-in knowledge base for any question regarding the CMS-1500 form or medical coding.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
