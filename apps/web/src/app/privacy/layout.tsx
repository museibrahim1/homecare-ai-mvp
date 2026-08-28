import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'PalmCare AI Privacy Policy. Learn how we collect, use, and protect your data. HIPAA-ready security with 256-bit encryption.',
  alternates: { canonical: 'https://palmcareai.com/privacy' },
  openGraph: {
    title: 'Privacy Policy: PalmCare AI',
    description:
      'PalmCare AI Privacy Policy. Learn how we collect, use, and protect your data.',
    url: 'https://palmcareai.com/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
