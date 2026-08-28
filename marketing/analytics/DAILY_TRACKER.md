# Daily Analytics Tracker

We review this every day together. The goal is not a vanity dashboard. It is to answer two questions fast:

1. **Where did traffic come from yesterday / this week?**
2. **Where should SEO effort go next?**

## How we run the review (10 minutes)

1. Say **“daily analytics”** in Cursor (or run the puller below).
2. Open the canvas: [daily-analytics-review](/Users/musaibrahim/.cursor/projects/Users-musaibrahim-Desktop-AI-Voice-Contracter/canvases/daily-analytics-review.canvas.tsx)
3. Walk the order: Traffic mix → SEO gaps → App Store → Social → One action.
4. Ship **one** SEO or acquisition fix the same day.

```bash
python3.11 scripts/analytics/daily_report.py --days 7
# Snapshot lands in marketing/analytics/daily/YYYY-MM-DD.json
```

## Source status (updated 2026-08-27 evening)

| Source | Status | Notes |
|--------|--------|-------|
| **PostHog** | Live via Cursor MCP | 7d: 383 visitors, 973 views, bounce 41%. Personal API key still optional. |
| **Cloudflare** | Unlocked 2026-08-27 | New user token with Zone Analytics:Read + Logs:Read. Local `.env` `CF_API_TOKEN` updated (secret, not committed). |
| **Google Search Console** | Live via browser | 3mo: 46 clicks, 1.81K imps, 2.5% CTR, pos 14.7. Snapshot: `2026-08-27-browser.json`. |
| **App Store Connect** | API OK / UI login flaky | Puller OK. Browser session failed auth tonight. |
| **GA4 tag** | Live on production | Confirmed `gtag` + Meta pixel + FAQ/AggregateOffer schema on `/pricing`. SPA `page_view` shipped. |
| **GA4 API** | Not wired | Needs service account JSON for automated pulls. Use PostHog as source of truth. |
| **Meta FB/IG/Threads** | Working | Insights + Threads via existing Page token. |
| **Live SEO** | Verified | `/pricing` shows Mobile $89.99 / Platform $199.99, FAQ schema, AggregateOffer. |

## SEO / AEO shipped 2026-08-27

- Homepage real `<h1>` (keyword sr-only + visual Palm It.)
- GA4 SPA pageviews + Meta/GA CSP allowlists
- AggregateOffer schema ($89.99–$199.99) on site JSON-LD + doc software page
- FAQPage + Product schema on `/pricing`; FAQPage + BreadcrumbList on `/compare`
- Paperless + AI docs FAQ blocks + FAQPage JSON-LD for GSC 0-CTR queries
- Internal links to `/pricing` from blog hub, posts, and documentation software
- Em dashes removed from marketing meta titles/descriptions
- Cloudflare analytics token created and verified

## What “good” looks like each day

- Channel mix named (email / paid social / organic / direct), not a blob of “direct”.
- Organic search visitors and **landing pages** listed.
- One SEO action: title rewrite, internal link, index request, or new answer-first post.
- Unsubscribe / privacy / legal traffic separated from product interest.
- App Store downloads + product-page views once ASC dumps land.

## Remaining optional unlocks

1. **PostHog personal API key** (optional): Settings → Personal API keys → `web_analytics:read` → `.env` `POSTHOG_PERSONAL_API_KEY`. MCP already covers daily reviews.
2. **Google service account** (optional): add to GSC + GA4 for fully automated Google pulls.
3. **ASC browser session**: re-login when you need the UI; API key path already works.

## Decision rules (SEO)

- Impressions + low CTR → rewrite title/meta for that query.
- Impressions on wrong intent (e.g. OASIS Medicare) → clarify on-page, do not chase.
- Organic landing = homepage only → push commercial URLs and blog hubs with internal links.
- `/unsubscribe` high → email is working; do not treat as product demand.
- Paid social converting to `/app` or `/register` → keep; if only bounce → fix creative/landing.
