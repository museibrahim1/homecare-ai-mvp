/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Next 15+ removed `swcMinify` (SWC minification is now default and not configurable).
  // Pin the Turbopack workspace root so Next.js does not infer it from the
  // repo-root puppeteer lockfile.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizeCss: true,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },
  async headers() {
    return [
      {
        // Public marketing assets are fetched cross-origin (e.g. from the
        // App Store Connect browser session to upload review screenshots,
        // and by Meta/LinkedIn ingestion). Allow anonymous CORS reads.
        source: '/marketing/social/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api-production-a0a2.up.railway.app https://www.google-analytics.com https://www.googletagmanager.com https://formspree.io https://accounts.google.com https://api.qrserver.com http://localhost:8000 http://localhost:3000",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  async redirects() {
    // /app is a real page (client-side hop that fires GA4 app_store_click).
    // Short /a/* and /r/* paths bake UTMs so social captions stay short while
    // every click is attributable in Analytics.
    return [
      {
        source: '/a/meta',
        destination:
          '/app?utm_source=meta&utm_medium=social&utm_campaign=content_calendar&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/a/li',
        destination:
          '/app?utm_source=linkedin&utm_medium=social&utm_campaign=content_calendar&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/a/email',
        destination:
          '/app?utm_source=email&utm_medium=email&utm_campaign=agency_outreach&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/a/qr',
        destination:
          '/app?utm_source=qr&utm_medium=qr&utm_campaign=print_materials&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/r/meta',
        destination:
          '/register?utm_source=meta&utm_medium=social&utm_campaign=content_calendar&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/r/li',
        destination:
          '/register?utm_source=linkedin&utm_medium=social&utm_campaign=content_calendar&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/r/email',
        destination:
          '/register?utm_source=email&utm_medium=email&utm_campaign=agency_outreach&utm_content=shortlink',
        permanent: false,
      },
      // Demo + site shortlinks for social CTAs (Sep 2026 traffic month).
      {
        source: '/d/meta',
        destination:
          '/book-demo?utm_source=meta&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/d/li',
        destination:
          '/book-demo?utm_source=linkedin&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/w/meta',
        destination:
          '/features?utm_source=meta&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/w/li',
        destination:
          '/features?utm_source=linkedin&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/b/meta',
        destination:
          '/blog?utm_source=meta&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      {
        source: '/b/li',
        destination:
          '/blog?utm_source=linkedin&utm_medium=social&utm_campaign=sep2026_traffic&utm_content=shortlink',
        permanent: false,
      },
      // App Store metadata and old emails pointed here; help center is auth-only.
      {
        source: '/support',
        destination: '/contact?inquiry=support',
        permanent: true,
      },
      // Legacy email CTAs used /#book-demo; that anchor never existed on the homepage.
      {
        source: '/book-a-demo',
        destination: '/book-demo',
        permanent: true,
      },
      // Old GA/bookmarks hit /hipaa; HIPAA content lives on the privacy policy.
      {
        source: '/hipaa',
        destination: '/privacy#hipaa',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // The browser talks to same-origin /api/* (so the httpOnly session cookie
    // is first-party); this rewrite proxies those calls to the real backend.
    // Must be an absolute URL — NEXT_PUBLIC_* vars are '/api' and would loop.
    const defaultApi = process.env.NODE_ENV === 'development'
      ? 'http://localhost:8000'
      : 'https://api-production-a0a2.up.railway.app';
    const apiUrl =
      process.env.API_URL && !process.env.API_URL.startsWith('/')
        ? process.env.API_URL
        : defaultApi;
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
