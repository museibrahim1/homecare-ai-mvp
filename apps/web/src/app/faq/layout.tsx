import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ: Frequently Asked Questions',
  description:
    'Answers about PalmCare AI setup, pricing (Mobile, Platform, Enterprise), HIPAA, voice assessments, and contract generation.',
  alternates: { canonical: 'https://palmcareai.com/faq' },
  openGraph: {
    title: 'PalmCare AI FAQ',
    description: 'Answers to the most common questions about PalmCare AI home care software.',
    url: 'https://palmcareai.com/faq',
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
