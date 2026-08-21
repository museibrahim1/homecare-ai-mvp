# Subscription & Free Trial Policy

**Effective:** 2026-08-20  
**Owner:** Muse Ibrahim / Palm Technologies  
**Product:** PalmCare AI (`com.palmcareai.app`)  
**Plan:** `$199/month` (`com.palmcareai.app.starter.monthly`)

## Summary

| Rule | Policy |
|------|--------|
| Trial length | **30 days** (Apple introductory free trial) |
| How trial starts | Only by completing Apple In-App Purchase in the iOS app |
| Payment method | Required via Apple ID (App Store payment method on file) |
| After trial | Apple **automatically charges** the monthly price and renews until cancelled |
| Web register alone | Creates an account only. Does **not** unlock assessments |
| Cancel | iPhone Settings → Apple ID → Subscriptions, anytime before renewal |

## Why this model

1. Apple Guideline 3.1.2: digital subscriptions for iOS features go through IAP.
2. A no-card web trial cannot auto-charge when it ends.
3. Subscribe-to-start with a free trial keeps one billing path (Apple), one source of truth (StoreKit + `/billing/apple/verify`), and clear cancel instructions.

## Procedures

### A. New agency signup

1. User creates an account on web or iOS (email / Apple / Google).
2. User completes agency onboarding if needed.
3. App shows the paywall. User taps **Start 30 Day Free Trial**.
4. Apple presents the system purchase sheet (price, trial length, auto-renew disclosure).
5. On success, iOS sends the signed transaction to `POST /billing/apple/verify`.
6. Backend sets subscription status to `trial` with `trial_ends_at` from Apple’s expiry, then `active` after conversion (via Apple server notifications / entitlement sync).

**Do not** create a backend `TRIAL` row at registration or social onboarding. Access is entitlement-gated.

### B. Feature access gates

| Surface | Gate |
|---------|------|
| iOS Record / upload assessment | `StoreKitService.hasPaidAccess` (active Apple entitlement or demo account) |
| Soft browse (clients, settings) | Allowed without purchase |
| API visit creation | Requires `ACTIVE` or `TRIAL` subscription when `BETA_FREE_ACCESS=false` |
| Demo | `demo-screenshots@palmtai.com` bypasses paywall for App Review |

### C. Trial end / auto-charge

1. Apple owns the billing clock. At trial end, if not cancelled, Apple charges the Apple ID and renews monthly.
2. App Store Server Notifications update our `Subscription` row (renewal, expire, refund, revoke).
3. On app launch, `StoreKitService.syncEntitlements()` re-verifies current entitlements with the backend.
4. If entitlement is gone, the next assessment attempt shows the paywall.

### D. Cancellation & refunds

1. Customer cancels in Apple Subscriptions (not inside our web billing page).
2. Access continues until the end of the paid period Apple grants.
3. Refunds: Apple’s process (`beginRefundRequest` in Settings, or reportaproblem.apple.com). Our Terms point to Apple for IAP refunds.
4. Free trial period itself is not refundable (no charge yet).

### E. App Store Connect ops checklist

When changing trial length or price:

1. Update introductory offer duration for **all territories** on `com.palmcareai.app.starter.monthly` (currently `ONE_MONTH` / `FREE_TRIAL`).
2. Update paywall copy (iOS), Terms §4, pricing/FAQ marketing, welcome email.
3. Confirm `apps/api/app/core/trial.py` `TRIAL_DAYS = 30` and ASC offer match.
4. Ship an App Store / TestFlight build so review notes and in-app disclosure stay accurate.
5. Set Railway `BETA_FREE_ACCESS=false` in production (default in code).

### F. Incidents

| Symptom | Check |
|---------|-------|
| Users record without paying | `BETA_FREE_ACCESS` env; registration still seeding trial rows |
| Trial shows 14 days in App Store sheet | ASC intro offer still `TWO_WEEKS` |
| Paid but locked in app | Restore Purchases; `/billing/apple/verify`; Apple notification lag |
| Watched demo account locked | Ensure demo email bypass remains in `StoreKitService.isDemoEmail` |

## Customer-facing disclosure (required on paywall)

Must show before purchase (Guideline 3.1.2):

- Title / length of subscription  
- Price and price per unit  
- **30-day free trial**, then auto-renewing monthly charge to Apple ID  
- Link to Terms of Use and Privacy Policy  
- Restore Purchases  

## Related files

- `ios-app/PalmCareAI/Views/Settings/PaywallView.swift`  
- `ios-app/PalmCareAI/Services/StoreKitService.swift`  
- `apps/api/app/routers/apple_iap.py`  
- `apps/api/app/core/trial.py`  
- `apps/web/src/app/terms/page.tsx`  
- `scripts/asc/` (App Store Connect API)
