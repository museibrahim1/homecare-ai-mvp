import Link from 'next/link';
import type { Metadata } from 'next';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

const TITLE = 'Compare Home Care Documentation Options';
const DESCRIPTION =
  'Compare PalmCare AI with AI clinical scribes, OASIS tools, contract templates, and manual paperwork. PalmCare is for non-medical home care contracts and care plans, not Medicare OASIS.';

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
    <GlassMarketingShell>
      <main className="px-5 sm:px-10 lg:px-16 py-10 sm:py-14 pb-20">
        <article className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Comparison</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#10211F] tracking-tight leading-tight max-w-3xl">
            PalmCare AI vs AI scribes vs templates vs manual paperwork
          </h1>
          <p className="text-lg text-[#4B6B66] mt-5 leading-relaxed max-w-3xl">
            After a home care assessment, agencies usually pick one of four paths. This page compares what each path actually produces. No invented rankings. Product facts only.
          </p>

          <div className="mt-10 overflow-x-auto rounded-2xl glass-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#10211F12]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[#7A8C88]">Capability</th>
                  <th className="px-4 py-3 font-semibold text-primary-700">PalmCare AI</th>
                  <th className="px-4 py-3 font-semibold text-[#4B6B66]">AI clinical scribes</th>
                  <th className="px-4 py-3 font-semibold text-[#4B6B66]">Templates</th>
                  <th className="px-4 py-3 font-semibold text-[#4B6B66]">Manual</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-[#10211F0A] last:border-0">
                    <th className="px-4 py-3 font-medium text-[#10211F] align-top">{row.label}</th>
                    <td className="px-4 py-3 text-[#10211F] align-top bg-primary-500/5">{row.palm}</td>
                    <td className="px-4 py-3 text-[#4B6B66] align-top">{row.scribes}</td>
                    <td className="px-4 py-3 text-[#4B6B66] align-top">{row.templates}</td>
                    <td className="px-4 py-3 text-[#4B6B66] align-top">{row.manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold text-[#10211F] mb-4">When to choose each option</h2>
            <div className="space-y-6 text-[#4B6B66] leading-relaxed">
              <p>
                <strong className="text-[#10211F]">Choose PalmCare AI</strong> when the job is non-medical home care intake: care plan, billables, visit notes, and a state-specific service contract from the same recording.
              </p>
              <p>
                <strong className="text-[#10211F]">Choose an AI clinical scribe</strong> when the job is Medicare home health charting, OASIS documentation, or clinical notes. Scribes do not produce client service agreements.
              </p>
              <p>
                <strong className="text-[#10211F]">Choose templates</strong> when volume is low and someone on staff will keep state clauses current by hand.
              </p>
              <p>
                <strong className="text-[#10211F]">Choose manual paperwork</strong> only when you accept re-keying the same assessment into multiple documents every visit.
              </p>
            </div>
          </section>

          <section className="mt-14 max-w-3xl glass-card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#10211F] mb-4">Is PalmCare AI for OASIS or AI OASIS documentation?</h2>
            <p className="text-[#4B6B66] leading-relaxed">
              No. PalmCare AI is built for <strong className="text-[#10211F]">non-medical and private-duty home care</strong> agencies that need care plans, billables, visit notes, and state-specific service contracts. It is not an OASIS tool and it is not a Medicare home health clinical scribe. If your search was for OASIS or hospice clinical AI documentation, use a clinical scribe product instead. If your bottleneck is intake paperwork and signed service agreements, PalmCare is the fit.
            </p>
          </section>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-bold text-[#10211F] mb-4">Related reading</h2>
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
                <Link href="/blog/home-care-billables-checklist-after-intake" className="underline underline-offset-2">
                  Home care billables checklist after intake
                </Link>
              </li>
              <li>
                <Link href="/blog/paperless-home-care-contracts" className="underline underline-offset-2">
                  Paperless home care contracts
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

          <section className="mt-14 glass-card p-6 sm:p-8 max-w-3xl">
            <h2 className="text-xl font-bold text-[#10211F] mb-2">See PalmCare on a real assessment</h2>
            <p className="text-[#4B6B66] mb-5">
              Book a demo or start the 30-day trial in the iOS app. Palm It at palmcareai.com.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/book-demo" className="py-3 px-5 text-sm rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600">
                Book a demo
              </Link>
              <Link href="/register" className="inline-flex items-center text-sm font-semibold text-primary-700">
                Start free trial
              </Link>
            </div>
          </section>
        </article>
      </main>
    </GlassMarketingShell>
  );
}
