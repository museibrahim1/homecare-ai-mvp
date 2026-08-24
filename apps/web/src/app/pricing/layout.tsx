import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — One Plan for Every Home Care Agency',
  description:
    'Simple pricing for PalmCare AI. One plan, $199/mo, everything included: unlimited assessments, unlimited team members, 50 state contracts. 30-day free trial via Apple In-App Purchase.',
  alternates: { canonical: 'https://palmcareai.com/pricing' },
  openGraph: {
    title: 'PalmCare AI Pricing — One Plan, $199/mo',
    description:
      'Start a 30-day free trial in the iOS app. Everything included for a flat $199 a month after.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
