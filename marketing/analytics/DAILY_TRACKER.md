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

## Source status (updated 2026-08-27)

| Source | Status | Notes |
|--------|--------|-------|
| **PostHog** | Live via Cursor MCP | Best web + channel source. Add `POSTHOG_PERSONAL_API_KEY` to automate the puller. |
| **Google Search Console** | Live via browser | API automation still needs a service account on `sc-domain:palmcareai.com`. |
| **App Store Connect** | Live via browser + ASC API | First dumps may lag 1–2 days after request. |
| **GA4** | Tag fix shipped 2026-08-27 | SPA `page_view` now fires on every App Router navigation; CSP allows GA hosts. Re-check UI after deploy before trusting GA vs PostHog. |
| **Meta Pixel** | CSP fix shipped 2026-08-27 | `connect.facebook.net` + `www.facebook.com` allowlisted. Insights API still needs re-auth scopes. |
| **Threads** | Live | Profile views + recent posts via Graph API. |
| **Cloudflare** | Blocked | Token lacks `Zone Analytics Read` (manual unlock). |
| **Meta FB/IG insights** | Blocked | Need `pages_read_engagement` / `instagram_manage_insights` (manual unlock). |

## SEO / AEO shipped 2026-08-27

- Homepage real `<h1>` (keyword sr-only + visual Palm It.)
- GA4 SPA pageviews + Meta/GA CSP allowlists
- AggregateOffer schema ($89.99–$199.99) on site JSON-LD + doc software page
- FAQPage + Product schema on `/pricing`; FAQPage + BreadcrumbList on `/compare`
- Paperless blog FAQ block + FAQPage JSON-LD for GSC 0-CTR queries
- Internal links to `/pricing` from blog hub, posts, and documentation software
- Em dashes removed from marketing meta titles/descriptions

## What “good” looks like each day

- Channel mix named (email / paid social / organic / direct), not a blob of “direct”.
- Organic search visitors and **landing pages** listed.
- One SEO action: title rewrite, internal link, index request, or new answer-first post.
- Unsubscribe / privacy / legal traffic separated from product interest.
- App Store downloads + product-page views once ASC dumps land.

## Unlock checklist (manual, still needed)

1. **Cloudflare**: edit `CF_API_TOKEN` → add permission **Zone → Analytics → Read** for palmcareai.com.
2. **PostHog**: Personal API key with `web_analytics:read` → `.env` as `POSTHOG_PERSONAL_API_KEY`.
3. **Google**: create a service account, add it as user on Search Console (`sc-domain:palmcareai.com`) and GA4 property, put JSON path in `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. **Meta**: re-auth Page token with `pages_read_engagement`, `pages_read_user_content`, `instagram_manage_insights`, `ads_read`.
5. **ASC**: re-run the puller and confirm `instancesReady > 0`.
6. **After deploy**: confirm GA4 realtime shows pageviews on click-through navigations (not only first load).

## Decision rules (SEO)

- Impressions + low CTR → rewrite title/meta for that query.
- Impressions on wrong intent (e.g. OASIS Medicare) → clarify on-page, do not chase.
- Organic landing = homepage only → push commercial URLs and blog hubs with internal links.
- `/unsubscribe` high → email is working; do not treat as product demand.
- Paid social converting to `/app` or `/register` → keep; if only bounce → fix creative/landing.
