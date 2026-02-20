import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Your Free Trial',
  description:
    'Create your PalmCare AI account. 14-day free trial, no credit card required. AI-powered home care management for agencies of all sizes.',
  openGraph: {
    title: 'Start Your Free Trial — PalmCare AI',
    description:
      'Sign up in 60 seconds. Turn voice assessments into contracts with AI.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
