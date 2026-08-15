import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

const TITLE = 'Compare Home Care Documentation Options';
const DESCRIPTION =
  'Compare PalmCare AI with AI clinical scribes, contract templates, and manual paperwork. See what each option produces after a home care assessment.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://palmcareai.com/compare' },
  openGraph: {
    title: `${TITLE} | PalmCare AI`,
    description: DESCRIPTION,
    url: 'https://palmcareai.com/compare',
    type: 'website',
  },
};

const ROWS = [
  {
    label: 'Built for',
    palm: 'Home care agencies',
    scribes: 'Medicare home health and clinical charting',
    templates: 'General documents',
    manual: 'Any agency with time to spare',
  },
  {
    label: 'Captures the visit by voice',
    palm: 'Yes',
    scribes: 'Yes',
    templates: 'No',
    manual: 'No',
  },
  {
    label: 'State-specific service contract',
    palm: 'Automatic (50 states)',
    scribes: 'No',
    templates: 'Manual editing',
    manual: 'Manual',
  },
  {
    label: 'Care plan, notes, and billables',
    palm: 'Yes',
    scribes: 'Clinical notes only',
    templates: 'No',
    manual: 'Manual',
  },
  {
    label: 'Time to a ready-to-sign agreement',
    palm: 'Minutes after review',
    scribes: 'Not produced',
    templates: 'Hours',
    manual: 'Hours',
  },
];

export default function ComparePage() {
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
            <Link href="/home-care-documentation-software" className="hidden sm:block text-slate-600 hover:text-slate-900 text-sm">
              Documentation software
            </Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-sm">Start free trial</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <article className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Comparison</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl">
            PalmCare AI vs AI scribes vs templates vs manual paperwork
          </h1>
          <p className="text-lg text-slate-600 mt-5 leading-relaxed max-w-3xl">
            After a home care assessment, agencies usually pick one of four paths. This page compares what each path actually produces. No invented rankings. Product facts only.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-500">Capability</th>
                  <th className="px-4 py-3 font-semibold text-primary-700">PalmCare AI</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">AI clinical scribes</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Templates</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Manual</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <th className="px-4 py-3 font-medium text-slate-900 align-top">{row.label}</th>
                    <td className="px-4 py-3 text-slate-800 align-top bg-teal-50/40">{row.palm}</td>
                    <td className="px-4 py-3 text-slate-600 align-top">{row.scribes}</td>
                    <td className="px-4 py-3 text-slate-600 align-top">{row.templates}</td>
                    <td className="px-4 py-3 text-slate-600 align-top">{row.manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">When to choose each option</h2>
            <div className="space-y-6 text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">Choose PalmCare AI</strong> when the job is non-medical home care intake: care plan, billables, visit notes, and a state-specific service contract from the same recording.
              </p>
              <p>
                <strong className="text-slate-900">Choose an AI clinical scribe</strong> when the job is Medicare home health charting, OASIS documentation, or clinical notes. Scribes do not produce client service agreements. PalmCare AI is built for non-medical home care contracts and care plans, not OASIS.
              </p>
              <p>
                <strong className="text-slate-900">Choose templates</strong> when volume is low and someone on staff will keep state clauses current by hand.
              </p>
              <p>
                <strong className="text-slate-900">Choose manual paperwork</strong> only when you accept re-keying the same assessment into multiple documents every visit.
              </p>
            </div>
          </section>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Related reading</h2>
            <ul className="space-y-2 text-primary-700">
              <li>
                <Link href="/home-care-documentation-software" className="underline underline-offset-2">
                  What home care documentation software is
                </Link>
              </li>
              <li>
                <Link href="/alternatives" className="underline underline-offset-2">
                  Alternatives to typing assessments after every visit
                </Link>
              </li>
              <li>
                <Link href="/blog/ai-home-care-documentation-tools-2026" className="underline underline-offset-2">
                  AI home care documentation tools compared
                </Link>
              </li>
              <li>
                <Link href="/blog/best-ai-tools-home-care-agencies-2026" className="underline underline-offset-2">
                  Best AI tools for home care agencies in 2026
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-14 rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8 max-w-3xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">See PalmCare on a real assessment</h2>
            <p className="text-slate-600 mb-5">
              Book a demo or start the 14-day trial. Palm It at palmcareai.com.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/book-demo" className="btn-primary py-3 px-5 text-sm">
                Book a demo
              </Link>
              <Link href="/register" className="inline-flex items-center text-sm font-semibold text-primary-700">
                Start free trial
              </Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
