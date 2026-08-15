# SEO traffic recovery plan (Aug 2026)

PalmCare’s technical foundation is mostly fine (fast TTFB, HTTPS, sitemap, canonicals, schema on key pages). Organic traffic is weak because **high-intent commercial URLs were missing**, **crawl budget was wasted on /login**, **analytics may have been blocked by CSP**, **content freshness was thin**, and Google still has **more not-indexed than indexed URLs**.

## Search Console snapshot (2026-08-14 night)

| Metric | Value |
|--------|--------|
| Total web search clicks (3 months) | **36** |
| Sitemap | **Success**, last read Aug 14, **34 URLs** discovered |
| Indexed | **15** |
| Not indexed | **19** |
| Top not-indexed reasons | Discovered not indexed (12), Crawled not indexed (5), noindex (1), redirect (1) |

Indexing requests submitted for: documentation software, compare, alternatives, and all 4 new blog posts.

## What we already shipped

1. PostHog CSP unblock  
2. Sitemap hygiene (no `/login`; commercial + conversion URLs added)  
3. High-intent pages: `/home-care-documentation-software`, `/compare`, `/alternatives`  
4. Four new blog posts (Aug 14)  
5. Homepage Resources + footer links into commercial pages  
6. Blog E-E-A-T: Muse Ibrahim as Person author + byline  
7. Related-posts internal links + commercial CTAs on every article  
8. Organization schema: founder + WebSite node  
9. `llms.txt` + `pricing.md` for AI engines  

## Highest-ROI next moves (priority order)

### 0. GSC query gaps already showing impressions (act now)
From Performance (3 months): **1.25K impressions**, **36 clicks**, **2.9% CTR**, avg position **13.8**.

| Query | Impr. | Clicks | Action |
|-------|------:|-------:|--------|
| palmcare | 173 | 6 | Brand OK; keep homepage title strong |
| paperless contracts home care | 88 | 0 | New post shipped: `/blog/paperless-home-care-contracts` |
| make my home care agency paperless | 35 | 0 | Link from paperless post + homepage compare |
| ai oasis documentation | 16 | 0 | Clarify we are NOT OASIS (Medicare home health) on compare page |
| hospice ai documentation | 13 | 0 | Optional later post; stay honest about non-medical focus |

### 1. Indexation (this week)
- Re-check GSC Pages in 3 to 7 days. Goal: indexed count rising past 20.  
- Open **Crawled - currently not indexed** and **Discovered - currently not indexed** lists. Request indexing only on money pages (commercial + top blogs). Do not spam every URL.  
- Clear unused verification tokens warning in GSC Settings (security hygiene).

### 2. Fix “crawled, not indexed” quality signals
Google often uses this when pages look thin, batched, or too similar.
- Refresh 2 older July posts with real new sections (not date-only bumps).  
- Keep author byline + related links (now live).  
- Avoid publishing 10 posts on one calendar day again.

### 3. Content clusters (next 30 days)
One post per week, answer-first, 40 to 60 word lead answers (AEO):

| Week | Topic | Cluster |
|------|--------|---------|
| 1 | Done: service agreement by state | Contracts |
| 2 | Done: AxisCare / WellSky / CareTime vs AI docs | Compare |
| 3 | Done: intake assessment timing | Operations |
| 4 | Done: private duty care plan checklist | Care plans |
| 5 | Home care billables checklist after intake | Billing |
| 6 | Florida vs Texas home care contract differences (honest, no fake legal advice) | State |
| 7 | How to train caregivers on voice assessments | Ops |
| 8 | HIPAA checklist for home care AI tools | Trust |

### 4. Programmatic SEO (later, only if unique value)
Do **not** mass-generate thin state pages. If we build state pages, each needs unique state rule summaries from our real `state_rules` engine (proprietary data). Pattern: `/home-care-service-agreement/[state]`. Quality over volume.

### 5. Off-site authority (feeds Google + AI citations)
- Continue LinkedIn founder posts with depth (already in engagement bank). Put URL on creative or in bio.  
- Reddit reply-marketing 9:1 (disclose you built PalmCare).  
- Directory / association listings with accurate NAP and product description.  
- Guest quotes on home-care ops blogs if available (real only).

### 6. On-page CTR once impressions exist
When GSC Performance shows queries with impressions and low CTR:
- Rewrite title tags to match the query intent.  
- Keep brand at the end: `Keyword phrase | PalmCare AI`.

### 7. Measurement
- Confirm PostHog `$pageview` fires after CSP deploy.  
- Track organic landings on commercial URLs + blog.  
- Goal conversions: `/register`, `/book-demo`, App Store shortlinks.

## Honest expectation

New commercial pages and blogs need **2 to 6 weeks** to index and start collecting impressions. Near-term traffic still comes from social, email, and App Store. SEO is the compounding channel.

## Sitemap

Live: https://palmcareai.com/sitemap.xml  
Source: `apps/web/src/app/sitemap.ts`
