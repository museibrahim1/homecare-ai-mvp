# App Store Launch Day — Jul 10, 2026

PALM – Home Care Contracts v1.0 was approved and went live on the App Store
on Jul 10, 2026 (released 8:24 AM UTC).

- **App Store link:** https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988
- **Listing name:** PALM – Home Care Contracts · Palm Technologies Inc · Business · Free
- Listing proof screenshots captured the same morning:
  `appstore-listing-2026-07-10.png` (wide), `appstore-listing-ig-4x5.png` (4:5),
  `appstore-listing-full-2026-07-10.png` (with App Store chrome).
- The live listing has screenshots only, no app preview video, so the launch video
  is our own product reel: `videos/output/palmcare-reel-v2-with-audio.mp4`
  (9:16, 1080x1920, 36 s, voiceover and captions).

## What posted automatically (via `.github/workflows/launch-announcement.yml`)

Runs `scripts/social/launch_announcement.py` with the repo secrets. Posted set:

| Platform | Format | Media |
|---|---|---|
| Facebook | Video post | product reel, direct upload |
| Instagram | Reel (shared to feed) | product reel via public URL |
| Threads | Video post | product reel via public URL |
| LinkedIn | Image post + link in first comment | `launch-appstore-feed.png` |

Dedupe log: `scripts/social/.launch_posted.json` (committed back by the workflow).
The regular Friday post (`gap-friday-done.png`, 11:30 AM ET) still goes out from
the daily scheduler, so launch day gets two touches on Meta platforms.

## TikTok (manual upload, no API access)

Upload `videos/output/palmcare-reel-v2-with-audio.mp4` from the TikTok app.

Caption:

> The paperwork app for home care is live on the App Store today. Record the
> assessment, PALM writes the transcript, the care plan, the billables, and the
> state-specific contract. Minutes, not days. Free download, link in bio.
> #homecare #caregiver #healthtech #AppLaunch #fyp

Put the App Store link in the TikTok bio (links in captions are not clickable):
https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988

## X (no access token yet)

One sharp claim, when the token is set up:

> PALM is live on the App Store. Record the care assessment, get the transcript,
> care plan, billables, and state-specific contract in minutes, not days.
> Free download: https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988

## Creatives in this folder

| File | Use |
|---|---|
| `launch-appstore-feed.png` | 1080x1350, "PALM is live on the App Store", LinkedIn and Meta feed |
| `launch-appstore-square.png` | 1080x1080 cross-post version |
| `appstore-listing-2026-07-10.png` | Real listing screenshot (proof), wide |
| `appstore-listing-ig-4x5.png` | Real listing screenshot cropped 4:5 for IG |
| `appstore-listing-full-2026-07-10.png` | Full-page capture for the archive |

Both launch cards are also deployed to `apps/web/public/marketing/social/` so
they serve from `palmcareai.com/marketing/social/` after the next web deploy.
