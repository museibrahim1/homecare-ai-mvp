import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — One Plan for Every Home Care Agency',
  description:
    'Simple pricing for PalmCare AI. One plan, $199/mo, everything included: unlimited assessments, unlimited team members, 50 state contracts. Start with a 14-day free trial.',
  openGraph: {
    title: 'PalmCare AI Pricing — One Plan, $199/mo',
    description:
      'Start with a free trial. Everything included for a flat $199 a month.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
