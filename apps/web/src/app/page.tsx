'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';
import {
  Mic,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  Brain,
  ClipboardList,
  Lock,
  Smartphone,
} from 'lucide-react';

import { Hero } from '@/components/landing/Hero';
import { FaqItem } from '@/components/landing/FaqItem';
import { FEATURES_TABS, SOLUTIONS, FAQ_ITEMS } from '@/components/landing/data';

const OLD_WAY = [
  'Type the assessment into forms — during or after the visit',
  'Re-key the same data into a care plan, then again into a contract',
  'Hunt down the right state-specific clauses for every agreement',
  'Hours of nightly paperwork, where billing errors creep in',
];

const PALM_WAY = [
  'Record the visit — in person or over the phone',
  'AI writes the transcript, care plan, billables, and visit notes',
  'State-specific service contracts, built from what was actually said',
  'Review, send, and sign — minutes, not hours',
];

// Honest product facts (not performance claims) — proof density without fabrication.
const PROOF_STATS = [
  { stat: '4-in-1', label: 'Care plan, visit notes, billables & service contract — from one recording' },
  { stat: '50 states', label: 'State-specific contract rules built in' },
  { stat: 'Minutes', label: 'From a recorded assessment to a ready-to-sign contract' },
  { stat: 'HIPAA', label: '256-bit encryption, audit logs, BAA available' },
];

// Honest competitive comparison (validated against live competitor sites, Jun 2026).
const COMPARE_ROWS = [
  { label: 'Built for', palm: 'Home care agencies', scribes: 'Medicare home health', templates: 'General documents', manual: '—' },
  { label: 'Captures the visit by voice', palm: 'Yes', scribes: 'Yes', templates: 'No', manual: 'No' },
  { label: 'State-specific service contract', palm: 'Automatic (50 states)', scribes: 'No', templates: 'Manual editing', manual: 'Manual' },
  { label: 'Care plan, notes & billables', palm: 'Yes', scribes: 'Clinical notes only', templates: 'No', manual: 'Manual' },
  { label: 'Time to a ready-to-sign agreement', palm: 'Minutes', scribes: 'Not produced', templates: 'Hours', manual: 'Hours' },
];

const NAV_FEATURES = [
  { href: '/features#ai', icon: Brain, label: 'AI Intelligence', desc: 'Voice assessments & smart contracts' },
  { href: '/features#ops', icon: ClipboardList, label: 'Agency Operations', desc: 'CRM, scheduling & visit management' },
  { href: '/features#billing', icon: BarChart3, label: 'Billing & Reports', desc: 'Automated billing & analytics' },
  { href: '/features#caregiver', icon: Smartphone, label: 'Caregiver Tools', desc: 'Mobile app & ADL logging' },
  { href: '/features#templates', icon: FileText, label: 'Templates & OCR', desc: 'Upload & auto-fill contracts' },
  { href: '/features#security', icon: Lock, label: 'Security & Compliance', desc: 'HIPAA compliant & encrypted' },
];

const NAV_RESOURCES = [
  { label: 'Blog', href: '/blog' },
  { label: 'ROI Calculator', href: '/roi-calculator' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'System Status', href: '/status' },
  { label: 'Privacy Policy', href: '/privacy' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Record', description: 'Staff records the client assessment on their phone — in person or over the phone. One tap to start.', icon: Mic },
  { step: '02', title: 'Transcribe', description: 'AI transcribes the conversation, identifies speakers, and extracts care needs and billable items.', icon: Zap },
  { step: '03', title: 'Contract', description: 'A complete assessment, care plan, and service agreement is generated — ready to send and sign.', icon: FileText },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState('ai');
  const [navDropdown, setNavDropdown] = useState<string | null>(null);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => { setMobileMenuOpen(false); setMobileSection(null); };

  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVIGATION ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                <Image src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-900 truncate">PalmCare AI</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 pt-2 w-[520px] max-w-[calc(100vw-2rem)]">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 grid grid-cols-2 gap-2">
                      {NAV_FEATURES.map(item => (
                        <Link key={item.href} href={item.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                            <item.icon className="w-4.5 h-4.5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium text-sm">{item.label}</p>
                            <p className="text-slate-500 text-xs">{item.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => setNavDropdown('solutions')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 transition rounded-lg">
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 pt-2 w-72">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2">
                      {[
                        { label: 'Small Agencies', desc: 'Up to 30 clients', href: '#solutions' },
                        { label: 'Medium Agencies', desc: '30–200 clients', href: '#solutions' },
                        { label: 'Enterprise', desc: '200+ clients', href: '#solutions' },
                      ].map(item => (
                        <a key={item.label} href={item.href} onClick={() => setNavDropdown(null)} className="block p-3 rounded-lg hover:bg-slate-50 transition">
                          <p className="text-slate-900 font-medium text-sm">{item.label}</p>
                          <p className="text-slate-500 text-xs">{item.desc}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => setNavDropdown('resources')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 transition rounded-lg">
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'resources' && (
                  <div className="absolute top-full left-0 pt-2 w-56">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2">
                      {NAV_RESOURCES.map(item => (
                        <Link key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-slate-50 transition text-slate-700 text-sm font-medium">{item.label}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/mobile-app" className="px-3 py-2 text-slate-600 hover:text-slate-900 transition">Mobile App</Link>
              <Link href="/pricing" className="px-3 py-2 text-slate-600 hover:text-slate-900 transition">Pricing</Link>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-slate-600 hover:text-slate-900 transition px-3 py-2">Sign in</Link>
              <Link href="/register" className="btn-primary py-2 px-5 text-sm">Start free trial</Link>
            </div>

            <button
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => (mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true))}
              className="lg:hidden p-2.5 -mr-1 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu — full-height scrollable panel, anchored below the nav bar */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full inset-x-0 h-[calc(100dvh-61px)] bg-white overflow-y-auto overscroll-contain border-t border-slate-200">
            <div className="px-4 py-4 pb-safe space-y-1">
              <button
                onClick={() => setMobileSection(mobileSection === 'features' ? null : 'features')}
                className="w-full flex items-center justify-between py-3.5 px-2 text-slate-900 font-medium rounded-lg active:bg-slate-50"
                aria-expanded={mobileSection === 'features'}
              >
                Features
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${mobileSection === 'features' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'features' && (
                <div className="pb-2 space-y-1">
                  {NAV_FEATURES.map(item => (
                    <Link key={item.href} href={item.href} onClick={closeMobileMenu} className="flex items-center gap-3 py-2.5 px-3 rounded-lg active:bg-slate-50">
                      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                        <item.icon className="w-4.5 h-4.5 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-900 text-sm font-medium">{item.label}</p>
                        <p className="text-slate-500 text-xs truncate">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <a href="#solutions" onClick={closeMobileMenu} className="block py-3.5 px-2 text-slate-900 font-medium rounded-lg active:bg-slate-50">Solutions</a>
              <Link href="/mobile-app" onClick={closeMobileMenu} className="block py-3.5 px-2 text-slate-900 font-medium rounded-lg active:bg-slate-50">Mobile App</Link>
              <Link href="/pricing" onClick={closeMobileMenu} className="block py-3.5 px-2 text-slate-900 font-medium rounded-lg active:bg-slate-50">Pricing</Link>

              <button
                onClick={() => setMobileSection(mobileSection === 'resources' ? null : 'resources')}
                className="w-full flex items-center justify-between py-3.5 px-2 text-slate-900 font-medium rounded-lg active:bg-slate-50"
                aria-expanded={mobileSection === 'resources'}
              >
                Resources
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${mobileSection === 'resources' ? 'rotate-180' : ''}`} />
              </button>
              {mobileSection === 'resources' && (
                <div className="pb-2 space-y-1">
                  {NAV_RESOURCES.map(item => (
                    <Link key={item.label} href={item.href} onClick={closeMobileMenu} className="block py-2.5 px-3 text-slate-600 text-sm rounded-lg active:bg-slate-50">{item.label}</Link>
                  ))}
                </div>
              )}

              <div className="pt-4 mt-3 border-t border-slate-200 space-y-3">
                <Link href="/login" onClick={closeMobileMenu} className="block w-full text-center py-3 rounded-lg text-slate-700 font-medium border border-slate-300 active:bg-slate-50">Sign in</Link>
                <Link href="/register" onClick={closeMobileMenu} className="block w-full text-center btn-primary py-3 px-5">Start free trial</Link>
                <div className="flex items-center justify-center gap-4 pt-2 pb-6 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary-600" /> HIPAA compliant</span>
                  <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary-600" /> 256-bit encryption</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
      {/* ═══ HERO ═══ */}
      <Hero />

      {/* ═══ WHAT IS PALMCARE AI (AEO answer block) ═══ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-b border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">What is PalmCare AI?</h2>
          <p className="text-lg text-slate-600 mt-4 leading-relaxed">
            PalmCare AI is documentation software for home care agencies that turns a
            recorded client assessment into a state-specific service contract —
            automatically. Record the visit, and the AI writes the transcript, care
            plan, billable items, and visit notes, then generates a ready-to-sign
            agreement in minutes instead of hours.
          </p>
          <p className="text-sm text-slate-500 mt-5">
            New here? See{' '}
            <Link href="/blog/ai-home-care-documentation-tools-2026" className="text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2">
              how PalmCare AI compares to AI scribes and contract templates
            </Link>
            , or{' '}
            <Link href="/pricing" className="text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2">
              view simple, transparent pricing
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ═══ BY THE NUMBERS (honest product facts) ═══ */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
          {PROOF_STATS.map((s) => (
            <div key={s.stat}>
              <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{s.stat}</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">From conversation to contract in three steps</h2>
            <p className="text-lg text-slate-600 mt-4">No forms to fill out. No data re-entry. The assessment conversation is the documentation.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="card p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 bg-primary-50 rounded-lg flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-300">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10 sm:mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Everything you need to run your agency</h2>
            <p className="text-lg text-slate-600 mt-4">Built for care professionals — not retrofitted from generic software.</p>
          </div>

          {/* Tabs: swipeable on mobile */}
          <div className="border-b border-slate-200 mb-8 sm:mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 sm:gap-8 min-w-max">
              {FEATURES_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    activeFeatureTab === tab.id
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {FEATURES_TABS.find(t => t.id === activeFeatureTab)?.features.map((feature, i) => (
              <div key={i} className="card card-hover p-5 h-full flex flex-col">
                <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden border border-slate-200 mb-4 bg-slate-50 shrink-0">
                  <Image
                    src={feature.image}
                    alt={`${feature.title} screenshot`}
                    fill
                    className="object-contain p-1.5"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="flex items-center gap-2.5 mb-2">
                  <feature.icon className="w-4 h-4 text-primary-600 shrink-0" />
                  <h3 className="text-[15px] font-semibold text-slate-900">{feature.title}</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/features" className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium transition py-2">
              View all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SOLUTIONS BY SIZE ═══ */}
      <section id="solutions" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Solutions</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Built for agencies of every size</h2>
            <p className="text-lg text-slate-600 mt-4">Whether you serve 10 clients or 1,000+, PalmCare AI scales with your agency.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {SOLUTIONS.map((sol, i) => (
              <div key={i} className="card p-6 sm:p-8 flex flex-col">
                <h3 className="text-xl font-semibold text-slate-900">{sol.size}</h3>
                <p className="text-primary-700 font-medium text-sm mt-1 mb-4">{sol.clients}</p>
                <p className="text-slate-600 mb-6 leading-relaxed text-sm sm:text-[15px]">{sol.description}</p>
                <ul className="space-y-2.5 flex-1">
                  {sol.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-slate-700 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium text-sm transition">
                  Start free trial <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE OLD WAY vs PALM ═══ */}
      <section id="why" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Why agencies switch</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Old software digitized the paperwork. PALM removes it.</h2>
            <p className="text-lg text-slate-600 mt-4">Legacy platforms turned paper forms into digital forms. You still type, re-key, and chase clauses. PALM starts from the conversation instead.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            <div className="card p-6 sm:p-8">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">The old way</p>
              <ul className="space-y-4">
                {OLD_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 text-sm sm:text-[15px] leading-relaxed">
                    <X className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6 sm:p-8 ring-1 ring-primary-100 bg-primary-50/30">
              <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide mb-5">With PALM</p>
              <ul className="space-y-4">
                {PALM_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-800 text-sm sm:text-[15px] leading-relaxed">
                    <CheckCircle className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10 sm:mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">How PALM compares</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">The only tool that turns the assessment into a contract</h2>
            <p className="text-lg text-slate-600 mt-4">AI clinical scribes chart OASIS notes for Medicare home health. Template tools hand you a blank form. PALM is built for home care — and produces the whole packet from one recording.</p>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left font-medium text-slate-500 py-3 pr-4">Capability</th>
                  <th className="text-center font-semibold text-primary-700 py-3 px-3 bg-primary-50">PalmCare AI</th>
                  <th className="text-center font-medium text-slate-500 py-3 px-3">AI clinical scribes</th>
                  <th className="text-center font-medium text-slate-500 py-3 px-3">Contract templates</th>
                  <th className="text-center font-medium text-slate-500 py-3 px-3">Manual / by hand</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="text-slate-700 py-3 pr-4 font-medium">{row.label}</td>
                    <td className="text-center py-3 px-3 bg-primary-50 text-slate-900 font-medium">{row.palm}</td>
                    <td className="text-center py-3 px-3 text-slate-500">{row.scribes}</td>
                    <td className="text-center py-3 px-3 text-slate-500">{row.templates}</td>
                    <td className="text-center py-3 px-3 text-slate-500">{row.manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 mt-5">
            See the full breakdown in{' '}
            <Link href="/blog/ai-home-care-documentation-tools-2026" className="text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2">
              AI documentation tools for home care, compared
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ═══ CLOSING CTA ═══ */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-2xl px-6 sm:px-12 py-12 sm:py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Spend your time on care, not paperwork</h2>
            <p className="text-lg text-slate-300 mt-4 max-w-2xl mx-auto">Start your 14-day free trial today. Full access to every feature — cancel anytime.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <Link href="/register" data-track="final-cta-trial" className="btn-primary inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base">
                Start free trial <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base font-medium rounded-lg text-white border border-white/25 hover:border-white/50 transition">
                Talk to us
              </Link>
            </div>
            <p className="text-slate-400 text-sm mt-6">HIPAA compliant &middot; 14-day free trial &middot; No credit card required</p>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 sm:mb-12">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
          <p className="text-slate-600 mt-8">
            Still have questions?{' '}
            <Link href="/faq" className="text-primary-700 hover:text-primary-800 font-medium">View all FAQs</Link>
            {' '}or{' '}
            <Link href="/contact" className="text-primary-700 hover:text-primary-800 font-medium">contact our team</Link>.
          </p>
        </div>
      </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6 pb-28 lg:pb-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10 sm:mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <Image src="/hand-icon-white.png" alt="PalmCare AI" width={26} height={26} className="object-contain" />
                </div>
                <span className="text-lg font-bold text-slate-900">PalmCare AI</span>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                AI documentation for home care agencies. Record it. Transcribe it. Contract it.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Product</h3>
              <ul className="space-y-2.5 text-slate-500 text-sm">
                <li><Link href="/features" className="hover:text-slate-900 transition inline-block py-0.5">Features</Link></li>
                <li><Link href="/mobile-app" className="hover:text-slate-900 transition inline-block py-0.5">Mobile App</Link></li>
                <li><Link href="/pricing" className="hover:text-slate-900 transition inline-block py-0.5">Pricing</Link></li>
                <li><Link href="/roi-calculator" className="hover:text-slate-900 transition inline-block py-0.5">ROI Calculator</Link></li>
                <li><Link href="/blog" className="hover:text-slate-900 transition inline-block py-0.5">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-slate-900 transition inline-block py-0.5">FAQ</Link></li>
                <li><Link href="/login" className="hover:text-slate-900 transition inline-block py-0.5">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Company</h3>
              <ul className="space-y-2.5 text-slate-500 text-sm">
                <li><Link href="/about" className="hover:text-slate-900 transition inline-block py-0.5">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-slate-900 transition inline-block py-0.5">Contact</Link></li>
                <li><Link href="/status" className="hover:text-slate-900 transition inline-block py-0.5">System Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Legal</h3>
              <ul className="space-y-2.5 text-slate-500 text-sm">
                <li><Link href="/privacy" className="hover:text-slate-900 transition inline-block py-0.5">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-900 transition inline-block py-0.5">Terms of Service</Link></li>
                <li><Link href="/privacy#hipaa" className="hover:text-slate-900 transition inline-block py-0.5">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm text-center md:text-left">&copy; 2026 Palm Technologies, Inc. All rights reserved.</p>
            <div className="flex items-center flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><Shield className="w-4 h-4 text-primary-600" /> HIPAA compliant</span>
              <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4 text-primary-600" /> 256-bit encryption</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA BAR (mobile only) ── */}
      {!mobileMenuOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-3 px-4 sm:px-6 lg:hidden pb-safe">
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-700 text-sm font-medium hidden sm:block">Try PalmCare AI free for 14 days</p>
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Link href="/register" className="flex-1 text-center btn-primary py-3 px-4 text-sm">Start free trial</Link>
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
