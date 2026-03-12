import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Built by Someone Who Knows Home Care',
  description:
    'PalmCare AI was founded by Muse Ibrahim to solve the documentation crisis in home care. Learn about our mission to eliminate paperwork and help agencies get to revenue faster.',
  alternates: { canonical: 'https://palmcareai.com/about' },
  openGraph: {
    title: 'About PalmCare AI — Our Story',
    description:
      'Founded by a home care industry veteran, PalmCare AI is on a mission to eliminate paperwork for home care agencies nationwide.',
    url: 'https://palmcareai.com/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
