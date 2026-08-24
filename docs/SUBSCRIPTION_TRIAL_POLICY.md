# Subscription & Free Trial Policy

**Effective:** 2026-08-24  
**Owner:** Muse Ibrahim / Palm Technologies  
**Product:** PalmCare AI (`com.palmcareai.app`)

## Plans (Apple In-App Purchase)

| Plan | Price | Product ID | Includes |
|------|-------|------------|----------|
| **PalmCare Mobile** | $80/mo | `com.palmcareai.app.mobile.monthly` | Unlimited assessments on iPhone, AI notes, billables, contracts |
| **PalmCare Platform** | $199/mo | `com.palmcareai.app.starter.monthly` | Mobile + web CRM, team seats, analytics |

Both plans include a **30-day Apple introductory free trial** when configured in App Store Connect.

## Summary

| Rule | Policy |
|------|--------|
| Trial length | **30 days** (Apple introductory free trial) |
| How trial starts | Only by completing Apple In-App Purchase in the iOS app |
| Payment method | Required via Apple ID (App Store payment method on file) |
| After trial | Apple **automatically charges** the selected monthly price and renews until cancelled |
| Web register alone | Creates an account only. Does **not** unlock assessments |
| Mobile plan on web | Web CRM is blocked; billing and settings remain available |
| Cancel | iPhone Settings → Apple ID → Subscriptions, anytime before renewal |

## Why this model

1. Apple Guideline 3.1.2: digital subscriptions for iOS features go through IAP.
2. A no-card web trial cannot auto-charge when it ends.
3. Mobile at $80 lowers the entry point for solo caregivers; Platform at $199 keeps the full agency stack.
4. Subscribe-to-start with a free trial keeps one billing path (Apple), one source of truth (StoreKit + `/billing/apple/verify`), and clear cancel instructions.

## Procedures

### A. New agency signup

1. User creates an account on web or iOS (email / Apple / Google).
2. User completes agency onboarding if needed.
3. App shows the paywall. User picks **Mobile** or **Platform**, then taps **Start 30 Day Free Trial**.
4. Apple presents the system purchase sheet (price, trial length, auto-renew disclosure).
5. On success, iOS sends the signed transaction to `POST /billing/apple/verify`.
6. Backend sets subscription status to `trial` with `trial_ends_at` from Apple's expiry, then `active` after conversion.

**Do not** create a backend `TRIAL` row at registration or social onboarding. Access is entitlement-gated.

### B. Feature access gates

| Surface | Gate |
|---------|------|
| iOS Record / upload assessment | `StoreKitService.hasPaidAccess` (active Apple entitlement or demo account) |
| Web CRM (visits, clients, pipeline) | Blocked for `mobile` tier via `MobileWebGate` + API visit create guard |
| Web billing / settings | Allowed for all paid tiers |
| API visit creation (mobile tier) | Allowed only from iOS (`X-Palm-Client: ios`) |
| Demo | `demo-screenshots@palmtai.com` bypasses paywall for App Review |

### C. App Store Connect ops checklist

When adding or changing Mobile pricing:

1. Create subscription `com.palmcareai.app.mobile.monthly` in the PalmCare Plans group.
2. Set USA price to **$79.99** (Apple's closest tier to $80) worldwide via `scripts/asc/set_subscription_prices.py`.
3. Add a **ONE_MONTH / FREE_TRIAL** introductory offer (match Platform).
4. Submit the new IAP for review with the next app build.
5. Run migration `040_mobile_assessment_plan` on production.
6. Update paywall copy, `/pricing`, Terms §4, and welcome email.

## Customer-facing disclosure (required on paywall)

- Selected plan name and monthly price after trial
- 30-day free trial terms
- Auto-renew until cancelled in Apple Subscriptions
- Restore Purchases link
