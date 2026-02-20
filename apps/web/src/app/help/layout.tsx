import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center',
  description:
    'PalmCare AI help center. Find answers to common questions about home care management, assessments, contracts, billing, and caregiver tracking.',
  openGraph: {
    title: 'PalmCare AI Help Center',
    description: 'Guides, FAQs, and support for PalmCare AI users.',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
