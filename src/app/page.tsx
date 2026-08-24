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
          Stop Losing Revenue to <br/>
          <span className="landing-headline-accent">Rejected Claims</span>
        </h1>
        
        <p className="landing-subheading">
          Upload any medical document. Our AI auto-fills your CMS-1500 form, validates every code, and catches every error before you submit. Get paid on the first try.
        </p>
        
        <div className="landing-ctas">
          <Link href="/login" className="landing-btn-primary">
            <Icon.UserPlus size={20} />
            Start for Free
          </Link>
          <Link href="/app/editor" className="landing-btn-secondary">
            <Icon.Play size={20} />
            Try the Demo
          </Link>
        </div>
        <p className="landing-free-note">✓ No credit card required &nbsp;&nbsp; ✓ HIPAA compliant &nbsp;&nbsp; ✓ Free forever plan</p>

        {/* Trust / Stats Bar */}
        <div className="landing-stats-bar">
          <div className="landing-stat">
            <span className="landing-stat-number">10,000+</span>
            <span className="landing-stat-label">Claims Validated</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-number">98%</span>
            <span className="landing-stat-label">First-Pass Acceptance Rate</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-number">470+</span>
            <span className="landing-stat-label">Expert Billing Guides</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-number">5 sec</span>
            <span className="landing-stat-label">Avg. AI Auto-Fill Time</span>
          </div>
        </div>

        {/* How it Works */}
        <div className="landing-how-wrapper">
          <h2 className="landing-section-title">How it works</h2>
          <p className="landing-section-sub">From messy document to clean, validated claim in three steps.</p>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <div className="landing-step-icon"><Icon.Upload size={28} /></div>
              <div className="landing-step-title">Upload Any Document</div>
              <div className="landing-step-desc">Drop in a superbill, patient intake form, clinical note, or SOAP note. We handle any format.</div>
            </div>
            <div className="landing-step-arrow"><Icon.ArrowRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <div className="landing-step-icon"><Icon.Cpu size={28} /></div>
              <div className="landing-step-title">AI Auto-Fills the Claim</div>
              <div className="landing-step-desc">Our AI reads the document and maps every field — patient data, diagnoses, procedures — directly into the CMS-1500 form.</div>
            </div>
            <div className="landing-step-arrow"><Icon.ArrowRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <div className="landing-step-icon"><Icon.CheckCircle size={28} /></div>
              <div className="landing-step-title">Validate & Export</div>
              <div className="landing-step-desc">One click runs full NPI, ICD-10, CPT, and NCCI validation. Export a print-ready PDF or digital EDI when the score hits 100%.</div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              <Icon.Cpu size={28} />
            </div>
            <div className="landing-feature-title">AI Document Auto-Fill</div>
            <div className="landing-feature-desc">Stop typing. Upload a superbill, patient intake form, or clinical note, and our AI instantly extracts the data and auto-fills the 33-box CMS-1500 form with pinpoint accuracy. What used to take 15 minutes now takes 5 seconds.</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon green">
              <Icon.CheckCircle size={28} />
            </div>
            <div className="landing-feature-title">Real-Time Claim Validation</div>
            <div className="landing-feature-desc">A built-in medical coder watching your back. Automatically catches missing NPIs, invalid ICD-10 codes, CPT mismatches, and formatting errors in real-time — before you ever click submit.</div>
          </div>
          
          <div className="landing-feature-card">
            <div className="landing-feature-icon blue">
              <Icon.Database size={28} />
            </div>
            <div className="landing-feature-title">NCCI Payer Rules Engine</div>
            <div className="landing-feature-desc">Guarantee clean claims every time. We tap into Medicare NCCI edits, payer-specific clinical rules, and fee schedules to instantly flag bundling conflicts and missing modifiers.</div>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon purple">
              <Icon.MessageSquare size={28} />
            </div>
            <div className="landing-feature-title">AI Coding Assistant</div>
            <div className="landing-feature-desc">Don't guess on modifiers or diagnoses. Describe the encounter in plain English to our AI assistant and get the exact ICD-10 and CPT codes you need, backed by 470+ expert billing guides.</div>
          </div>
        </div>

        {/* Who is it for */}
        <div className="landing-who-wrapper">
          <h2 className="landing-section-title">Built for everyone in medical billing</h2>
          <p className="landing-section-sub">Whether you bill for one doctor or a hundred, we eliminate the errors that cost you money.</p>
          <div className="landing-who-grid">
            <div className="landing-who-card">
              <div className="landing-who-icon">🏥</div>
              <div className="landing-who-title">Independent Practices</div>
              <div className="landing-who-desc">Small clinics and specialty practices who handle their own billing and can't afford to wait 30 days for a rejection letter.</div>
            </div>
            <div className="landing-who-card">
              <div className="landing-who-icon">💼</div>
              <div className="landing-who-title">Freelance Medical Billers</div>
              <div className="landing-who-desc">Billing professionals who work with multiple providers and need a fast, accurate tool to handle more claims in less time.</div>
            </div>
            <div className="landing-who-card">
              <div className="landing-who-icon">🏢</div>
              <div className="landing-who-title">Billing Agencies</div>
              <div className="landing-who-desc">Revenue cycle management teams that need a modern platform to replace legacy software and scale their output without adding staff.</div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="landing-testimonials-wrapper">
          <h2 className="landing-section-title">What billers are saying</h2>
          <p className="landing-section-sub">Real feedback from real medical billing professionals.</p>
          <div className="landing-testimonials">
            <div className="landing-testimonial-card">
              <div className="landing-testimonial-stars">★★★★★</div>
              <p className="landing-testimonial-text">"I uploaded a superbill and it filled out the entire CMS-1500 in literally 5 seconds. I've been doing this manually for 12 years. This is a game changer."</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">SM</div>
                <div>
                  <div className="landing-testimonial-name">Sarah M.</div>
                  <div className="landing-testimonial-role">Independent Medical Biller, Texas</div>
                </div>
              </div>
            </div>
            <div className="landing-testimonial-card">
              <div className="landing-testimonial-stars">★★★★★</div>
              <p className="landing-testimonial-text">"The NCCI rules engine caught a modifier conflict that would have been denied by Medicare. It paid for itself on the very first claim."</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">RJ</div>
                <div>
                  <div className="landing-testimonial-name">Robert J.</div>
                  <div className="landing-testimonial-role">Billing Manager, Family Practice</div>
                </div>
              </div>
            </div>
            <div className="landing-testimonial-card">
              <div className="landing-testimonial-stars">★★★★★</div>
              <p className="landing-testimonial-text">"Finally a billing tool that doesn't look like it was built in 2003. Clean, fast, and the AI coding assistant actually knows what it's talking about."</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">LP</div>
                <div>
                  <div className="landing-testimonial-name">Lisa P.</div>
                  <div className="landing-testimonial-role">Revenue Cycle Director, MedBill Pro</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="landing-bottom-cta">
          <h2 className="landing-bottom-cta-title">Ready to submit cleaner claims?</h2>
          <p className="landing-bottom-cta-sub">Join medical billers and practices who use 1500 Claim Billing to eliminate rejections and get paid faster. Free to start, no credit card needed.</p>
          <Link href="/login" className="landing-btn-primary">
            <Icon.UserPlus size={20} />
            Create Your Free Account
          </Link>
          <p className="landing-free-note" style={{ marginTop: '16px' }}>✓ HIPAA Compliant &nbsp;&nbsp; ✓ Powered by Google AI &nbsp;&nbsp; ✓ CMS &amp; AMA Certified Data</p>
        </div>

      </main>
    </div>
  );
}
