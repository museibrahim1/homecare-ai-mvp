import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Demo',
  description:
    'Schedule a 15-minute PalmCare AI demo. See how home care agencies record assessments and get care plans, billables, notes, and state-specific contracts from one visit.',
  alternates: { canonical: 'https://palmcareai.com/book-demo' },
  openGraph: {
    title: 'Book a Demo — PalmCare AI',
    description: 'Schedule a short walkthrough of voice-to-contract documentation for home care agencies.',
    url: 'https://palmcareai.com/book-demo',
    type: 'website',
  },
};

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
