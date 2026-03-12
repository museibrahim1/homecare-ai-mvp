import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'PalmCare AI terms of service — the legal agreement governing use of our home care documentation and CRM platform.',
  alternates: { canonical: 'https://palmcareai.com/terms' },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
