'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Mic, ArrowRight, Shield, Lock, Zap, Brain, FileText, Users, BarChart3, Calendar, 
  Smartphone, PieChart, Settings, HeartPulse, Globe, Headphones, ClipboardList, TrendingUp, CheckCircle 
} from 'lucide-react';

const FEATURE_SECTIONS = [
  {
    id: 'ai',
    title: 'AI Intelligence',
    subtitle: 'The brain behind your operations',
    description: 'PalmCare AI isn\'t just software with an AI label. Our platform was built from day one with artificial intelligence at its core — powering everything from voice transcription to contract generation.',
    features: [
      {
        icon: Mic,
        title: 'Voice-Powered Assessments',
        description: 'Record care assessments naturally — in person, over the phone, or upload existing recordings. Our AI transcribes conversations with 98%+ accuracy, identifies individual speakers, and understands care-specific terminology that generic transcription services miss.',
        highlights: ['98%+ transcription accuracy', 'Multi-speaker identification', 'Care-specific vocabulary'],
        image: '/screenshots/voice-assessment.png',
      },
      {
        icon: Brain,
        title: 'Smart Contract Generation',
        description: 'AI reads your assessment transcripts and automatically generates professional, proposal-ready contracts. Services, schedules, rates, policies, and billing terms are all populated — saving hours of manual work per client.',
        highlights: ['Auto-populated fields', 'Professional formatting', 'Customizable templates'],
        image: '/screenshots/contract-preview.png',
      },
      {
        icon: Zap,
        title: 'Intelligent Data Extraction',
        description: 'Every voice recording is analyzed for billable items, care needs, medications, special requirements, and safety concerns. The extracted data flows directly into your CRM, contracts, and billing — no double entry.',
        highlights: ['Billable item detection', 'Medication tracking', 'Safety concern flagging'],
        image: '/screenshots/transcript.png',
      },
      {
        icon: FileText,
        title: 'OCR Template Engine',
        description: 'Upload your existing contract templates (Word or PDF) and our OCR engine scans every field, maps it to your database schema, and auto-fills contracts with real client data. When you update your template, the engine reconciles changes automatically.',
        highlights: ['Auto field mapping', 'Version reconciliation', 'Template gallery'],
        image: '/screenshots/templates-gallery.png',
      },
    ],
  },
  {
    id: 'ops',
    title: 'Agency Operations',
    subtitle: 'Your all-in-one management platform',
    description: 'Stop juggling multiple tools. PalmCare AI gives you a unified platform for client management, scheduling, contract management, and team coordination.',
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
        title: 'Contract Management',
        description: 'Create, manage, and track all service agreements from a central hub. Upload templates, preview with live data, export to DOCX, and track contract status — all in one place.',
        highlights: ['Template library', 'Live preview', 'DOCX export'],
        image: '/screenshots/contract-form.png',
      },
      {
        icon: Calendar,
        title: 'Scheduling & Visits',
        description: 'Schedule caregiver visits with drag-and-drop simplicity. Track clock-in/out, manage care plans, and get real-time visibility into every shift across your agency.',
        highlights: ['Drag-and-drop scheduling', 'GPS clock-in/out', 'Real-time tracking'],
        image: '/screenshots/scheduling.png',
      },
      {
        icon: Settings,
        title: 'Custom Forms & Templates',
        description: 'Build customized intake forms, assessments, and contracts. Upload your own templates or choose from our professional gallery — all with auto-populating fields from your client database.',
        highlights: ['Form builder', 'Auto-populate', 'Template gallery'],
        image: '/screenshots/settings.png',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Reports',
    subtitle: 'Get paid faster, make smarter decisions',
    description: 'Automated billing extraction, real-time analytics, and comprehensive reporting — everything you need to maintain healthy cash flow and grow with confidence.',
    features: [
      {
        icon: BarChart3,
        title: 'Automatic Billing Extraction',
        description: 'Our AI extracts billable items directly from care assessments. Hours, rates, services, and special charges are calculated automatically — reducing billing errors by up to 80%.',
        highlights: ['80% fewer errors', 'Auto-calculated rates', 'Service verification'],
        image: '/screenshots/billing-extraction.png',
      },
      {
        icon: PieChart,
        title: 'Revenue Analytics',
        description: 'Real-time dashboards showing revenue, client hours, caregiver utilization, pipeline value, and growth trends. Make data-driven decisions with confidence.',
        highlights: ['Real-time dashboards', 'KPI tracking', 'Growth trends'],
        image: '/screenshots/dashboard.png',
      },
      {
        icon: TrendingUp,
        title: 'Custom Reporting',
        description: 'Generate detailed reports on any metric: billing, payroll, hours billed, referrals, caregiver performance, and more. Export to PDF or Excel for stakeholders and audits.',
        highlights: ['70+ report types', 'PDF/Excel export', 'Audit-ready'],
        image: '/screenshots/reports.png',
      },
    ],
  },
  {
    id: 'caregiver',
    title: 'Caregiver Tools',
    subtitle: 'Empowering your team in the field',
    description: 'Give your caregivers the tools they need to deliver great care — without the complexity. Our mobile app is so intuitive, training takes under 15 minutes.',
    features: [
      {
        icon: Smartphone,
        title: 'Caregiver Mobile App',
        description: 'Caregivers clock in/out via GPS, log ADLs, view schedules, and receive real-time updates — all from their phone. Works offline and syncs when connected.',
        highlights: ['GPS verification', 'Offline capable', '15-min training'],
        image: '/screenshots/care-tracker.png',
      },
      {
        icon: HeartPulse,
        title: 'ADL & Care Logging',
        description: 'Simple tap-to-log interface for Activities of Daily Living. Track bathing, dressing, medication reminders, meals, mobility, and more per visit.',
        highlights: ['Tap-to-log', 'Per-visit tracking', 'Custom ADL categories'],
        image: '/screenshots/adl-logging.png',
      },
      {
        icon: Globe,
        title: 'Agency Dashboard',
        description: 'Agencies get real-time visibility into every caregiver shift, client status, and care delivery metric. Track performance across all locations from a single login.',
        highlights: ['Multi-location view', 'Real-time alerts', 'Performance metrics'],
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
        description: 'Full compliance with HIPAA regulations including administrative, physical, and technical safeguards. Regular third-party audits ensure ongoing compliance.',
        highlights: ['BAA available', 'Regular audits', 'Staff training'],
        image: '/screenshots/security-settings.png',
      },
      {
        icon: Lock,
        title: 'Data Encryption',
        description: '256-bit AES encryption for data at rest and TLS 1.3 for data in transit. Your voice recordings, transcripts, and client data are always protected.',
        highlights: ['256-bit AES', 'TLS 1.3', 'Key management'],
        image: '/screenshots/security-settings.png',
      },
      {
        icon: Headphones,
        title: 'Dedicated Support',
        description: 'All plans include email support with same-day response. Growth and Pro plans get priority phone and live chat support with sub-15-minute response times.',
        highlights: ['Same-day email', '<15 min response', 'Dedicated manager'],
        image: '/screenshots/help-support.png',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#pricing" className="text-dark-300 hover:text-white transition">Pricing</Link>
            <Link href="/#book-demo" className="text-dark-300 hover:text-white transition">Book Demo</Link>
            <Link href="/login" className="text-dark-300 hover:text-white transition">Sign In</Link>
            <Link href="/register" className="btn-primary py-2 px-5 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        {/* Hero */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-white mb-6">
              Where Innovation Meets
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> Functionality</span>
            </h1>
            <p className="text-xl text-dark-300 max-w-3xl mx-auto leading-relaxed">
              From AI-powered voice assessments to caregiver mobile tools, every feature was designed to help your agency deliver better care while spending less time on admin work.
            </p>
          </div>
        </section>

        {/* Quick Nav */}
        <section className="px-6 pb-12 sticky top-[73px] z-30 bg-dark-900/80 backdrop-blur-sm py-3">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2">
            {FEATURE_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="px-4 py-2 bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 rounded-lg text-sm font-medium transition border border-dark-600">
                {s.title}
              </a>
            ))}
          </div>
        </section>

        {/* Feature Sections */}
        {FEATURE_SECTIONS.map((section, sIdx) => (
          <section key={section.id} id={section.id} className={`px-6 py-20 ${sIdx % 2 === 1 ? 'bg-dark-800/30' : ''}`}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-primary-400 font-medium mb-2">{section.subtitle}</p>
                <h2 className="text-4xl font-bold text-white mb-4">{section.title}</h2>
                <p className="text-dark-400 max-w-2xl mx-auto">{section.description}</p>
              </div>
              <div className="space-y-12">
                {section.features.map((feature, fIdx) => (
                  <div key={fIdx} className={`grid md:grid-cols-2 gap-8 items-center ${fIdx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                    <div className={fIdx % 2 === 1 ? 'md:order-2' : ''}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                          <feature.icon className="w-6 h-6 text-primary-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                      </div>
                      <p className="text-dark-300 leading-relaxed mb-6">{feature.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.highlights.map((h, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-full text-xs text-dark-300">
                            <CheckCircle className="w-3 h-3 text-green-400" />{h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`card p-3 ${fIdx % 2 === 1 ? 'md:order-1' : ''}`}>
                      <div className="aspect-video bg-dark-700 rounded-xl overflow-hidden relative">
                        <Image
                          src={feature.image}
                          alt={`${feature.title} screenshot`}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, 50vw"
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
              <h2 className="text-3xl font-bold text-white mb-4">Ready to See These Features in Action?</h2>
              <p className="text-xl text-dark-300 mb-8">Book a free 30-minute demo and we&apos;ll show you exactly how PalmCare AI can streamline your agency.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Start Free Trial<ArrowRight className="w-5 h-5" /></Link>
                <Link href="/#book-demo" className="btn-secondary py-4 px-8 text-lg">Book a Demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><span className="text-dark-400 text-sm">HIPAA Compliant</span></div>
            <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-400" /><span className="text-dark-400 text-sm">256-bit Encrypted</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
