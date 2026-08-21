import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Your Free Trial',
  description:
    'Join the pros who Palm It. Create your account, then start a 30-day free trial in the iOS app via Apple. Auto-charges after the trial unless you cancel.',
  openGraph: {
    title: 'Start Your Free Trial — PalmCare AI',
    description:
      'Palm It — record assessments, generate contracts in seconds. Built for care professionals.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
