import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — AI-Powered Home Care Documentation & CRM',
  description:
    'Explore PalmCare AI features: voice-to-contract assessments, AI transcription, automated care plans, client CRM pipeline, caregiver management, and HIPAA-compliant documentation for home care agencies.',
  alternates: { canonical: 'https://palmcareai.com/features' },
  openGraph: {
    title: 'PalmCare AI Features — Everything Your Agency Needs',
    description:
      'Voice-powered assessments, AI contract generation, client CRM, caregiver scheduling, and billing analytics — all in one platform built for home care.',
    url: 'https://palmcareai.com/features',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
