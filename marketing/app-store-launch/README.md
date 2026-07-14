# Get the App — Download Campaign (Jul 18 – Sep 11, 2026)

Goal: drive App Store downloads and trial signups. Every touchpoint has one ask: download PALM.

## Links

- App Store: https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988
- Short link for captions and print: **palmcareai.com/app** (redirect in `apps/web/next.config.js`)
- QR code: `palm-appstore-qr.png` (user-made in Adobe Express, decodes to the App Store listing, verified)

## Assets in this folder

| File | What it is |
|---|---|
| `palm-app-launch-9x16.mp4` | The launch video (user's original recording, re-encoded H.264 at CRF 17) |
| `palm-appstore-qr.png` | App Store QR code |
| `download-card-1x1.png` | 1080x1080 feed card: headline, contract screen, QR, App Store badge |
| `download-card-9x16.png` | 1080x1920 story card, same concept |
| `download-card.html` / `download-card-story.html` | Sources; re-render with headless Chromium if copy changes |

Deployed copies (public URLs for IG/Threads ingestion and email images):
`apps/web/public/marketing/social/appstore-download-{1x1,9x16}.png`,
`apps/web/public/marketing/social/palm-appstore-qr.png`,
`apps/web/public/launch/palm-app-launch.mp4`, `apps/web/public/launch/palm-appstore-qr.png`.

## What the data said (and how the plan uses it)

Instagram engagement pulled Jul 13: the three highest-engagement posts ever are all
videos (founder clip, the two App Store announcement clips). Product-real screens
(contract, billables) outperform abstract graphics. So the campaign is video-led:
the launch video runs as an IG Reel + FB video + Threads video every 9 to 10 days,
with QR download cards and real app screens between runs.

## Schedule

Lives in `scripts/social/run_scheduled_posts.py`.

**Twice daily (Jul 14 – Sep 11, 2026):**
- **AM slot (11:30 AM ET):** original approved plan on its dates; Just PALM IT fillers on gap days so Meta + LinkedIn always get a morning post.
- **PM slot (6:30 PM ET):** rotating Just PALM IT / Download Today creatives on IG, Threads, Facebook, and LinkedIn every day.

GitHub Actions: `.github/workflows/social-posts.yml` (two cron times). Dedupes per `date-slot` in `.posted_log.json`.

**Email automation:** `.github/workflows/drip-emails.yml` runs daily:
1. Drip sequence advance (`/internal/process-sequences`)
2. Opened-lead reengage with 7 unique Just PALM IT templates (`/internal/reengage-opened`)

Requires `CRON_SECRET` in GitHub repo secrets (same value as Railway `CRON_SECRET` or `INTERNAL_API_KEY`).

## Email updates shipped with this campaign

- Drip sequence (`apps/api/app/routers/sales_leads/common.py`): all five emails
  rewritten around the app. CTA banner and every button link to the App Store,
  footer QR now scans to the download, day 7 email links the launch video.
- Welcome email (`apps/api/app/services/email.py`): TestFlight beta block replaced
  with an App Store download block with QR and launch video link.
- Approved email: download button is primary, web login secondary.
- Launch blast (`scripts/email/send_app_launch_emails.py`): QR added under the CTA.
- Campaign template (`apps/web/src/emails/mobile-app-launch.html`): real App Store
  URL and QR under the hero CTA.
