import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import { WalkthroughProvider } from '@/lib/walkthrough';
import WalkthroughGuide from '@/components/WalkthroughGuide';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://palmcareai.com';
const SITE_NAME = 'PalmCare AI';
const SITE_DESCRIPTION =
  'AI-powered home care management platform. Turn voice assessments into proposal-ready service contracts in minutes. Built for home care agencies.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI-Powered Home Care Management`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'home care software',
    'home care management',
    'care assessment',
    'home health aide',
    'caregiver management',
    'service contract generator',
    'AI transcription',
    'home care CRM',
    'home care agency software',
    'HIPAA compliant',
    'electronic visit verification',
    'EVV',
    'ADL tracking',
    'PalmCare AI',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI-Powered Home Care Management`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Turn assessments into contracts in minutes`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — AI-Powered Home Care Management`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description: SITE_DESCRIPTION,
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@palmtai.com',
        contactType: 'customer support',
      },
      sameAs: [],
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '299',
        highPrice: '1299',
        priceCurrency: 'USD',
        offerCount: 3,
      },
      featureList: [
        'Voice-powered care assessments',
        'AI contract generation',
        'Client CRM pipeline',
        'Billing and reports',
        'Caregiver management',
        'HIPAA compliant',
      ],
    },
  ],
};

// Inline script to set data-theme before first paint, preventing flash of wrong theme
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('palmcare-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-dark-900 text-dark-100 min-h-screen`}>
        <ThemeProvider>
          <NotificationProvider>
            <WalkthroughProvider>
              {children}
              <WalkthroughGuide />
            </WalkthroughProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
