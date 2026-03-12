'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ArrowRight, HelpCircle, Plus, Minus } from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    name: 'Getting Started',
    faqs: [
      {
        q: 'What is PalmCare AI?',
        a: 'PalmCare AI is an AI-native documentation platform built specifically for home care agencies. It turns voice-recorded client assessments into signed service contracts automatically — eliminating manual data entry, form-filling, and paperwork delays.',
      },
      {
        q: 'How does the voice assessment feature work?',
        a: 'Tap record and have a natural conversation with the client. Our AI (powered by Deepgram Nova-3) transcribes the conversation in real time, identifies who is speaking, and automatically extracts care needs, services, medications, and billing items. No forms to fill out — just talk.',
      },
      {
        q: 'How long does it take to get set up?',
        a: 'Most agencies are up and running within 24 hours. Our onboarding team helps migrate your existing data, configure your templates, and train your staff. Caregivers typically learn the mobile app in under 15 minutes.',
      },
      {
        q: 'Do you offer a free trial?',
        a: 'Yes — every plan comes with a 14-day free trial with full access to all features. No credit card required. You can also book a free 30-minute demo with our team to see the platform in action before signing up.',
      },
      {
        q: 'What devices and browsers does PalmCare AI support?',
        a: 'The web dashboard works on all modern browsers (Chrome, Safari, Firefox, Edge). The mobile companion app is available for iOS with Android coming soon. Voice recording works on any device with a microphone.',
      },
    ],
  },
  {
    name: 'Features & Capabilities',
    faqs: [
      {
        q: 'What makes PalmCare AI different from AxisCare, WellSky, or CareTime?',
        a: 'Those are legacy scheduling and billing systems — they digitized paper forms but didn\'t eliminate them. PalmCare AI is AI-first: voice-powered assessments, automatic contract generation, smart billing extraction, and an intelligent CRM. Your data flows from a voice recording to a signed contract without manual re-entry.',
      },
      {
        q: 'How does automatic contract generation work?',
        a: 'After the AI transcribes and analyzes your assessment conversation, it maps the extracted data — services, hours, rates, diagnoses, and state-specific requirements — into a compliant service agreement template. The contract is pre-filled and ready for review in seconds, not hours.',
      },
      {
        q: 'Can I use my existing contract templates?',
        a: 'Yes! Upload your existing Word or PDF templates. Our OCR Template Engine scans every field, maps it to your database, and auto-fills contracts with client data. When you update your template, the engine reconciles changes.',
      },
      {
        q: 'Does PalmCare AI handle billing?',
        a: 'Yes. The system automatically identifies billable items from assessment conversations, calculates hours based on the service plan, and generates invoices aligned with payer requirements. It supports Medicaid, Medicare, and private-pay billing workflows.',
      },
      {
        q: 'Can caregivers use PalmCare AI on their phones?',
        a: 'Absolutely. Our iOS companion app lets caregivers clock in/out via GPS, log Activities of Daily Living (ADLs), view their schedule, and receive real-time updates. Agencies can track all caregiver activity from the admin dashboard.',
      },
      {
        q: 'Does the AI support multiple languages?',
        a: 'Our transcription engine supports 36+ languages including Spanish, Mandarin, Tagalog, French, and Haitian Creole — covering the most common languages spoken in home care settings across the US.',
      },
    ],
  },
  {
    name: 'Security & Compliance',
    faqs: [
      {
        q: 'Is PalmCare AI HIPAA compliant?',
        a: 'Yes. We use 256-bit AES encryption for data at rest and in transit, role-based access controls, comprehensive audit trails, and secure cloud infrastructure. All voice recordings and patient data are handled in full compliance with HIPAA regulations. We provide a Business Associate Agreement (BAA) for all agency plans.',
      },
      {
        q: 'Where is my data stored?',
        a: 'All data is stored on SOC 2 compliant cloud infrastructure in the United States. Data is encrypted at rest with AES-256 and in transit with TLS 1.3. We never sell or share your data with third parties.',
      },
      {
        q: 'Who can access client records?',
        a: 'PalmCare AI uses role-based access controls. Agency administrators define who can view, edit, or export client data. Every access is logged in a comprehensive audit trail.',
      },
      {
        q: 'Do you comply with state-specific home care regulations?',
        a: 'Yes. Our contract generation engine includes a 50-state knowledge base with state-specific documentation requirements, mandatory clauses, and regulatory compliance rules. Contracts are automatically tailored to your state\'s requirements.',
      },
    ],
  },
  {
    name: 'Pricing & Support',
    faqs: [
      {
        q: 'How much does PalmCare AI cost?',
        a: 'We offer three plans designed for different agency sizes: Starter (up to 30 clients), Growth (30–200 clients), and Enterprise (200+ clients). All plans include the core AI features. Book a demo for a personalized quote based on your agency\'s needs.',
      },
      {
        q: 'What support is included?',
        a: 'All plans include email support with same-day response. Growth and Enterprise plans include priority live chat and phone support with average response times under 15 minutes. Enterprise customers get a dedicated account manager and custom SLA.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. If you cancel, you\'ll retain access through the end of your billing period.',
      },
      {
        q: 'Do you help with data migration from our current system?',
        a: 'Yes. Our onboarding team assists with data migration from any existing system — whether you\'re using spreadsheets, paper files, or another software platform. We\'ll import your client records, caregiver profiles, and templates.',
      },
    ],
  },
];

const ALL_FAQS = FAQ_CATEGORIES.flatMap((c) => c.faqs);

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-700 rounded-xl overflow-hidden transition-colors hover:border-dark-600">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-white font-medium pr-4">{q}</span>
        {open ? (
          <Minus className="w-5 h-5 text-primary-400 shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-dark-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-dark-400 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: ALL_FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" />
            </div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-dark-300 hover:text-white transition text-sm">Home</Link>
            <Link href="/features" className="text-dark-300 hover:text-white transition text-sm">Features</Link>
            <Link href="/blog" className="text-dark-300 hover:text-white transition text-sm">Blog</Link>
            <Link href="/faq" className="text-white font-medium text-sm">FAQ</Link>
            <a href="/#book-demo" className="btn-primary py-2 px-4 text-sm">Book Demo</a>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500/10 rounded-2xl mb-6">
              <HelpCircle className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              Everything you need to know about PalmCare AI. Can&apos;t find what you&apos;re looking for?{' '}
              <Link href="/contact" className="text-primary-400 hover:text-primary-300 transition underline underline-offset-2">
                Contact our team
              </Link>
              .
            </p>
          </div>

          {FAQ_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-5">{category.name}</h2>
              <div className="space-y-3">
                {category.faqs.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border border-primary-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">Still have questions?</h3>
            <p className="text-dark-400 mb-6">
              Book a free demo and our team will walk you through everything — tailored to your agency.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/#book-demo" className="btn-primary py-3 px-8 text-base inline-flex items-center gap-2">
                Book Your Free Demo <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/contact" className="py-3 px-8 text-base text-dark-300 hover:text-white border border-dark-600 hover:border-dark-500 rounded-xl transition inline-flex items-center gap-2">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-dark-400 text-sm">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
