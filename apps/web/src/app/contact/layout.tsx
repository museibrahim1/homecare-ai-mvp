import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with PalmCare AI. Questions about plans, demos, or enterprise solutions? Our team is ready to help.',
  alternates: { canonical: 'https://palmcareai.com/contact' },
  openGraph: {
    title: 'Contact PalmCare AI',
    description: 'Reach out for demos, support, or partnership inquiries.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
