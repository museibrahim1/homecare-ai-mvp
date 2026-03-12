import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { NotificationProvider } from '@/lib/notifications';
import { WalkthroughProvider } from '@/lib/walkthrough';
import WalkthroughGuide from '@/components/WalkthroughGuide';
import ReminderPoller from '@/components/ReminderPoller';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://palmcareai.com';
const SITE_NAME = 'PalmCare AI';
const SITE_DESCRIPTION =
  'PalmCare AI turns care assessments into signed contracts — automatically. Record it. Transcribe it. Contract it. All in your palm. Built for home care agencies.';

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
    default: `${SITE_NAME} — Where Care Meets Intelligence`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'PalmCare AI',
    'Palm It',
    'home care software',
    'home care agency software',
    'AI contract generation',
    'voice-powered assessment',
    'care assessment platform',
    'caregiver management',
    'home care CRM',
    'AI transcription',
    'service contract generator',
    'HIPAA compliant',
    'home care management',
    'home care documentation software',
    'home health care assessment tool',
    'automated care plan generator',
    'home care billing software',
    'home health agency CRM',
    'voice to contract',
    'home care compliance software',
    'patient assessment app',
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
    title: `${SITE_NAME} — Where Care Meets Intelligence`,
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
    title: `${SITE_NAME} — Where Care Meets Intelligence`,
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
        lowPrice: '299',
        highPrice: '1299',
        priceCurrency: 'USD',
        offerCount: 3,
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
            </WalkthroughProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
