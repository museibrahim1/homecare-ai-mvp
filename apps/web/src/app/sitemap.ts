import { MetadataRoute } from 'next';

const BASE_URL = 'https://palmcareai.com';

const BLOG_SLUGS = [
  'what-is-ai-powered-home-care-software',
  'voice-to-contract-saves-home-care-agencies-time',
  'hipaa-compliance-guide-home-care-agencies-2026',
  '5-signs-your-agency-outgrown-paper-documentation',
  'complete-guide-home-care-client-assessments',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/features`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/mobile-app`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/status`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  for (const slug of BLOG_SLUGS) {
    pages.push({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return pages;
}
