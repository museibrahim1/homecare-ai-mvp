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

const PAGES: { path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/mobile-app', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/status', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();

  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
