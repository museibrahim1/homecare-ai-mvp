'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HelpCircle, Plus, Minus } from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

const FAQ_CATEGORIES = [
  {
    name: 'Getting Started',
    faqs: [
      {
        q: 'What is PalmCare AI?',
        a: 'PalmCare AI is an AI-native documentation platform built for home care agencies. It turns voice-recorded client assessments into notes, billables, and service agreements so staff spend less time on re-entry.',
      },
      {
        q: 'How does the voice assessment feature work?',
        a: 'Tap record and have a natural conversation with the client. AI transcribes the conversation, identifies who is speaking, and extracts care needs, services, medications, and billing items. No forms to fill out. Just talk.',
      },
      {
        q: 'How long does it take to get set up?',
        a: 'Most agencies are up and running within 24 hours. Our onboarding team helps migrate your existing data, configure your templates, and train your staff. Caregivers typically learn the mobile app in under 15 minutes.',
      },
      {
        q: 'Do you offer a free trial?',
        a: 'Yes. Mobile and Platform include a 30-day free trial when you subscribe in the PalmCare iOS app. An Apple ID payment method is required. You can also book a demo with our team before signing up.',
      },
      {
        q: 'What devices and browsers does PalmCare AI support?',
        a: 'The web dashboard works on Chrome, Safari, Firefox, and Edge. The mobile companion app is available for iOS. Voice recording works on any device with a microphone.',
      },
    ],
  },
  {
    name: 'Features & Capabilities',
    faqs: [
      {
        q: 'What makes PalmCare AI different from AxisCare, WellSky, or CareTime?',
        a: 'Those platforms focus on scheduling and billing workflows. PalmCare is AI-first: voice assessments, automatic contract generation, billing extraction from the visit, and a CRM built around that pipeline.',
      },
      {
        q: 'How does automatic contract generation work?',
        a: 'After AI transcribes and analyzes the assessment, it maps services, hours, rates, and state-specific requirements into a service agreement. The contract is pre-filled and ready for review in minutes.',
      },
      {
        q: 'Can I use my existing contract templates?',
        a: 'PalmCare generates the service agreement from the visit using the PALM template. Agencies review and send that document. Custom Word or PDF uploads are not supported.',
      },
      {
        q: 'Does PalmCare AI handle billing?',
        a: 'The system identifies billable items from assessment conversations and surfaces hours, rates, and services for review. It supports Medicaid, Medicare, and private-pay workflows in the product.',
      },
      {
        q: 'Can caregivers use PalmCare AI on their phones?',
        a: 'Yes. The iOS app lets staff record assessments, manage clients, and run the documentation pipeline from the field.',
      },
    ],
  },
  {
    name: 'Security & Compliance',
    faqs: [
      {
        q: 'Is PalmCare AI HIPAA compliant?',
        a: 'Yes. We use encryption for data at rest and in transit, role-based access controls, audit trails, and secure cloud infrastructure. We provide a Business Associate Agreement (BAA) for agency plans.',
      },
      {
        q: 'Where is my data stored?',
        a: 'All data is stored on SOC 2 compliant cloud infrastructure in the United States. We never sell your data to third parties.',
      },
      {
        q: 'Who can access client records?',
        a: 'PalmCare uses role-based access controls. Agency administrators define who can view, edit, or export client data. Access is logged in an audit trail.',
      },
      {
        q: 'Do you comply with state-specific home care regulations?',
        a: 'Our contract generation engine includes a 50-state knowledge base with state-specific documentation requirements and mandatory clauses. Contracts are tailored to your state.',
      },
    ],
  },
  {
    name: 'Pricing & Support',
    faqs: [
      {
        q: 'How much does PalmCare AI cost?',
        a: 'Three options. PalmCare Mobile is $89.99/mo with 15 assessments and 30 clients per month. PalmCare Platform is $199.99/mo with 30 assessments and 150 clients, plus team seats and fuller CRM. Enterprise is a custom quote. Mobile and Platform start with a 30-day free trial in the iOS app.',
      },
      {
        q: 'What support is included?',
        a: 'Every subscription includes priority support and a HIPAA BAA. Reach the team by email and in-app.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Manage or cancel in the PalmCare iOS app or Apple Subscriptions. You keep access through the end of the billing period.',
      },
      {
        q: 'Do you help with data migration from our current system?',
        a: 'Yes. Onboarding can help import client records and related data from spreadsheets, paper files, or another platform.',
      },
    ],
  },
];

const ALL_FAQS = FAQ_CATEGORIES.flatMap((c) => c.faqs);

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-[#10211F] font-medium pr-4">{q}</span>
        {open ? (
          <Minus className="w-5 h-5 text-primary-600 shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-[#7A8C88] shrink-0" />
        )}
      </button>
      {open && <div className="px-5 pb-5 text-[#4B6B66] leading-relaxed">{a}</div>}
    </div>
  );
}

export default function FaqPage() {
  return (
    <GlassMarketingShell>
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

      <main className="max-w-3xl mx-auto px-5 sm:px-10 py-10 sm:py-14 pb-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500/10 rounded-2xl mb-6">
            <HelpCircle className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#10211F] mb-4 tracking-tight">
            Frequently asked questions
          </h1>
          <p className="text-lg text-[#4B6B66] max-w-2xl mx-auto">
            Everything you need to know about PalmCare AI. Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/contact" className="text-primary-700 font-medium hover:text-primary-800 underline underline-offset-2">
              Contact our team
            </Link>
            .
          </p>
        </div>

        {FAQ_CATEGORIES.map((category) => (
          <div key={category.name} className="mb-12">
            <h2 className="text-2xl font-bold text-[#10211F] mb-5">{category.name}</h2>
            <div className="space-y-3">
              {category.faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-12 glass-card p-8 text-center">
          <h3 className="text-2xl font-bold text-[#10211F] mb-3">Still have questions?</h3>
          <p className="text-[#4B6B66] mb-6">Book a demo and we will walk through the product for your agency.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="py-3 px-7 rounded-full bg-primary-500 text-white font-semibold inline-flex items-center gap-2 hover:bg-primary-600"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="py-3 px-7 rounded-full border border-[#10211F18] text-[#10211F] font-semibold hover:bg-white/40"
            >
              Contact us
            </Link>
          </div>
        </div>
      </main>
    </GlassMarketingShell>
  );
}
