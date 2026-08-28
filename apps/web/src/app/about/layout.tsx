import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About: Built by Someone Who Knows Home Care',
  description:
    'PalmCare AI was built for home care agencies that lose hours to paperwork after every assessment. Meet the team and the product.',
  alternates: { canonical: 'https://palmcareai.com/about' },
  openGraph: {
    title: 'About PalmCare AI: Our Story',
    description:
      'PalmCare AI was built for home care agencies that lose hours to paperwork after every assessment.',
    url: 'https://palmcareai.com/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
