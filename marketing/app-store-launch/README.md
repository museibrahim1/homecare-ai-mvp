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

Lives in `scripts/social/run_scheduled_posts.py` (`META` and `LINKEDIN` dicts).

- Jul 18 – Aug 8: Saturday download posts layered on top of the already-approved
  M/W/F plan (those FB photos were natively scheduled and are left untouched).
- Aug 10 – Sep 11: M/W/F Meta posts + Tue/Thu LinkedIn posts, all download-focused,
  CTA `palmcareai.com/app`. LinkedIn keeps the link in the first comment.
- Videos publish day-of from the runner (Graph API can't pre-schedule Reels).
  FB photos are pre-scheduled with `schedule_meta_fb.py` (skips .mp4 entries).

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
