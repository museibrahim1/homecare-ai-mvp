import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
    sitemap: 'https://palmcareai.com/sitemap.xml',
  };
}
