'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Mic,
  FileText,
  Zap,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  Download,
  Users,
  Clock,
} from 'lucide-react';
import './mobile-app.css';

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="phone-img-frame">
      <div className="phone-img-notch" />
      <Image src={src} alt={alt} fill className="phone-img-screenshot" sizes="(max-width: 768px) 280px, 320px" priority />
    </div>
  );
}

const FEATURES = [
  { num: '01', icon: Mic, title: 'Voice Recording', desc: 'One tap to record any care assessment — in person or over the phone. AI handles the rest.' },
  { num: '02', icon: Zap, title: 'AI Transcription', desc: 'Instant transcription with automatic speaker identification powered by Deepgram Nova-3.' },
  { num: '03', icon: FileText, title: 'Smart Contracts', desc: 'AI generates complete care plans and service agreements in seconds, not hours.' },
  { num: '04', icon: Shield, title: 'HIPAA Compliant', desc: 'Enterprise-grade security with 256-bit encryption. Your data never leaves your control.' },
];

const STATS = [
  { value: '3h+', label: 'Saved Daily', icon: Clock },
  { value: '60+', label: 'Agencies on Waitlist', icon: Users },
  { value: '5★', label: 'Caregiver Rating', icon: Star },
  { value: '10s', label: 'Contract Generation', icon: Zap },
];

export default function MobileAppPage() {
  return (
    <div className="ma-page">
      {/* ── Sticky top nav ── */}
      <nav className="ma-topnav">
        <div className="ma-topnav-inner">
          <Link href="/" className="ma-topnav-brand">
            <div className="ma-topnav-logo">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={22} height={22} style={{ objectFit: 'contain' }} />
            </div>
            <span className="ma-topnav-name">PalmCare AI</span>
          </Link>
          <div className="ma-topnav-links">
            <Link href="/" className="ma-topnav-link">Home</Link>
            <Link href="/features" className="ma-topnav-link">Features</Link>
            <Link href="/mobile-app" className="ma-topnav-link ma-topnav-link--active">Mobile App</Link>
            <a href="/#book-demo" className="ma-topnav-link">Demo</a>
          </div>
          <div className="ma-topnav-actions">
            <Link href="/login" className="ma-topnav-link">Sign In</Link>
            <a href="/#book-demo" className="ma-topnav-cta-btn">Schedule Demo</a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — text left, phone right ═══ */}
      <section className="ma-hero">
        <div className="ma-hero-inner">
          <div className="ma-hero-text">
            <div className="pg-chip"><div className="pg-chip-dot" /><span>Available on iOS</span></div>
            <h1 className="ma-hero-h1">
              Care Assessments,<br />
              <em>All in Your Palm.</em>
            </h1>
            <p className="ma-hero-sub">
              Record it. Transcribe it. Contract it. PalmCare AI turns every assessment into a signed contract — automatically. One tap. AI handles the rest.
            </p>
            <div className="ma-hero-btns">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="ma-appstore-btn">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                <div>
                  <span className="ma-appstore-small">Download on the</span>
                  <span className="ma-appstore-big">App Store</span>
                </div>
              </a>
              <a href="/#book-demo" className="ma-demo-btn">Schedule a Demo <ArrowRight size={16} /></a>
            </div>
            <div className="ma-hero-trust">
              <div className="ma-trust-badge ma-trust-hipaa">🛡️ HIPAA Compliant</div>
              <div className="ma-trust-badge ma-trust-encrypt">🔒 256-bit Encrypted</div>
            </div>
          </div>
          <div className="ma-hero-phone-wrap">
            <PhoneFrame src="/screenshots/ios/00_landing.png" alt="PalmCare AI landing screen" />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="ma-stats-section">
        <div className="ma-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="ma-stat-item">
              <div className="ma-stat-ico"><s.icon size={20} /></div>
              <div className="ma-stat-val">{s.value}</div>
              <div className="ma-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="ma-features-section">
        <div className="ma-features-inner">
          <div className="ma-section-badge">Why PalmCare AI</div>
          <h2 className="ma-section-title">
            Powerful Features<br />for Your <em>Next Assessment</em>
          </h2>
          <div className="ma-features-grid">
            {FEATURES.map((f) => (
              <div key={f.num} className="ma-feature-card">
                <div className="ma-feature-num">{f.num}</div>
                <div className="ma-feature-ico"><f.icon size={22} /></div>
                <h3 className="ma-feature-title">{f.title}</h3>
                <p className="ma-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ APP INTERFACE SHOWCASE ═══ */}
      <section className="ma-showcase-section">
        <div className="ma-showcase-inner">
          <div className="ma-section-badge">App Interface</div>
          <h2 className="ma-section-title">
            Designed for <em>Care Professionals</em>
          </h2>
          <p className="ma-section-sub">
            An intuitive mobile experience built from the ground up for home care workflows.
          </p>
          <div className="ma-showcase-phones">
            <div className="ma-showcase-col">
              <PhoneFrame src="/screenshots/ios/01_home.png" alt="PalmCare AI home dashboard" />
              <div className="sc-lbl">Dashboard</div>
            </div>
            <div className="ma-showcase-col ma-showcase-hero">
              <PhoneFrame src="/screenshots/ios/03_record.png" alt="PalmCare AI recording screen" />
              <div className="sc-lbl">Palm It</div>
            </div>
            <div className="ma-showcase-col">
              <PhoneFrame src="/screenshots/ios/02_clients.png" alt="PalmCare AI clients list" />
              <div className="sc-lbl">Clients</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY PALMCARE — text left, phone right ═══ */}
      <section className="ma-why-section">
        <div className="ma-why-inner">
          <div className="ma-why-text">
            <div className="ma-section-badge">Built for Care</div>
            <h2 className="ma-section-title" style={{ textAlign: 'left' }}>
              Why Agencies Are<br />Choosing to <em>Palm It</em>
            </h2>
            <p className="ma-why-desc">
              PalmCare AI is the first AI-native documentation platform built specifically for home care. Not adapted from generic software — purpose-built for how you work.
            </p>
            <div className="ma-why-checks">
              {[
                'One tap to record any assessment — in person or over the phone',
                'AI generates contracts in seconds, not hours',
                'Full client CRM with caregiver coordination',
                'Works offline — syncs when connected',
              ].map((item) => (
                <div key={item} className="ma-why-check">
                  <CheckCircle size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="ma-why-btns">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="ma-demo-btn">
                <Download size={16} /> Download App
              </a>
              <a href="/#book-demo" className="ma-why-ghost">Watch Tutorial <ArrowRight size={14} /></a>
            </div>
          </div>
          <div className="ma-why-phone-wrap">
            <PhoneFrame src="/screenshots/ios/07_contract.png" alt="PalmCare AI contract view" />
          </div>
        </div>
      </section>

      {/* ═══ DOWNLOAD CTA ═══ */}
      <section className="ma-download-section">
        <div className="ma-download-inner">
          <div className="ma-download-badge">
            <div className="pg-chip-dot" />
            <span>Download Now</span>
          </div>
          <h2 className="ma-download-title">Ready to <em>Palm It?</em></h2>
          <p className="ma-download-sub">
            Care professionals are saving 3+ hours every day with PalmCare AI. Close faster. Document smarter. Never lose a client to paperwork again.
          </p>
          <div className="ma-download-btns">
            <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="ma-appstore-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
              <div>
                <span className="ma-appstore-small">Download on the</span>
                <span className="ma-appstore-big">App Store</span>
              </div>
            </a>
            <a href="/#book-demo" className="ma-demo-btn">Schedule a Demo <ArrowRight size={16} /></a>
          </div>
          <div className="ma-download-trust">
            <span className="ma-trust-badge ma-trust-hipaa">🛡️ HIPAA Compliant</span>
            <span className="ma-trust-badge ma-trust-encrypt">🔒 256-bit Encrypted</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ma-footer">
        <div className="ma-footer-inner">
          <div className="ma-footer-brand">
            <div className="ma-topnav-logo">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={22} height={22} style={{ objectFit: 'contain' }} />
            </div>
            <span className="ma-footer-name">PalmCare AI</span>
          </div>
          <div className="ma-footer-links">
            <Link href="/">Home</Link>
            <Link href="/features">Features</Link>
            <Link href="/mobile-app">Mobile App</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <p className="ma-footer-copy">© 2026 PalmCare AI (Palm Technologies Inc). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
