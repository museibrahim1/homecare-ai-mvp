'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Mic, ArrowRight, Shield, Lock, Zap, Brain, Users, BarChart3, 
  Smartphone, PieChart, HeartPulse, Globe, ClipboardList, CheckCircle,
  ChevronDown, Menu, X, Calendar
} from 'lucide-react';

const FEATURE_SECTIONS = [
  {
    id: 'ai',
    title: 'AI Intelligence',
    subtitle: 'Record. Transcribe. Contract.',
    description: 'PalmCare AI is the first AI-native platform built from the ground up for home care — powering everything from voice recording to signed contracts.',
    features: [
      {
        icon: Mic,
        title: 'Voice-Powered Assessments',
        description: 'Record any client assessment on your phone — in person or over the phone. AI transcribes the conversation with 98%+ accuracy, identifies speakers, and captures care-specific terminology. One tap to start. AI handles the rest.',
        highlights: ['98%+ transcription accuracy', 'Multi-speaker identification', 'Care-specific vocabulary'],
        image: '/screenshots/voice-assessment.png',
      },
      {
        icon: Brain,
        title: 'Smart Contract Generation',
        description: 'AI generates a complete care plan and service agreement from a single recording. Services, schedules, rates, and billing terms are auto-populated. Contracts generated in seconds, not hours.',
        highlights: ['Auto-populated fields', 'Multiple style templates', 'DOCX export'],
        image: '/screenshots/contract-preview.png',
      },
      {
        icon: Zap,
        title: 'Intelligent Data Extraction',
        description: 'Every voice recording is analyzed for billable items, care needs, medications, and safety concerns. Extracted data flows directly into your CRM, contracts, and billing — no double entry.',
        highlights: ['Billable item detection', 'Medication tracking', 'Safety concern flagging'],
        image: '/screenshots/transcript.png',
      },
    ],
  },
  {
    id: 'ops',
    title: 'Agency Operations',
    subtitle: 'Your all-in-one management platform',
    description: 'Stop juggling multiple tools. PalmCare AI gives you a unified platform for client management, visit tracking, contract management, and team coordination.',
    features: [
      {
        icon: Users,
        title: 'Client Management (CRM)',
        description: 'Track every client from first contact through active care. Our pipeline view shows leads, assessments in progress, pending contracts, and active clients — giving you full visibility into your agency\'s growth.',
        highlights: ['Visual pipeline', 'Custom stages', 'Notes & history'],
        image: '/screenshots/client-crm.png',
      },
      {
        icon: ClipboardList,
        title: 'Document Management',
        description: 'All your contracts, assessments, audio recordings, and clinical notes organized in one place. Quickly search, filter, and export any document from your central hub.',
        highlights: ['Smart folders', 'Quick search', 'Bulk export'],
        image: '/screenshots/contract-form.png',
      },
      {
        icon: Calendar,
        title: 'Assessments & Visits',
        description: 'Track every assessment from recording through contract generation. Monitor the AI processing pipeline in real time and see transcription, billing, and notes status at a glance.',
        highlights: ['Pipeline tracking', 'Status monitoring', 'Visit history'],
        image: '/screenshots/scheduling.png',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Analytics',
    subtitle: 'Get paid faster, make smarter decisions',
    description: 'Automated billing extraction, real-time analytics, and comprehensive reporting — everything you need to maintain healthy cash flow and grow with confidence.',
    features: [
      {
        icon: BarChart3,
        title: 'Automatic Billing Extraction',
        description: 'AI extracts billable items directly from care assessments. Hours, rates, services, and special charges are calculated automatically — reducing billing errors by up to 80%.',
        highlights: ['80% fewer errors', 'Auto-calculated rates', 'Approve or deny items'],
        image: '/screenshots/billing-extraction.png',
      },
      {
        icon: PieChart,
        title: 'Revenue Dashboard',
        description: 'Real-time dashboards showing client stats, assessment volume, pipeline value, and activity trends. Make data-driven decisions with confidence.',
        highlights: ['Real-time dashboards', 'KPI tracking', 'Growth trends'],
        image: '/screenshots/dashboard.png',
      },
    ],
  },
  {
    id: 'caregiver',
    title: 'Mobile App',
    subtitle: 'Palm It — anywhere, anytime',
    description: 'The PalmCare AI mobile app puts the full power of AI-driven documentation in your pocket. Record assessments, manage clients, and generate contracts on the go.',
    features: [
      {
        icon: Smartphone,
        title: 'iOS Mobile App',
        description: 'A native iOS app designed for care professionals. Record assessments, view live transcriptions, manage clients, and review contracts — all from your iPhone.',
        highlights: ['Native iOS app', 'Live transcription', 'Offline capable'],
        image: '/screenshots/care-tracker.png',
      },
      {
        icon: HeartPulse,
        title: 'Client Care Profiles',
        description: 'Complete client profiles at your fingertips — medical history, emergency contacts, medications, care plans, and visit history. Everything you need for quality care.',
        highlights: ['Full medical history', 'Emergency contacts', 'Visit tracking'],
        image: '/screenshots/adl-logging.png',
      },
      {
        icon: Globe,
        title: 'Agency Dashboard',
        description: 'Agencies get real-time visibility into every assessment, client status, and pipeline metric. Track performance across your entire team from a single login.',
        highlights: ['Client pipeline', 'Team overview', 'Performance metrics'],
        image: '/screenshots/pipeline.png',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Compliance',
    subtitle: 'Enterprise-grade protection',
    description: 'Your clients\' data deserves the highest level of protection. PalmCare AI is built on enterprise-grade security infrastructure with full HIPAA compliance.',
    features: [
      {
        icon: Shield,
        title: 'HIPAA Compliance',
        description: 'Full compliance with HIPAA regulations including administrative, physical, and technical safeguards. Keychain-based token storage, encrypted data at rest, and secure API communication.',
        highlights: ['BAA available', 'Keychain storage', 'Audit logging'],
        image: '/screenshots/hipaa-compliance.png',
      },
      {
        icon: Lock,
        title: 'Data Encryption',
        description: '256-bit AES encryption for data at rest and TLS 1.3 for data in transit. Voice recordings, transcripts, and client data are always protected — end to end.',
        highlights: ['256-bit AES', 'TLS 1.3', 'Key management'],
        image: '/screenshots/data-encryption.png',
      },
    ],
  },
];

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navDropdown, setNavDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {/* Features dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-primary-400 hover:text-white transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 pt-2 w-[520px]">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-3">
                      {[
                        { href: '#ai', icon: Brain, label: 'AI Intelligence', desc: 'Voice assessments & smart contracts' },
                        { href: '#ops', icon: ClipboardList, label: 'Agency Operations', desc: 'CRM, scheduling & visit management' },
                        { href: '#billing', icon: BarChart3, label: 'Billing & Reports', desc: 'Automated billing & analytics' },
                        { href: '#caregiver', icon: Smartphone, label: 'Caregiver Tools', desc: 'Mobile app & ADL logging' },
                        { href: '#security', icon: Lock, label: 'Security & Compliance', desc: 'HIPAA compliant & encrypted' },
                      ].map(item => (
                        <a key={item.href} href={item.href} onClick={() => setNavDropdown(null)} className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition group">
                          <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                            <item.icon className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-dark-400 text-xs">{item.desc}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('solutions')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 pt-2 w-72">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Small Agencies', desc: 'Up to 30 clients', href: '/#solutions' },
                        { label: 'Medium Agencies', desc: '30–200 clients', href: '/#solutions' },
                        { label: 'Enterprise', desc: '200+ clients', href: '/#solutions' },
                      ].map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setNavDropdown(null)} className="block p-3 rounded-lg hover:bg-dark-700 transition">
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-dark-400 text-xs">{item.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resources dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('resources')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'resources' && (
                  <div className="absolute top-full left-0 pt-2 w-64">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Contact Us', href: '/contact' },
                        { label: 'System Status', href: '/status' },
                        { label: 'Privacy Policy', href: '/privacy' },
                      ].map(item => (
                        <Link key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-dark-700 transition text-white text-sm font-medium">{item.label}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/mobile-app" className="px-3 py-2 text-dark-300 hover:text-white transition">Mobile App</Link>
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
              <Link href="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-primary-400">Features</Link>
              <a href="/#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Solutions</a>
              <Link href="/mobile-app" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Mobile App</Link>
              <a href="/#book-demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Schedule Demo</a>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Contact</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <a href="/#book-demo" onClick={() => setMobileMenuOpen(false)} className="block btn-primary py-2 px-5 text-sm text-center mt-4">Schedule Demo</a>
            </div>
          )}
        </div>
      </nav>

      <main className="pt-28 pb-20">
        {/* Hero */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              Where Care Meets
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> Intelligence</span>
            </h1>
            <p className="text-xl text-dark-300 max-w-3xl mx-auto leading-relaxed">
              PalmCare AI is the first AI-native documentation platform built specifically for home care. Every feature was designed to help you close faster, document smarter, and never lose a client to paperwork again.
            </p>
          </div>
        </section>

        {/* Quick Nav */}
        <section className="px-6 pb-12 sticky top-[73px] z-30 bg-dark-900/80 backdrop-blur-sm py-3">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2">
            {FEATURE_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="px-4 py-2 bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700/50 rounded-lg text-sm font-medium transition border border-dark-700">
                {s.title}
              </a>
            ))}
          </div>
        </section>

        {/* Feature Sections */}
        {FEATURE_SECTIONS.map((section, sIdx) => (
          <section key={section.id} id={section.id} className={`px-6 py-20 ${sIdx % 2 === 1 ? 'bg-dark-800/50' : ''}`}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-primary-400 font-medium mb-2">{section.subtitle}</p>
                <h2 className="text-4xl font-bold text-white mb-4">{section.title}</h2>
                <p className="text-dark-400 max-w-2xl mx-auto">{section.description}</p>
              </div>
              <div className="space-y-12">
                {section.features.map((feature, fIdx) => (
                  <div key={fIdx} className="grid gap-8 items-start md:grid-cols-2">
                    <div className={`min-w-0 ${fIdx % 2 === 1 ? 'md:order-2' : ''}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                          <feature.icon className="w-6 h-6 text-primary-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                      </div>
                      <p className="text-dark-300 leading-relaxed mb-6">{feature.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.highlights.map((h, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-full text-xs text-dark-300">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />{h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`card p-3 md:p-4 min-w-0 ${fIdx % 2 === 1 ? 'md:order-1' : ''}`}>
                      <div className="relative aspect-[4/3] sm:aspect-video bg-dark-900/60 rounded-xl overflow-hidden flex items-center justify-center">
                        <Image
                          src={feature.image}
                          alt={`${feature.title} screenshot`}
                          fill
                          className="object-contain p-2 sm:p-3"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 45vw"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Palm It?</h2>
              <p className="text-xl text-dark-300 mb-8">Book a free demo. See how PalmCare AI turns assessments into signed contracts — automatically.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Palm It — Book a Demo<ArrowRight className="w-5 h-5" /></Link>
              </div>
              <p className="text-dark-400 text-sm mt-6">Free personalized demo &bull; No commitment required</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm mb-4 leading-relaxed">
                Record it. Transcribe it. Contract it. All in your palm. Built for care professionals.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-dark-400 text-sm">HIPAA Compliant</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/mobile-app" className="hover:text-white transition">Mobile App</Link></li>
                <li><a href="/#book-demo" className="hover:text-white transition">Schedule Demo</a></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/status" className="hover:text-white transition">System Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Company</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><a href="/#book-demo" className="hover:text-white transition">Book a Demo</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Legal</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy#hipaa" className="hover:text-white transition">HIPAA Compliance</Link></li>
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
