import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Your Free Trial',
  description:
    'Join the pros who Palm It. 14-day free trial, no credit card required. Close faster, document smarter — never lose a client to paperwork again.',
  openGraph: {
    title: 'Start Your Free Trial — PalmCare AI',
    description:
      'Palm It — record assessments, generate contracts in seconds. Built for care professionals.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
