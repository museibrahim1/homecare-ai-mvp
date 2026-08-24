import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registration Status',
  robots: { index: false, follow: false },
};

export default function RegisterStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
