import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download PALM',
  robots: { index: false, follow: false },
};

export default function AppHopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
