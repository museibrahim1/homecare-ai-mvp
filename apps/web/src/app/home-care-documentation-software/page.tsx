import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

const TITLE = 'Home Care Documentation Software';
const DESCRIPTION =
  'Home care documentation software that turns a recorded client assessment into a care plan, visit notes, billables, and a state-specific service contract. Built for non-medical home care agencies.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://palmcareai.com/home-care-documentation-software' },
  openGraph: {
    title: `${TITLE} | PalmCare AI`,
    description: DESCRIPTION,
    url: 'https://palmcareai.com/home-care-documentation-software',
    type: 'website',
  },
};

const FAQ = [
  {
    q: 'What is home care documentation software?',
    a: 'Home care documentation software helps agencies capture assessments, care plans, visit notes, and service agreements. PalmCare AI does that from one recording: the care plan, billables, visit notes, and a state-specific contract.',
  },
  {
    q: 'How is PalmCare AI different from a clinical AI scribe?',
    a: 'Clinical scribes focus on charting for Medicare home health and similar clinical settings. PalmCare AI is built for non-medical home care agencies that need care plans, billables, and state-specific service contracts from the assessment conversation.',
  },
  {
    q: 'Does it cover all 50 states?',
    a: 'Yes. PalmCare AI includes state-specific contract rules for all 50 states so the service agreement matches the jurisdiction where care is delivered.',
  },
  {
    q: 'How do I get started?',
    a: 'Create an account at palmcareai.com/register, then start the 30-day free trial in the PalmCare iOS app through Apple (payment method required). Or book a demo at palmcareai.com/book-demo.',
  },
];

export default function HomeCareDocumentationSoftwarePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PalmCare AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS',
    url: 'https://palmcareai.com',
    description: DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '199',
      priceCurrency: 'USD',
      url: 'https://palmcareai.com/pricing',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-slate-900">PalmCare AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/compare" className="hidden sm:block text-slate-600 hover:text-slate-900 text-sm">Compare</Link>
            <Link href="/pricing" className="hidden sm:block text-slate-600 hover:text-slate-900 text-sm">Pricing</Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">
            Home care documentation
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Home care documentation software that finishes the paperwork
          </h1>
          <p className="text-lg text-slate-600 mt-5 leading-relaxed">
            Home care documentation software is the system your agency uses to turn a client assessment into the documents that start care: the care plan, visit notes, billables, and service agreement. PalmCare AI does that from one recording, with state-specific contract rules built in.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary py-3 px-5 text-sm">
              Start free trial
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Book a demo
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">What agencies need from documentation software</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Most home care teams do not need another form to fill. They need the assessment conversation to become usable paperwork without retyping the same facts into four systems.
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3"><span className="text-primary-600 font-bold">1.</span> Capture the visit by voice or notes once.</li>
              <li className="flex gap-3"><span className="text-primary-600 font-bold">2.</span> Produce a care plan and visit notes from that capture.</li>
              <li className="flex gap-3"><span className="text-primary-600 font-bold">3.</span> Extract billable services without a second pass.</li>
              <li className="flex gap-3"><span className="text-primary-600 font-bold">4.</span> Generate a service contract that matches state rules.</li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How PalmCare AI works</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Record the assessment in person or over the phone. PalmCare AI transcribes the conversation, separates speakers, and drafts four documents: care plan, visit notes, billables, and a state-specific service contract. A staff member reviews and approves before anything goes out.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Product facts only: four documents from one recording, 50-state contract rules, and paperwork measured in minutes rather than hours of re-entry.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Who it is for</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Non-medical home care agencies, private duty, and companion care teams that write service agreements after every intake. If your bottleneck is OASIS charting for Medicare home health, a clinical scribe is the better fit. If your bottleneck is intake paperwork and contracts, this category is the right place to look.
            </p>
            <p className="text-slate-600 leading-relaxed">
              See how PalmCare compares to AI scribes, templates, and manual paperwork on our{' '}
              <Link href="/compare" className="text-primary-700 font-medium underline underline-offset-2">
                comparison page
              </Link>
              , browse{' '}
              <Link href="/alternatives" className="text-primary-700 font-medium underline underline-offset-2">
                documentation alternatives
              </Link>
              , or read the{' '}
              <Link href="/blog/paperless-home-care-contracts" className="text-primary-700 font-medium underline underline-offset-2">
                paperless home care contracts
              </Link>
              {' '}guide and the{' '}
              <Link href="/blog/home-care-billables-checklist-after-intake" className="text-primary-700 font-medium underline underline-offset-2">
                billables checklist after intake
              </Link>
              .
            </p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently asked questions</h2>
            <dl className="space-y-6">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-slate-900">{item.q}</dt>
                  <dd className="mt-2 text-slate-600 leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Palm It</h2>
            <p className="text-slate-600 mb-5">
              Record the assessment. Review the drafts. Send the contract. Start at{' '}
              <Link href="https://palmcareai.com" className="text-primary-700 font-medium underline underline-offset-2">
                palmcareai.com
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary py-3 px-5 text-sm">
                Start free trial
              </Link>
              <Link href="/features" className="inline-flex items-center text-sm font-semibold text-primary-700">
                See features
              </Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
