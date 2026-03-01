import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with PalmCare AI. Questions about plans, demos, or enterprise solutions? Built for care professionals — our team is ready to help.',
  openGraph: {
    title: 'Contact PalmCare AI',
    description: 'Reach out for demos, support, or partnership inquiries. Where care meets intelligence.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
