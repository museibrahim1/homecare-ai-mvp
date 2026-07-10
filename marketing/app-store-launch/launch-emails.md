# App Store Launch — Email Updates (Jul 10, 2026)

PALM v1.0 is live on the App Store:
https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988

## What changed

### 1. Download link in all outreach emails
`apps/api/app/routers/sales_leads/common.py`

- The shared email wrapper (`_email_wrap`) CTA banner now shows a **Download on the
  App Store** button next to the free-trial button, with "Now live on the App Store"
  copy. Every outreach email and drip-sequence email (`warm_open`, `pattern_interrupt`,
  `aspiration`, `proof_point`, `graceful_exit`) inherits it.
- New standalone template **`app_live_launch`** ("PALM is live on the App Store") for
  the launch announcement itself.

### 2. Website launch email
`apps/web/src/emails/mobile-app-launch.html`

- Both CTAs now point to the real App Store URL (were `https://apps.apple.com`
  placeholders).
- Hero copy states the app is live; hero stats replaced with real product facts
  (4 documents from one recording, 50 states, minutes not days). No invented numbers.
- "Start Free Trial" now points to `palmcareai.com`.

### 3. Manual outreach script
`scripts/email/send_all_outreach.py` — agency footer now includes an App Store
download block.

## Resend to yesterday's recipients

The new marketing email can be resent to everyone we emailed recently.

**Endpoint:** `POST /platform/sales/leads/internal/resend-launch` (auth: `X-Internal-Key`)

Body (all optional):

| field | default | notes |
|---|---|---|
| `date` | none | Target one UTC day, e.g. `2026-07-09`. |
| `since_hours` | `48` | Rolling window when `date` is blank. |
| `audience` | `agencies` | `agencies` \| `investors` \| `both`. |
| `dry_run` | `true` | Preview recipients; send nothing. |
| `campaign_name` | `app-store-launch-2026-07` | Used for dedupe + tracking. |
| `limit` | none | Safety cap on number of sends. |

The send runs server-side on Railway (uses the backend's own `RESEND_API_KEY`), so
callers only need the internal key. It deduplicates against prior sends of the same
template + campaign, so re-running is safe.

### How to run it

Standalone (needs `CRON_SECRET` in the env):

```bash
# Preview yesterday's cohort
python3 scripts/email/resend_launch_to_yesterday.py --date 2026-07-09

# Actually send to everyone emailed in the last 48h
python3 scripts/email/resend_launch_to_yesterday.py --since-hours 48 --send
```

Or the GitHub Actions workflow **Resend App Store launch email**
(`.github/workflows/resend-launch-emails.yml`), Run workflow → set `dry_run` false.
It reads the `CRON_SECRET` repo secret.

> Note: the endpoint ships in this PR. The production API on Railway must be deployed
> with it (deploys on merge to `main`) before the workflow/script can reach it.

## Pull the exact list of who we emailed

The exact list of agencies (and investors) emailed on a given day lives only in the
production CRM (`SalesLead` / `Investor` tables) — the same source the admin
**Command Center** (`/admin/command-center`) reads. Two ways to get it:

1. **Admin page (no setup):** open Command Center, pick the past day (e.g. Thursday
   Jul 9). Each emailed agency shows its name, city, state, and email.
2. **Read-only endpoint / export:** `GET /platform/sales/leads/internal/emailed-on`
   (`date=YYYY-MM-DD` or `since_hours`, `audience`). No side effects.
   - `scripts/email/pull_emailed_list.py --date 2026-07-09 --audience agencies --csv out.csv`
   - or the manual workflow **Pull emailed list** (`.github/workflows/pull-emailed-list.yml`),
     which prints the list and uploads a CSV artifact. Needs the `CRON_SECRET` repo secret.

The `resend-launch` dry run also returns the full recipient list.
