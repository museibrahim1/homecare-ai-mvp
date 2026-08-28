import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mobile App: Care Assessments in Your Palm',
  description:
    'Record home care assessments on iPhone. PalmCare AI turns the visit into a care plan, billables, notes, and a state-specific contract.',
  alternates: { canonical: 'https://palmcareai.com/mobile-app' },
  openGraph: {
    title: 'PalmCare AI Mobile App: Assessments On the Go',
    description:
      'Record home care assessments on iPhone. PalmCare AI turns the visit into a care plan, billables, notes, and a state-specific contract.',
    url: 'https://palmcareai.com/mobile-app',
  },
};

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
