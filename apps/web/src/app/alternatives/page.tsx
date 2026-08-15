import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

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
    <div className="min-h-screen bg-white">
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
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Alternatives</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Alternatives to typing the assessment after every visit
          </h1>
          <p className="text-lg text-slate-600 mt-5 leading-relaxed">
            If your team finishes every visit by retyping the same facts into a care plan, a note, a billing sheet, and a contract, you have four realistic alternatives. Pick the one that matches the job, not the loudest demo.
          </p>

          <ol className="mt-12 space-y-8">
            {OPTIONS.map((opt, i) => (
              <li key={opt.name} className="border-b border-slate-200 pb-8 last:border-0">
                <p className="text-sm font-semibold text-primary-600 mb-1">Option {i + 1}</p>
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  <Link href={opt.href} className="hover:text-primary-700">
                    {opt.name}
                  </Link>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-2">
                  <strong className="text-slate-800">Best for:</strong> {opt.bestFor}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Tradeoff:</strong> {opt.tradeoff}
                </p>
              </li>
            ))}
          </ol>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How to decide quickly</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Ask one question: what document must exist before care starts? If the answer is a signed service agreement tied to the assessment, prioritize voice-to-contract software or disciplined templates. If the answer is a clinical chart for a certified episode, prioritize a scribe.
            </p>
            <p className="text-slate-600 leading-relaxed">
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

          <section className="mt-14 rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Try the voice-to-contract path</h2>
            <p className="text-slate-600 mb-5">
              PalmCare AI writes four documents from one recording. Review before anything sends. Palm It.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary py-3 px-5 text-sm">
                Start free trial
              </Link>
              <Link href="/book-demo" className="inline-flex items-center text-sm font-semibold text-primary-700">
                Book a demo
              </Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
