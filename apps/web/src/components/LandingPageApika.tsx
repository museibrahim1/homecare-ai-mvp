'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mic, FileText, Users, CheckCircle, ArrowRight, Shield, Star, Download,
  Smartphone, Zap, BarChart3, Menu, X, ChevronDown, Play, Building2,
} from 'lucide-react';

/* ───────────────────── APIKA-STYLE LANDING PAGE ───────────────────── */

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/#achievements', label: 'Achievements' },
  { href: '/#features', label: 'Popular Features' },
  { href: '/#interface', label: 'Interface' },
  { href: '/contact', label: 'Contact' },
];

const STATS = [
  { value: '50k+', icon: Shield, label: 'Active Installations' },
  { value: '10k+', icon: Star, label: '5 Star Feedback' },
  { value: '80k+', icon: Download, label: 'All Time Downloads' },
];

const POPULAR_FEATURES = [
  { num: '01', title: 'Modern Design', desc: 'Clean, intuitive interface built for home care professionals.', icon: FileText },
  { num: '02', title: 'Easy Installation', desc: 'Get started in minutes with our streamlined onboarding.', icon: Zap },
  { num: '03', title: 'Weekly Updates', desc: 'We ship new features and improvements every week.', icon: BarChart3 },
  { num: '04', title: '24/7 Support', desc: 'Dedicated support team ready to help when you need it.', icon: Users },
];

const BENEFITS = [
  'Voice-powered assessments with AI transcription',
  'Automatic contract generation from recordings',
  'HIPAA-compliant security & encryption',
];

const SCREENSHOTS = [
  '/screenshots/dashboard.png',
  '/screenshots/voice-assessment.png',
  '/screenshots/contract-preview.png',
  '/screenshots/client-crm.png',
  '/screenshots/billing-extraction.png',
  '/screenshots/pipeline.png',
  '/screenshots/scheduling.png',
  '/screenshots/reports.png',
];

export default function LandingPageApika({
  bookDemoSection,
  onWatchDemo,
}: {
  bookDemoSection: React.ReactNode;
  onWatchDemo?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
              </div>
              <span className="text-xl font-bold text-slate-900">PalmCare AI</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium transition">
                Sign In
              </Link>
              <a href="#book-demo" className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition">
                Schedule Demo
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-2 border-t border-slate-200 mt-4">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block py-2 text-slate-600 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/login" className="block py-2 text-slate-600" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <a href="#book-demo" className="block bg-primary-500 text-white py-2 px-4 rounded-lg text-center font-medium mt-2" onClick={() => setMobileMenuOpen(false)}>
                Schedule Demo
              </a>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative pt-16 pb-24 px-6 overflow-hidden">
          {/* Soft gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-cyan-50/50" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary-200/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-200/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 leading-tight mb-6">
                  Bring Your Agency to the{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-cyan">Next Level</span>
                  {' '}With PalmCare AI
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
                  Stop spending hours on paperwork. Record care assessments by voice, auto-generate contracts,
                  and manage your home care agency — all from one powerful AI platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="#book-demo" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition">
                    Schedule a Demo <ArrowRight className="w-5 h-5" />
                  </a>
                  <button
                    onClick={onWatchDemo}
                    className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-semibold hover:border-primary-300 hover:bg-primary-50/50 transition"
                  >
                    <Play className="w-5 h-5" /> Watch Demo
                  </button>
                  <Link href="/login" className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-semibold hover:border-primary-300 hover:bg-primary-50/50 transition">
                    Get Started Free
                  </Link>
                </div>
                <div className="flex items-center gap-3 mt-10">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-cyan border-2 border-white flex items-center justify-center text-white text-sm font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm">
                    <span className="font-semibold text-slate-900">500+</span> agencies trust PalmCare AI
                  </p>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-cyan rounded-[3rem] blur-2xl opacity-20 scale-110" />
                  <div className="relative w-72 h-[560px] bg-white rounded-[2.5rem] border-[14px] border-slate-800 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-primary-500 to-primary-600 flex items-center justify-center">
                      <div className="w-24 h-6 bg-white/20 rounded-full" />
                    </div>
                    <div className="pt-16 p-4 space-y-4 bg-slate-50 min-h-full">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                            <Mic className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">Recording...</p>
                            <p className="text-xs text-slate-500">Client: Margaret J.</p>
                          </div>
                        </div>
                        <div className="flex gap-1 h-6">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-primary-500 rounded-full animate-pulse"
                              style={{ height: `${20 + (i % 5) * 8}%`, animationDelay: `${i * 50}ms` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                          <p className="text-lg font-bold text-slate-900">24</p>
                          <p className="text-xs text-slate-500">Clients</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                          <p className="text-lg font-bold text-primary-600">12</p>
                          <p className="text-xs text-slate-500">Contracts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ACHIEVEMENTS / STATS ── */}
        <section id="achievements" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">We Speak With Our Achievement & Powerful Stats</h2>
                <a href="#book-demo" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                  Know More <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {STATS.map((stat, i) => (
                <div key={i} className="bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center mb-4">
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STAY FOCUSED ── */}
        <section className="py-20 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Stay Focused On Your Business Goals</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  PalmCare AI helps you focus on what matters most — delivering exceptional care. Our platform handles the paperwork so you can spend more time with clients and less time on admin.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">Easy Installation Process</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">Weekly Updated Version</span>
                  </li>
                </ul>
                <div className="flex gap-4">
                  <a href="#book-demo" className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition">
                    Schedule Demo <ArrowRight className="w-4 h-4" />
                  </a>
                  <a href="/features" className="text-primary-600 hover:text-primary-700 font-medium">Know More</a>
                </div>
              </div>
              <div className="relative flex justify-center">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden w-40 h-72 flex items-center justify-center"
                      style={{ transform: `rotate(${(i - 2) * 6}deg)` }}
                    >
                      <Smartphone className="w-16 h-16 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── POPULAR FEATURES ── */}
        <section id="features" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Popular Features That Blow Your Mind</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Everything you need to run a modern home care agency.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {POPULAR_FEATURES.map((f, i) => (
                <div key={i} className="group">
                  <div className="text-4xl font-bold text-primary-500/30 mb-4">{f.num}</div>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MOST POWERFUL APPLICATION ── */}
        <section className="py-20 px-6 bg-gradient-to-br from-primary-50 to-cyan-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose Our App — The Most Powerful Application for Home Care</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  PalmCare AI is built from the ground up for home care agencies. Voice-powered assessments, automatic contract generation, and HIPAA-compliant security — all in one platform.
                </p>
                <ul className="space-y-4 mb-8">
                  {BENEFITS.map((b, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-primary-500 shrink-0" />
                      <span className="text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4">
                  <a href="#book-demo" className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition">
                    Schedule Demo
                  </a>
                  <button
                    onClick={onWatchDemo}
                    className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-primary-300 hover:bg-primary-50/50 transition"
                  >
                    <Play className="w-5 h-5" /> Watch Demo
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-cyan rounded-3xl blur-2xl opacity-20" />
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 aspect-[3/4] flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── INTERFACE DESIGN GALLERY ── */}
        <section id="interface" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Check Out Our Application Interface Design</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">A clean, modern UI built for efficiency.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {SCREENSHOTS.map((src, i) => (
                <div
                  key={i}
                  className="aspect-[9/16] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                  style={{ transform: `rotate(${(i % 3 - 1) * 3}deg)` }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOOK DEMO (injected) ── */}
        {bookDemoSection}
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
              </div>
              <span className="text-xl font-bold">PalmCare AI</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-slate-400 hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="text-slate-400 hover:text-white transition">Terms</Link>
              <Link href="/contact" className="text-slate-400 hover:text-white transition">Contact</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">© {new Date().getFullYear()} PalmCare AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Shield className="w-5 h-5 text-green-400" />
                HIPAA Compliant
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
