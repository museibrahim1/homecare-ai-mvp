'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  Mic,
  Mail,
  Lock,
  Eye,
  ArrowLeft,
  User,
  Briefcase,
  Phone,
  ShieldCheck,
  Users,
  CalendarCheck,
  Clock,
  Home,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
} from 'lucide-react';
import './mobile-app.css';

function LandingScreen() {
  return (
    <div className="s-land">
      <div className="land-bg" />
      <div className="land-grad" />
      <div className="land-tint" />

      <div className="live-badge">
        <div className="live-dot" />
        <span className="live-txt">LIVE</span>
      </div>

      <div className="land-wave">
        {Array.from({ length: 17 }).map((_, i) => (
          <div key={i} className="wvb" />
        ))}
      </div>

      <div className="land-body">
        <div className="land-brand-row">
          <div className="land-ico"><Mic size={19} color="white" /></div>
          <span className="land-name">PalmCare AI</span>
          <div className="land-pill-badge">AI-Powered</div>
        </div>

        <div className="land-slogan">PALM<em>IT.</em></div>

        <div className="land-sub">
          <strong>Record. Transcribe. Contract.</strong><br />
          Every care assessment — handled in seconds. Your clients get proposals. You get your time back.
        </div>

        <div className="land-dots">
          <div className="ldot ldot-on" />
          <div className="ldot ldot-off" />
          <div className="ldot ldot-off" />
        </div>

        <button className="land-cta">Palm It — Get Started</button>
        <button className="land-ghost">Already have an account? Sign in →</button>
      </div>
    </div>
  );
}

function SignInScreen() {
  return (
    <div className="s-auth">
      <div className="auth-brand-moment">
        <div className="auth-logo-row">
          <div className="auth-logo-ico"><Mic size={22} color="white" /></div>
          <div>
            <div className="auth-logo-name">PalmCare AI</div>
            <div className="auth-logo-tag">Where care meets intelligence</div>
          </div>
        </div>

        <div className="auth-slogan">Welcome<br />back. Let&apos;s<br /><em>Palm It.</em></div>

        <div className="auth-brand-line" style={{ marginTop: 8 }}>
          Every assessment you record, every contract you generate — it all starts here. <strong>Your next client is waiting.</strong>
        </div>
      </div>

      <div className="auth-section-div">
        <div className="asd-line" />
        <span className="asd-txt">Sign in to your account</span>
        <div className="asd-line" />
      </div>

      <div className="fg">
        <label className="fl">Email address</label>
        <div className="fi-wrap">
          <span className="fi-l"><Mail size={15} /></span>
          <input className="fi" type="text" placeholder="you@example.com" readOnly />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Password</label>
        <div className="fi-wrap">
          <span className="fi-l"><Lock size={15} /></span>
          <input className="fi" type="password" placeholder="Enter your password" readOnly />
          <span className="fi-r"><Eye size={15} /></span>
        </div>
      </div>

      <div className="opts-row">
        <div className="chk-row">
          <div className="chk-box" />
          <span className="chk-lbl">Keep me signed in</span>
        </div>
        <span className="a-link">Forgot password?</span>
      </div>

      <button className="ma-btn-primary">Sign In &amp; Palm It</button>

      <div className="div-row">
        <div className="div-line" />
        <span className="div-txt">or sign in with</span>
        <div className="div-line" />
      </div>

      <button className="btn-soc"><div className="g-ico">G</div>Continue with Google</button>
      <button className="btn-soc"><div className="a-ico">&#xf8ff;</div>Continue with Apple</button>

      <div className="foot-txt">New to PalmCare? <span className="a-link">Create your account →</span></div>

      <div className="auth-brand-strip">
        <div className="abs-dot" />
        <span className="abs-txt">PalmCare AI · Built for care professionals</span>
        <div className="abs-dot" />
      </div>
    </div>
  );
}

function RegisterScreen() {
  return (
    <div className="s-auth">
      <div className="back-btn"><ArrowLeft size={15} /></div>

      <div className="auth-brand-moment">
        <div className="auth-logo-row">
          <div className="auth-logo-ico"><Mic size={22} color="white" /></div>
          <div>
            <div className="auth-logo-name">PalmCare AI</div>
            <div className="auth-logo-tag">Where care meets intelligence</div>
          </div>
        </div>

        <div className="auth-slogan">Join the<br />pros who<br /><em>Palm It.</em></div>

        <div className="auth-brand-line" style={{ marginTop: 8 }}>
          Thousands of care professionals use PalmCare AI to <strong>close faster, document smarter,</strong> and never lose a client to paperwork again.
        </div>
      </div>

      <div className="auth-section-div">
        <div className="asd-line" />
        <span className="asd-txt">Create your free account</span>
        <div className="asd-line" />
      </div>

      <div className="fg">
        <label className="fl">Full Name</label>
        <div className="fi-wrap">
          <span className="fi-l"><User size={15} /></span>
          <input className="fi" type="text" placeholder="John Doe" readOnly />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Business Name <span className="fl-opt">(optional)</span></label>
        <div className="fi-wrap">
          <span className="fi-l"><Briefcase size={15} /></span>
          <input className="fi" type="text" placeholder="Your agency name" readOnly />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Email address</label>
        <div className="fi-wrap">
          <span className="fi-l"><Mail size={15} /></span>
          <input className="fi" type="text" placeholder="john@example.com" readOnly />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Phone Number</label>
        <div className="fi-wrap">
          <span className="fi-l"><Phone size={15} /></span>
          <input className="fi" type="text" placeholder="(555) 123-4567" readOnly />
        </div>
      </div>

      <div className="fg">
        <label className="fl">Password</label>
        <div className="fi-wrap">
          <span className="fi-l"><Lock size={15} /></span>
          <input className="fi" type="password" placeholder="Create a password" readOnly />
        </div>
      </div>

      <div className="fg" style={{ marginBottom: 18 }}>
        <label className="fl">Confirm Password</label>
        <div className="fi-wrap">
          <span className="fi-l"><ShieldCheck size={15} /></span>
          <input className="fi" type="password" placeholder="Confirm your password" readOnly />
        </div>
      </div>

      <button className="ma-btn-primary">Create Account — Palm It</button>
      <div className="foot-txt" style={{ marginTop: 10 }}>Already a pro? <span className="a-link">Sign in →</span></div>

      <div className="auth-brand-strip" style={{ marginTop: 12 }}>
        <div className="abs-dot" />
        <span className="abs-txt">PalmCare AI · Built for care professionals</span>
        <div className="abs-dot" />
      </div>
    </div>
  );
}

const VISITS = [
  { initials: 'MJ', name: 'Margaret Johnson', meta: 'Dementia · 2h ago', pip: 'pip-g', status: 'Complete', av: 'av1' },
  { initials: 'RD', name: 'Robert Davis', meta: "Parkinson's · Yesterday", pip: 'pip-a', status: 'Pending', av: 'av2' },
  { initials: 'LA', name: 'Linda Anderson', meta: 'Post-surgery · 2d ago', pip: 'pip-g', status: 'Complete', av: 'av3' },
  { initials: 'TW', name: 'Thomas Williams', meta: "Alzheimer's · 3d ago", pip: 'pip-b', status: 'Processing', av: 'av4' },
];

function BottomNav({ active }: { active: 'home' | 'clients' | 'record' | 'calendar' | 'more' }) {
  return (
    <div className="bnav">
      <div className="nv">
        <Home size={20} className={active === 'home' ? 'on' : ''} />
        <span className={active === 'home' ? 'on' : ''}>Home</span>
      </div>
      <div className="nv">
        <Users size={20} className={active === 'clients' ? 'on' : ''} />
        <span className={active === 'clients' ? 'on' : ''}>Clients</span>
      </div>
      <div className="nv-ctr">
        <div className="nv-mic-btn" style={active === 'record' ? { background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,.4)' } : undefined}>
          <Mic size={22} color="white" />
        </div>
        <span className="nv-mic-lbl">Palm It</span>
      </div>
      <div className="nv">
        <Calendar size={20} className={active === 'calendar' ? 'on' : ''} />
        <span className={active === 'calendar' ? 'on' : ''}>Calendar</span>
      </div>
      <div className="nv">
        <MoreHorizontal size={20} className={active === 'more' ? 'on' : ''} />
        <span className={active === 'more' ? 'on' : ''}>More</span>
      </div>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="s-home">
      <div className="home-bar">
        <div className="home-bar-inner">
          <div>
            <div className="home-greet">Palm It, Sarah 🌴</div>
            <div className="home-name">Good morning</div>
          </div>
          <div className="home-av">S</div>
        </div>
      </div>

      <div className="home-scroll">
        <div style={{ height: 2 }} />
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-ico si-t"><Users size={15} /></div>
            <div className="stat-val">12</div>
            <div className="stat-lbl">Clients</div>
          </div>
          <div className="stat-card">
            <div className="stat-ico si-b"><CalendarCheck size={15} /></div>
            <div className="stat-val">4</div>
            <div className="stat-lbl">This Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-ico si-o"><Clock size={15} /></div>
            <div className="stat-val">3</div>
            <div className="stat-lbl">Pending</div>
          </div>
        </div>

        <div className="cta-bar">
          <div>
            <div className="cta-eyebrow">Start recording</div>
            <div className="cta-title">Palm It Now</div>
            <div className="cta-sub">Tap to record a new assessment</div>
          </div>
          <div className="cta-mic"><Mic size={20} color="white" /></div>
        </div>

        <div className="sec-row">
          <span className="sec-title">Recent Visits</span>
          <span className="sec-link">See all</span>
        </div>

        {VISITS.map((v) => (
          <div key={v.initials} className="v-card">
            <div className={`v-av ${v.av}`}>{v.initials}</div>
            <div className="v-info">
              <div className="v-name">{v.name}</div>
              <div className="v-meta">{v.meta}</div>
            </div>
            <div className={`pip ${v.pip}`}>{v.status}</div>
          </div>
        ))}
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function RecordScreen() {
  return (
    <div className="s-rec">
      <div className="rec-bar">
        <div className="rec-bar-title">New Assessment</div>
        <div className="rec-brand-nudge">Palm It — AI is listening</div>
      </div>

      <div className="rec-content">
        <div className="cl-sel">
          <div className="cl-l">
            <div className="cl-empty"><User size={14} /></div>
            <span className="cl-txt">Select a client</span>
          </div>
          <div className="cl-r"><ChevronDown size={16} /></div>
        </div>

        <div className="rec-timer">00:00</div>
        <div className="rec-status">Ready to Palm It</div>

        <div className="mic-zone">
          <div className="mic-ring">
            <div className="mic-btn"><Mic size={32} color="white" /></div>
          </div>
          <div className="mic-hint">Tap to start · AI handles the rest</div>
        </div>
      </div>

      <BottomNav active="record" />
    </div>
  );
}

const CLIENTS = [
  { initials: 'MJ', name: 'Margaret Johnson', diag: 'Dementia, Hypertension', phone: '(555) 201-4432', av: 'av1' },
  { initials: 'RD', name: 'Robert Davis', diag: "Parkinson's Disease", phone: '(555) 339-8821', av: 'av2' },
  { initials: 'LA', name: 'Linda Anderson', diag: 'Post-surgery Recovery', phone: '(555) 478-2210', av: 'av3' },
  { initials: 'TW', name: 'Thomas Williams', diag: "Alzheimer's Disease", phone: '(555) 123-6600', av: 'av4' },
  { initials: 'NM', name: 'Nancy Martinez', diag: 'Diabetes, Mobility Issues', phone: '(555) 892-3341', av: 'av5' },
  { initials: 'BP', name: 'Barbara Peters', diag: 'Stroke Recovery', phone: '(555) 564-0918', av: 'av6' },
];

function ClientsScreen() {
  return (
    <div className="s-clients">
      <div className="cl-bar">
        <div className="cl-bar-top">
          <div className="cl-bar-title">Clients</div>
          <button className="add-btn"><Plus size={12} color="white" />Add Client</button>
        </div>
        <div className="search-bar">
          <Search size={14} />
          <span>Search name, phone, diagnosis…</span>
        </div>
      </div>

      <div className="cl-list">
        {CLIENTS.map((c) => (
          <div key={c.initials} className="c-card">
            <div className={`c-av ${c.av}`}>{c.initials}</div>
            <div className="c-info">
              <div className="c-name">{c.name}</div>
              <div className="c-diag">{c.diag}</div>
              <div className="c-phone">{c.phone}</div>
            </div>
            <div className="c-chev"><ChevronRight size={15} /></div>
          </div>
        ))}
      </div>

      <BottomNav active="clients" />
    </div>
  );
}

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

      {/* ── Page header ── */}
      <div className="pg-head">
        <div className="pg-slogan">PALM <em>IT.</em></div>
        <div className="pg-tagline">Record it. Transcribe it. Contract it. All in your palm.</div>
        <div className="pg-chip"><div className="pg-chip-dot" /><span>Available on iOS</span></div>
      </div>

      <div className="screens">
        <div className="sc-col">
          <div className="sc-lbl">Landing</div>
          <div className="phone"><div className="pill" /><LandingScreen /></div>
        </div>

        <div className="sc-col">
          <div className="sc-lbl">Sign In</div>
          <div className="phone"><div className="pill" /><SignInScreen /></div>
        </div>

        <div className="sc-col">
          <div className="sc-lbl">Register</div>
          <div className="phone"><div className="pill" /><RegisterScreen /></div>
        </div>

        <div className="sc-col">
          <div className="sc-lbl">Home</div>
          <div className="phone" style={{ position: 'relative' }}><div className="pill" /><HomeScreen /></div>
        </div>

        <div className="sc-col">
          <div className="sc-lbl">Record</div>
          <div className="phone" style={{ position: 'relative' }}><div className="pill" /><RecordScreen /></div>
        </div>

        <div className="sc-col">
          <div className="sc-lbl">Clients</div>
          <div className="phone" style={{ position: 'relative' }}><div className="pill" /><ClientsScreen /></div>
        </div>
      </div>

      {/* ── Download CTA Section ── */}
      <section className="ma-download-section">
        <div className="ma-download-inner">
          <div className="ma-download-badge">
            <div className="pg-chip-dot" />
            <span>Download Now</span>
          </div>
          <h2 className="ma-download-title">Ready to <em>Palm It?</em></h2>
          <p className="ma-download-sub">
            Join thousands of home care professionals who save 3+ hours every day with PalmCare AI.
          </p>
          <div className="ma-download-btns">
            <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="ma-appstore-btn">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
              <div>
                <span className="ma-appstore-small">Download on the</span>
                <span className="ma-appstore-big">App Store</span>
              </div>
            </a>
            <a href="/#book-demo" className="ma-demo-btn">Schedule a Demo →</a>
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
          <p className="ma-footer-copy">© 2026 PalmCare AI (Palm Technologies LLC). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
