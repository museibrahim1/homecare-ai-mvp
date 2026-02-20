import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

function getSiteUrl(): string {
  try {
    const headersList = headers();
    const host = headersList.get('host') || 'palmcareai.com';
    const proto = headersList.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`;
  } catch {
    return 'https://palmcareai.com';
  }
}

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/settings',
          '/api',
          '/visits',
          '/clients',
          '/caregivers',
          '/reports',
          '/billing',
          '/messages',
          '/schedule',
          '/pipeline',
          '/leads',
          '/team-chat',
          '/documents',
          '/proposals',
          '/integrations',
          '/care-tracker',
          '/activity',
          '/policies',
          '/welcome',
          '/verification-status',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
