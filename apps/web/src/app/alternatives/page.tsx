import Link from 'next/link';
import type { Metadata } from 'next';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

const TITLE = 'Home Care Documentation Alternatives';
const DESCRIPTION =
  'Alternatives to typing home care assessments after every visit: voice-to-contract software, AI clinical scribes, templates, and manual paperwork. Which option fits non-medical agencies.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://palmcareai.com/alternatives' },
  openGraph: {
    title: `${TITLE} | PalmCare AI`,
    description: DESCRIPTION,
    url: 'https://palmcareai.com/alternatives',
    type: 'website',
  },
};

const OPTIONS = [
  {
    name: 'PalmCare AI (voice to contract)',
    bestFor: 'Non-medical home care agencies that need care plans, billables, visit notes, and state-specific service contracts from one recording.',
    tradeoff: 'Best when intake paperwork and contracts are the bottleneck. Not a Medicare OASIS charting tool.',
    href: '/home-care-documentation-software',
  },
  {
    name: 'AI clinical scribes',
    bestFor: 'Clinicians who need ambient notes and charting inside a home health or behavioral workflow.',
    tradeoff: 'Produces clinical documentation. Does not write client service agreements with 50-state rules.',
    href: '/compare',
  },
  {
    name: 'Contract and proposal templates',
    bestFor: 'Small teams that already maintain state-compliant Word or PDF templates and have time to edit each agreement.',
    tradeoff: 'You still re-enter assessment details and keep clauses current yourself.',
    href: '/blog/how-to-write-home-care-service-agreement',
  },
  {
    name: 'Manual paperwork',
    bestFor: 'Agencies with very low intake volume and no urgency to shorten documentation time.',
    tradeoff: 'Highest risk of missing billables and inconsistent contracts across staff.',
    href: '/blog/how-to-do-home-care-client-assessment',
  },
];

export default function AlternativesPage() {
  return (
    <GlassMarketingShell>
      <main className="px-5 sm:px-10 lg:px-16 py-10 sm:py-14 pb-20">
        <article className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Alternatives</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#10211F] tracking-tight leading-tight">
            Alternatives to typing the assessment after every visit
          </h1>
          <p className="text-lg text-[#4B6B66] mt-5 leading-relaxed">
            If your team finishes every visit by retyping the same facts into a care plan, a note, a billing sheet, and a contract, you have four realistic alternatives. Pick the one that matches the job, not the loudest demo.
          </p>

          <ol className="mt-12 space-y-8">
            {OPTIONS.map((opt, i) => (
              <li key={opt.name} className="border-b border-[#10211F12] pb-8 last:border-0">
                <p className="text-sm font-semibold text-primary-600 mb-1">Option {i + 1}</p>
                <h2 className="text-xl font-bold text-[#10211F] mb-3">
                  <Link href={opt.href} className="hover:text-primary-700">
                    {opt.name}
                  </Link>
                </h2>
                <p className="text-[#4B6B66] leading-relaxed mb-2">
                  <strong className="text-[#10211F]">Best for:</strong> {opt.bestFor}
                </p>
                <p className="text-[#4B6B66] leading-relaxed">
                  <strong className="text-[#10211F]">Tradeoff:</strong> {opt.tradeoff}
                </p>
              </li>
            ))}
          </ol>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-[#10211F] mb-4">How to decide quickly</h2>
            <p className="text-[#4B6B66] leading-relaxed mb-4">
              Ask one question: what document must exist before care starts? If the answer is a signed service agreement tied to the assessment, prioritize voice-to-contract software or disciplined templates. If the answer is a clinical chart for a certified episode, prioritize a scribe.
            </p>
            <p className="text-[#4B6B66] leading-relaxed">
              For a side-by-side capability table, open the{' '}
              <Link href="/compare" className="text-primary-700 font-medium underline underline-offset-2">
                full comparison
              </Link>
              . For category context, read{' '}
              <Link href="/home-care-documentation-software" className="text-primary-700 font-medium underline underline-offset-2">
                home care documentation software
              </Link>
              .
            </p>
          </section>

          <section className="mt-14 glass-card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#10211F] mb-2">Try the voice-to-contract path</h2>
            <p className="text-[#4B6B66] mb-5">
              PalmCare AI writes four documents from one recording. Review before anything sends. Palm It.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="py-3 px-5 text-sm rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600">
                Start free trial
              </Link>
              <Link href="/book-demo" className="inline-flex items-center text-sm font-semibold text-primary-700">
                Book a demo
              </Link>
            </div>
          </section>
        </article>
      </main>
    </GlassMarketingShell>
  );
}
