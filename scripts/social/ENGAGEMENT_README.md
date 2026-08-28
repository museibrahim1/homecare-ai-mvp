# Engagement posts (LinkedIn company Page + Threads)

Approval-only. **Never auto-posted.**

## Channel split (hard rule)
| Channel | What goes there |
|---|---|
| **Palm Technologies company Page** | All PalmCare engagement picks + product marketing |
| **@palmcareai Threads** | PalmCare engagement picks |
| **Muse personal LinkedIn** | Muse-only. Non-PalmCare credibility topics. Never these engagement emails. |

When posting approved LI picks, use `post_to_linkedin.py` **without** `--as-person`
so the author is `urn:li:organization:$LINKEDIN_ORGANIZATION_ID`.

## Voice
Founder-voice writing that still belongs on the brand Page. First person is fine
when it is clearly the company founder speaking for Palm. Short sentences.
Home care specifics. No AI filler. No engagement bait. You edit or kill anything
before it posts.

Themes come from real founder work (aging care, trust, talk to users, durable workflows).
Wording is original to PalmCare.

## How it works
1. Mon–Fri 8:00 AM ET email with 3 LinkedIn Page + 3 Threads options.
2. Reply `LI: A` / `TH: B` or paste your rewrite.
3. Only then does an agent post to the **company Page** (never personal LinkedIn).
4. Product marketing stays on `social-posts.yml` (also company Page by default).

## Files
- `engagement_bank.py`
- `send_engagement_preview.py`
- `.github/workflows/engagement-preview.yml`
