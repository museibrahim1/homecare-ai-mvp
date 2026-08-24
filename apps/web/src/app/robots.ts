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
          '/login',
          '/forgot-password',
          '/reset-password',
          // Attribution hops and short links (redirect targets are in the sitemap).
          '/app',
          '/a/',
          '/r/',
          '/d/',
          '/w/',
          '/b/',
          '/beta',
          '/oauth',
          '/onboarding',
          '/verify-email',
          '/register/status',
          '/help',
        ],
      },
    ],
    sitemap: 'https://palmcareai.com/sitemap.xml',
  };
}
