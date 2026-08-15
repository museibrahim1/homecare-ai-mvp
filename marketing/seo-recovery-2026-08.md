# SEO traffic recovery plan (Aug 2026)

PalmCare’s technical foundation is mostly fine (fast TTFB, HTTPS, sitemap, canonicals, schema on key pages). Organic traffic is weak because **high-intent commercial URLs were missing**, **crawl budget was wasted on /login**, **analytics may have been blocked by CSP**, and **content freshness is thin** (blog cluster all dated the same day).

## What we fixed in code (ship to production)

1. **PostHog CSP unblock** in `apps/web/next.config.js`  
   `connect-src` / `script-src` now allow PostHog hosts. Without this, browser analytics can fail silently and “no traffic” looks worse than it is.

2. **Sitemap hygiene** in `apps/web/src/app/sitemap.ts`  
   - Removed `/login` (already `noindex`).  
   - Added `/home-care-documentation-software`, `/compare`, `/alternatives`, `/book-demo`, `/register`.

3. **Three high-intent SEO pages** (comparison + alternatives + category pillar):  
   - https://palmcareai.com/home-care-documentation-software  
   - https://palmcareai.com/compare  
   - https://palmcareai.com/alternatives  

4. **Internal links** from homepage Resources nav + blog hub into those pages.

5. **Meta / llms.txt cleanup** (no em dashes; new key pages listed for AI crawlers).

## What you must do in Google (not automatable here)

1. Open [Google Search Console](https://search.google.com/search-console) for `palmcareai.com`.
2. Confirm property ownership and that `https://palmcareai.com/sitemap.xml` is submitted.
3. Request indexing for the three new URLs after deploy.
4. Check **Pages** → Not indexed / Excluded for soft-404s and crawl anomalies.
5. Check **Performance** for queries that already get impressions but low CTR; tighten titles for those.

## 30-day content plan (highest ROI)

Publish **one helpful post per week** answering real agency questions (not product fluff). Prioritize:

| Week | Topic | Target intent |
|------|--------|----------------|
| 1 | “Home care service agreement requirements by state (how to stay compliant)” | informational → contract CTA |
| 2 | “AxisCare / WellSky / CareTime vs AI documentation” (honest category compare, no fake stats) | commercial |
| 3 | “How long should a home care intake assessment take?” | informational |
| 4 | “Private duty care plan checklist (downloadable structure on-page)” | informational |

Refresh existing July 9 posts with a visible “Updated” date only when you add real new material.

## Distribution that feeds SEO

- Keep social CTAs pointing at `/w/*` and `/b/*` shortlinks (already live).
- End every founder LinkedIn post with a **specific question**; put the URL on the image or in bio (link-in-comment is penalized on LinkedIn in 2026).
- Reddit: answer first, disclose you built PalmCare, skip hard sell links.

## Measurement

After CSP fix deploys, verify in PostHog that `$pageview` fires on palmcareai.com. Also check GA4 if still installed. Track:

- Organic sessions (GSC clicks + PostHog `utm_medium=organic` if tagged)
- Landing pages: new commercial URLs + top blog posts
- Conversions: `/register`, `/book-demo`, App Store shortlinks

## Honest expectation

SEO will not refill the site overnight. New commercial pages typically need **2–6 weeks** to enter the index and start collecting impressions. The fastest near-term traffic still comes from social + email + App Store, while these pages build the organic base.
