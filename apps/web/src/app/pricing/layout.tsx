import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Mobile, Platform, and Enterprise',
  description:
    'PalmCare AI pricing: Mobile $89.99/mo for iPhone assessments, Platform $199.99/mo for web CRM plus mobile, Enterprise by quote. 30-day free trial via Apple In-App Purchase.',
  alternates: { canonical: 'https://palmcareai.com/pricing' },
  openGraph: {
    title: 'PalmCare AI Pricing — Mobile, Platform, Enterprise',
    description:
      'Mobile $89.99, Platform $199.99, or request an Enterprise quote. Start a 30-day free trial in the iOS app.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
