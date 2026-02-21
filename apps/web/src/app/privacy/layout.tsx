import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'PalmCare AI Privacy Policy — Learn how we collect, use, and protect your data. HIPAA-ready security with 256-bit encryption.',
  openGraph: {
    title: 'Privacy Policy — PalmCare AI',
    description: 'How PalmCare AI collects, uses, and protects your data.',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
