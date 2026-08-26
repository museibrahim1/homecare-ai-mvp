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

## Source status (2026-08-25 evening browser pull)

| Source | Status | Notes |
|--------|--------|-------|
| **PostHog** | Live via Cursor MCP | Best web + channel source. 367 visitors / 1,129 views (7d). Add `POSTHOG_PERSONAL_API_KEY` to automate the puller. |
| **Google Search Console** | Live via browser | 3mo: 42 clicks, 1.74K imps, 2.4% CTR, pos 14.4. Snapshot: `marketing/analytics/daily/2026-08-25-browser.json`. Wire API later for automation. |
| **App Store Connect** | Live via browser | Last 7d ~Aug 24: 8 first downloads, 451 impressions, 2.93% conv, 58 product-page views. |
| **GA4 UI** | Undercounting | Only 2 active users / 63 views vs PostHog 367. Fix tag before trusting GA. |
| **Threads** | Live | Profile views + recent posts via Graph API. |
| **Cloudflare** | Blocked | Token lacks `Zone Analytics Read`. |
| **Meta FB/IG insights** | Blocked | Need `pages_read_engagement` / `instagram_manage_insights`. Paid FB still in PostHog UTMs. |

## What “good” looks like each day

- Channel mix named (email / paid social / organic / direct), not a blob of “direct”.
- Organic search visitors and **landing pages** listed.
- One SEO action: title rewrite, internal link, index request, or new answer-first post.
- Unsubscribe / privacy / legal traffic separated from product interest.
- App Store downloads + product-page views once ASC dumps land.

## Unlock checklist (do once)

1. **Cloudflare**: edit `CF_API_TOKEN` → add permission **Zone → Analytics → Read** for palmcareai.com.
2. **PostHog**: Personal API key with `web_analytics:read` → `.env` as `POSTHOG_PERSONAL_API_KEY`.
3. **Google**: create a service account, add it as user on Search Console (`sc-domain:palmcareai.com`) and GA4 property, put JSON path in `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. **Meta**: re-auth Page token with `pages_read_engagement`, `pages_read_user_content`, `instagram_manage_insights`, `ads_read` (for ad campaign names).
5. **ASC**: already requested. Re-run the puller in 1–2 days and confirm `instancesReady > 0`.

## Decision rules (SEO)

- Impressions + low CTR → rewrite title/meta for that query.
- Impressions on wrong intent (e.g. OASIS Medicare) → clarify on-page, do not chase.
- Organic landing = homepage only → push commercial URLs and blog hubs with internal links.
- `/unsubscribe` high → email is working; do not treat as product demand.
- Paid social converting to `/app` or `/register` → keep; if only bounce → fix creative/landing.
