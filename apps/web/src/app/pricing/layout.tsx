import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Plans for Every Home Care Agency',
  description:
    'Transparent pricing for PalmCare AI. Choose Starter ($380/mo), Growth ($640/mo), or Pro ($1,299/mo). Record. Transcribe. Contract. Built for home care agencies.',
  openGraph: {
    title: 'PalmCare AI Pricing — Plans for Every Agency',
    description:
      'Start with a free trial. Close faster, document smarter. Plans from $380/mo.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
