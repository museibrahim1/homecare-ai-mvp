import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'Live status updates for PalmCare AI services. Check current system health, active incidents, and maintenance schedules.',
  alternates: { canonical: 'https://palmcareai.com/status' },
  openGraph: {
    title: 'System Status — PalmCare AI',
    description: 'Live status updates for PalmCare AI services.',
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
