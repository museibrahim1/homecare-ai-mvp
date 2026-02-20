import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with PalmCare AI. Questions about home care software, pricing, or enterprise plans? Our team is ready to help.',
  openGraph: {
    title: 'Contact PalmCare AI',
    description: 'Reach out for demos, support, or partnership inquiries.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
