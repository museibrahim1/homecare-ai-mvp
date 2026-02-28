'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  Smartphone,
  Mic,
  Users,
  Calendar,
  ClipboardList,
  Shield,
  ArrowRight,
  CheckCircle,
  Star,
  Download,
  Zap,
  Menu,
  X,
  ChevronDown,
  Brain,
  BarChart3,
  Lock,
  FileText,
  Settings,
} from 'lucide-react';

const APP_FEATURES = [
  {
    icon: Mic,
    title: 'Voice-Powered Assessments',
    description: 'Record client visits with one tap. AI transcribes and organizes everything automatically — even identifies speakers.',
    color: 'from-primary-500 to-accent-cyan',
  },
  {
    icon: ClipboardList,
    title: 'Smart Contract Generation',
    description: 'AI reads your assessments and generates professional, proposal-ready contracts in seconds.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'Full CRM on the go. View client profiles, care plans, visit history, and contact info from anywhere.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Calendar,
    title: 'Schedule & Visits',
    description: 'View your daily schedule, clock in/out with GPS verification, and manage upcoming visits.',
    color: 'from-green-500 to-emerald-500',
  },
];

const APP_STATS = [
  { value: '10x', label: 'Faster Assessments' },
  { value: '95%', label: 'Accuracy Rate' },
  { value: '3hrs', label: 'Saved Per Day' },
];

const SCREENSHOTS = [
  { src: '/screenshots/ios/01-landing.png', alt: 'App Landing Screen', label: 'Welcome' },
  { src: '/screenshots/ios/04-home.png', alt: 'Home Dashboard', label: 'Dashboard' },
  { src: '/screenshots/ios/05-record.png', alt: 'Record Assessment', label: 'Record' },
  { src: '/screenshots/ios/06-clients.png', alt: 'Clients List', label: 'Clients' },
  { src: '/screenshots/ios/02-login.png', alt: 'Login Screen', label: 'Sign In' },
];

export default function MobileAppPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navDropdown, setNavDropdown] = useState<string | null>(null);
  const [activeScreenshot, setActiveScreenshot] = useState(1);

  return (
    <div className="min-h-screen bg-dark-900 landing-dark">
      {/* ── NAVIGATION (same as landing) ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
              </div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 mt-1 w-[520px] bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-3">
                    {[
                      { href: '/features#ai', icon: Brain, label: 'AI Intelligence', desc: 'Voice assessments & smart contracts' },
                      { href: '/features#ops', icon: ClipboardList, label: 'Agency Operations', desc: 'CRM, scheduling & visit management' },
                      { href: '/features#billing', icon: BarChart3, label: 'Billing & Reports', desc: 'Automated billing & analytics' },
                      { href: '/features#caregiver', icon: Smartphone, label: 'Caregiver Tools', desc: 'Mobile app & ADL logging' },
                      { href: '/features#templates', icon: FileText, label: 'Templates & OCR', desc: 'Upload & auto-fill contracts' },
                      { href: '/features#security', icon: Lock, label: 'Security & Compliance', desc: 'HIPAA compliant & encrypted' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition group">
                        <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                          <item.icon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-dark-400 text-xs">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href="/mobile-app" className="px-3 py-2 text-white font-medium transition rounded-lg bg-primary-500/10 border border-primary-500/30">
                Mobile App
              </Link>

              <a href="/#book-demo" className="px-3 py-2 text-dark-300 hover:text-white transition">Schedule Demo</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-dark-300 hover:text-white transition px-3 py-2">Sign In</Link>
              <a href="/#book-demo" className="btn-primary py-2 px-5 text-sm">Schedule Demo</a>
            </div>

            <button aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-dark-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-3 border-t border-dark-700 mt-4">
              <Link href="/features" className="block py-2 text-dark-300 hover:text-white">Features</Link>
              <Link href="/mobile-app" className="block py-2 text-white font-medium">Mobile App</Link>
              <a href="/#book-demo" className="block py-2 text-dark-300 hover:text-white">Schedule Demo</a>
              <Link href="/login" className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
            </div>
          )}
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="pt-32 pb-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                  <Smartphone className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-primary-400">Available on iOS</span>
                </div>

                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                  Your Agency,
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> In Your Pocket</span>
                </h1>

                <p className="text-xl text-dark-300 mb-8 leading-relaxed">
                  Record assessments, manage clients, and generate contracts — all from your iPhone.
                  The PalmCare AI mobile app puts the power of AI in your hands, wherever you go.
                </p>

                <div className="flex flex-wrap gap-4 mb-10">
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-white text-dark-900 px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    <div className="text-left">
                      <p className="text-[10px] leading-none opacity-60">Download on the</p>
                      <p className="text-lg leading-tight font-semibold">App Store</p>
                    </div>
                  </a>
                  <a href="/#book-demo" className="btn-primary flex items-center gap-2 py-3.5 px-6 text-lg">
                    Schedule a Demo <ArrowRight className="w-5 h-5" />
                  </a>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-dark-300 text-sm">Rated 5.0 by home care professionals</p>
                </div>
              </div>

              {/* Phone mockup with screenshot */}
              <div className="relative flex justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 blur-3xl" />
                <div className="relative w-[300px] h-[620px] bg-dark-800 rounded-[3rem] border-4 border-dark-600 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-dark-900 rounded-b-2xl z-10" />
                  <Image
                    src={SCREENSHOTS[activeScreenshot].src}
                    alt={SCREENSHOTS[activeScreenshot].alt}
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-16 px-6 border-y border-dark-700/50">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-8">
              {APP_STATS.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan mb-2">{stat.value}</p>
                  <p className="text-dark-300 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POPULAR FEATURES ── */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                <Zap className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">App Features</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Popular Features That Power Your Agency</h2>
              <p className="text-xl text-dark-400 max-w-2xl mx-auto">Everything you need to manage care assessments, clients, and contracts — right from your phone.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {APP_FEATURES.map((feature, i) => (
                <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-lg font-bold text-primary-400">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-dark-400 text-sm leading-relaxed mb-4">{feature.description}</p>
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTERFACE GALLERY ── */}
        <section className="py-20 px-6 bg-dark-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                <Smartphone className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">App Interface</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Checkout Our App Interface Design</h2>
              <p className="text-xl text-dark-400 max-w-2xl mx-auto">Clean, intuitive design built specifically for home care professionals on the go.</p>
            </div>

            {/* Screenshot selector */}
            <div className="flex justify-center gap-3 mb-12">
              {SCREENSHOTS.map((s, i) => (
                <button key={i} onClick={() => setActiveScreenshot(i)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeScreenshot === i ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-dark-800 text-dark-300 hover:text-white border border-dark-600'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Phone gallery */}
            <div className="flex justify-center items-end gap-6 lg:gap-10">
              {/* Left phone (prev) */}
              <div className="hidden md:block w-[200px] h-[420px] bg-dark-800 rounded-[2rem] border-2 border-dark-600 overflow-hidden opacity-50 shadow-xl relative shrink-0">
                <Image
                  src={SCREENSHOTS[(activeScreenshot - 1 + SCREENSHOTS.length) % SCREENSHOTS.length].src}
                  alt="Previous screen"
                  fill
                  className="object-cover object-top"
                />
              </div>

              {/* Center phone (active) */}
              <div className="w-[280px] h-[580px] bg-dark-800 rounded-[2.5rem] border-4 border-dark-600 overflow-hidden shadow-2xl relative shrink-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-dark-900 rounded-b-xl z-10" />
                <Image
                  src={SCREENSHOTS[activeScreenshot].src}
                  alt={SCREENSHOTS[activeScreenshot].alt}
                  fill
                  className="object-cover object-top"
                />
              </div>

              {/* Right phone (next) */}
              <div className="hidden md:block w-[200px] h-[420px] bg-dark-800 rounded-[2rem] border-2 border-dark-600 overflow-hidden opacity-50 shadow-xl relative shrink-0">
                <Image
                  src={SCREENSHOTS[(activeScreenshot + 1) % SCREENSHOTS.length].src}
                  alt="Next screen"
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── MOST POWERFUL APPLICATION ── */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                  <Settings className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Why Choose Our App</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-6">
                  Most Powerful Application for Home Care Agencies
                </h2>
                <p className="text-dark-300 mb-8 leading-relaxed text-lg">
                  PalmCare AI isn&apos;t just another app — it&apos;s your AI-powered field assistant. Record assessments naturally,
                  let AI handle the paperwork, and focus on what matters: delivering exceptional care.
                </p>

                <ul className="space-y-4 mb-10">
                  {[
                    'Voice-to-contract in under 5 minutes',
                    'Works offline — syncs when connected',
                    'HIPAA compliant with 256-bit encryption',
                    'Seamless sync with web dashboard',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-dark-200 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-4">
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-white text-dark-900 px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg">
                    <Download className="w-5 h-5" />
                    Download App
                  </a>
                  <a href="/#book-demo" className="btn-secondary flex items-center gap-2 py-3.5 px-6">
                    Watch Demo <ArrowRight className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Angled phones */}
              <div className="relative flex justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-[220px] h-[460px] bg-dark-800 rounded-[2rem] border-2 border-dark-600 overflow-hidden shadow-2xl relative -rotate-6">
                    <Image src="/screenshots/ios/05-record.png" alt="Record screen" fill className="object-cover object-top" />
                  </div>
                  <div className="w-[240px] h-[500px] bg-dark-800 rounded-[2.5rem] border-4 border-dark-600 overflow-hidden shadow-2xl relative z-10 rotate-3">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-dark-900 rounded-b-xl z-10" />
                    <Image src="/screenshots/ios/07-main-tabs.png" alt="Home screen" fill className="object-cover object-top" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Go Mobile?</h2>
              <p className="text-xl text-dark-300 mb-8">Download PalmCare AI and start managing your agency from anywhere.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-dark-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg text-lg">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Download on App Store
                </a>
                <a href="/#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
                  Schedule a Demo <ArrowRight className="w-5 h-5" />
                </a>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">256-bit Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
                  <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
                </div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm mb-4 leading-relaxed">
                AI-powered home care management platform. Turn voice assessments into professional contracts in minutes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/mobile-app" className="hover:text-white transition">Mobile App</Link></li>
                <li><a href="/#book-demo" className="hover:text-white transition">Schedule Demo</a></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Company</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Legal</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-dark-400 text-sm">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span className="text-dark-400 text-sm">256-bit Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
