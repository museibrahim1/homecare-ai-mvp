import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mobile App — Care Assessments in Your Palm',
  description:
    'PalmCare AI mobile app for iOS: record patient assessments on-site, get instant AI transcription, generate care plans and contracts from your phone. Available for home care professionals.',
  alternates: { canonical: 'https://palmcareai.com/mobile-app' },
  openGraph: {
    title: 'PalmCare AI Mobile App — Assessments On the Go',
    description:
      'Record assessments on-site with your iPhone, get instant AI-generated care plans and service contracts. Built for home care agencies.',
    url: 'https://palmcareai.com/mobile-app',
  },
};

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
