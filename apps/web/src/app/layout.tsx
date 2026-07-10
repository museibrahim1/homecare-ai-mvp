import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import { WalkthroughProvider } from '@/lib/walkthrough';
import WalkthroughGuide from '@/components/WalkthroughGuide';
import ReminderPoller from '@/components/ReminderPoller';
import SiteAnalytics from '@/components/SiteAnalytics';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://palmcareai.com';
const SITE_NAME = 'PalmCare AI';
// Keyword-led title (category first, brand last) — like top competitors rank with.
const SITE_TITLE = 'AI Home Care Documentation & Contract Software';
const SITE_DESCRIPTION =
  'AI documentation for home care agencies: turn a recorded assessment into a state-specific service contract, care plan, visit notes, and billables — automatically.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as any,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TITLE} | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'PalmCare AI',
    'AI home care documentation',
    'home care documentation software',
    'home care assessment software',
    'home care service agreement software',
    'home care care plan software',
    'AI scribe for home care',
    'non-medical home care software',
    'home care software',
    'home care agency software',
    'AI contract generation',
    'voice-powered assessment',
    'care assessment platform',
    'automated care plan generator',
    'service contract generator',
    'voice to contract',
    'caregiver management',
    'home care CRM',
    'AI transcription',
    'home care billing software',
    'home care compliance software',
    'HIPAA compliant',
    'home care SaaS',
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
    title: `${SITE_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Record. Transcribe. Contract. Palm It.`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
      sameAs: [
        'https://www.linkedin.com/company/palmcare-ai',
        'https://twitter.com/palmcareai',
        'https://www.instagram.com/palmcareai',
        'https://www.facebook.com/palmtechnologies',
      ],
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
        lowPrice: '199',
        highPrice: '1200',
        priceCurrency: 'USD',
        offerCount: 3,
        offers: [
          { '@type': 'Offer', name: 'Starter', price: '199', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Growth', price: '699', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Enterprise', price: '1200', priceCurrency: 'USD' },
        ],
      },
      featureList: [
        'Voice-powered care assessments',
        'AI contract generation in seconds',
        'Record. Transcribe. Contract.',
        'Client CRM pipeline',
        'Caregiver management',
        'HIPAA compliant',
      ],
    },
  ],
};

// No theme switching — enterprise light is the only theme
const themeInitScript = '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-TGH98SJBTX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TGH98SJBTX');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {themeInitScript && <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />}
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-800 min-h-screen`}>
        <ThemeProvider>
          <NotificationProvider>
            <WalkthroughProvider>
              {children}
              <WalkthroughGuide />
              <ReminderPoller />
              <SiteAnalytics />
            </WalkthroughProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
