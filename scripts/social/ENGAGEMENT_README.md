# Engagement posts (LinkedIn + Threads)

Approval-only talking points. **Never auto-posted.**

## How it works
1. Mon–Fri at 8:00 AM ET, Muse gets an email with 3 LinkedIn options and 3 Threads options.
2. Reply with letters, e.g. `LI: A` and `TH: B` (or `none`).
3. Only after that reply does an agent post the chosen copy.
4. Product marketing creatives still auto-post via `social-posts.yml`.

## Files
- `engagement_bank.py` — full talking-point bank
- `send_engagement_preview.py` — builds and emails the daily picks
- `.github/workflows/engagement-preview.yml` — weekday cron

## Manual send
```bash
python3 scripts/social/send_engagement_preview.py --date 2026-08-18
python3 scripts/social/send_engagement_preview.py --dry-run
```
