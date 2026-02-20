import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Plans for Every Home Care Agency',
  description:
    'Transparent pricing for PalmCare AI. Choose Starter, Growth, or Pro plans. AI-powered assessments, contract generation, and CRM for home care agencies.',
  openGraph: {
    title: 'PalmCare AI Pricing — Plans for Every Agency',
    description:
      'Start free, upgrade as you grow. AI-powered home care management from $299/mo.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
