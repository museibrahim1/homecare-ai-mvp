import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import RoiCalculator from '@/components/RoiCalculator';

export const metadata: Metadata = {
  title: 'Home Care Documentation ROI Calculator',
  description:
    'Estimate how many hours and dollars your home care agency could save on documentation with AI. Enter your own numbers — no sign-up required.',
  alternates: { canonical: 'https://palmcareai.com/roi-calculator' },
  openGraph: {
    title: 'Home Care Documentation ROI Calculator | PalmCare AI',
    description:
      'Estimate how many hours and dollars your agency could save on assessment documentation with AI.',
    url: 'https://palmcareai.com/roi-calculator',
  },
};

const FAQ = [
  {
    q: 'How is the savings estimate calculated?',
    a: 'It multiplies your assessments per month by the documentation minutes you spend on each today, then subtracts the time it takes to review PALM’s drafted output. The difference, multiplied by your staff hourly cost, is your estimated savings. Every figure comes from the numbers you enter.',
  },
  {
    q: 'Is this a guarantee of savings?',
    a: 'No. It’s an estimate based on your inputs and a transparent, editable assumption for review time. Actual results depend on your workflow, payer mix, and how your team adopts the tool.',
  },
  {
    q: 'What counts as “documentation time”?',
    a: 'The time staff spend after a visit turning the assessment into a care plan, visit notes, billable items, and a service contract — typing forms, re-keying data, and finding the right state-specific clauses.',
  },
];

export default function RoiCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <nav className="border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={26} height={26} className="object-contain" />
            </div>
            <span className="text-lg font-bold text-slate-900">PalmCare AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition hidden sm:inline">Pricing</Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl mb-10 sm:mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Free tool</p>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Home care documentation ROI calculator
          </h1>
          <p className="text-lg text-slate-600 mt-4 leading-relaxed">
            See how many hours and dollars your agency could get back by turning recorded
            assessments into care plans, notes, billables, and contracts automatically.
            Enter your own numbers — nothing is hidden, and no sign-up is required.
          </p>
        </div>

        <RoiCalculator />

        {/* Methodology / FAQ for SEO + AEO */}
        <section className="max-w-3xl mt-16 sm:mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">How this calculator works</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer text-slate-900 font-medium text-sm flex items-center justify-between hover:bg-slate-50 transition">
                  {f.q}
                  <span className="text-slate-300 group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <div className="px-5 pb-4 text-slate-600 text-sm leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
          <p className="text-slate-600 mt-8">
            Ready to see it on a real visit?{' '}
            <Link href="/register" className="text-primary-700 hover:text-primary-800 font-medium inline-flex items-center gap-1">
              Start a free trial <ArrowRight className="w-4 h-4" />
            </Link>
            {' '}or{' '}
            <Link href="/blog/ai-home-care-documentation-tools-2026" className="text-primary-700 hover:text-primary-800 font-medium">
              compare the AI documentation tools
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
