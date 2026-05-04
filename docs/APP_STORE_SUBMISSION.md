# PalmCare AI — App Store Submission Checklist (v1.0)

This document captures everything that lives **outside the codebase** and must
be configured for first submission. The codebase changes are already in place
(see commit history for details).

---

## 1. App Store Connect

### 1a. Create the app record
- Bundle ID: `com.palmtechnologies.palmcare`
- Primary category: **Business**
- Secondary category: **Productivity**
  - Avoid `Medical` for v1.0 — it triggers stricter review and an additional
    "are you a covered entity?" intake that takes weeks.
- Age rating: 17+ (Unrestricted Web Access; Medical/Treatment Information)

### 1b. Demo account for Apple review
| Field | Value |
| ----- | ----- |
| Email | `demo@agency.com` |
| Password | `demo1234` |

Add review notes:
> PalmCare AI is a B2B documentation tool used by licensed home-care agencies
> in the United States. The reviewer demo account contains seeded clients and
> visits already populated, so the reviewer can record a brief assessment, then
> see live transcription, billable items, and an auto-generated contract.
>
> Sensitive note: the recording feature uses the microphone with a clear in-app
> consent banner; recorded audio is processed for transcription only and is not
> sold or shared with third parties.

---

## 2. In-App Purchase (StoreKit 2)

The app uses **only** Apple IAP for iOS subscriptions; the Stripe path stays
for the web at palmcareai.com.

### 2a. Create a Subscription Group
Name: **PalmCare Plans**

### 2b. Create three auto-renewable subscriptions
The product IDs **must** match the constants in
`ios-app/PalmCareAI/Services/StoreManager.swift` and the map in
`apps/api/app/routers/apple_iap.py`.

| Product ID | Display Name | Price (USD/mo) | Notes |
| ---------- | ------------ | -------------: | ----- |
| `com.palmtechnologies.palmcare.starter.monthly` | Starter | 89.99 | 5 visits/mo |
| `com.palmtechnologies.palmcare.growth.monthly` | Growth | 199.00 | 25 visits/mo (most popular) |
| `com.palmtechnologies.palmcare.pro.monthly` | Pro | 399.00 | 50 visits/mo |

For each product, fill out:
- Subscription duration: **1 month, auto-renewing**
- Localized display name + description (must match the in-app paywall text)
- Review screenshot (App Store Connect requires at least one)

### 2c. App Store Server Notifications V2
Set the production URL to:
```
https://api-production-a0a2.up.railway.app/billing/apple/notifications
```
Also set the sandbox URL to the same path on a sandbox API instance if you
spin one up.

### 2d. App Store Server API key
- Create a Customer Communications key in App Store Connect → Users and Access
  → Keys → In-App Purchase.
- Download the `.p8` and store it as a Railway secret named
  `APP_STORE_PRIVATE_KEY` (used by `app-store-server-library` for refund
  webhooks if/when we extend the integration).
- Note the Key ID and Issuer ID for env vars below.

### 2e. Apple root certificates on the API server
Download the four Apple root CAs that sign StoreKit JWS:
- AppleIncRootCertificate
- AppleComputerRootCertificate
- AppleRootCA-G2
- AppleRootCA-G3

Place them in a directory and point `APPLE_ROOT_CERTS_DIR` at it on Railway.

---

## 3. Railway environment variables (production API)

Add these to the production API service:

| Var | Value |
| --- | ----- |
| `APPLE_BUNDLE_ID` | `com.palmtechnologies.palmcare` |
| `APPLE_ENVIRONMENT` | `Production` |
| `APPLE_ROOT_CERTS_DIR` | `/app/secrets/apple-root-certs` |
| `APPLE_TEAM_ID` | `QFS97GTYJH` |
| `APP_STORE_KEY_ID` | (from App Store Connect) |
| `APP_STORE_ISSUER_ID` | (from App Store Connect) |

After redeploy, run a smoke test against `/billing/apple/products` — it should
return all three product IDs.

---

## 4. App Privacy details (App Store Connect)

These mirror `PalmCareAI/PrivacyInfo.xcprivacy`. Apple's app-privacy form maps:

| Data type | Linked? | Tracking? | Purpose |
| --------- | :-----: | :-------: | ------- |
| Name | Yes | No | App functionality |
| Email | Yes | No | App functionality, Customer support |
| Phone number | Yes | No | App functionality |
| Physical address | Yes | No | App functionality |
| Other user contact info (clients, emergency contacts) | Yes | No | App functionality |
| Health / Sensitive info (visit notes, care plans) | Yes | No | App functionality |
| Audio data (recordings) | Yes | No | App functionality |
| User ID | Yes | No | App functionality, Authentication |
| Purchase history | Yes | No | App functionality |
| Product interaction | Yes | No | App functionality |
| Crash data | No | No | App functionality |

---

## 5. Other reviewer-facing items

### 5a. Privacy Policy URL
`https://palmcareai.com/legal/privacy` — must be reachable without auth.

### 5b. Marketing URL
`https://palmcareai.com`

### 5c. Support URL
`https://palmcareai.com/support` (or `mailto:support@palmtai.com`).

### 5d. Screenshots required
- 6.7" iPhone (Pro Max): 5 screenshots minimum
- 6.5" iPhone: same screenshots accepted
- 12.9" iPad Pro: required because we ship iPad support — 5 screenshots.
- All screenshots must show actual UI (no marketing mockups for medical apps;
  Apple has rejected this in the past for healthcare).

Suggested set: Landing → Record orb → Live transcript → Visit detail with
billables → Auto-generated contract.

### 5e. App Review notes — copy paste
> PalmCare AI is a U.S.-only B2B SaaS used by home-care agency owners and
> caregivers to document client visits and generate compliant care contracts.
> All paid plans use StoreKit in-app purchase. The web app
> (palmcareai.com) uses Stripe; iOS users are never linked out to Stripe.
>
> Background audio: the app records caregiver visits which often last 30–90
> minutes. The microphone usage description discloses that recording continues
> in the background while a visit is in progress. Recording stops as soon as
> the user taps "Stop" on the recording screen. We hold a brief
> UIApplication background task to flush the WAV file and ensure no audio is
> lost on app backgrounding mid-visit.
>
> Sign in with Apple: not implemented because the app does not offer any
> third-party sign-in (Google/Facebook/etc.). Email/password auth only.

---

## 6. Codebase items already in place

- ✅ Account deletion in Settings → Danger Zone
  (`POST /auth/delete-account`)
- ✅ `PrivacyInfo.xcprivacy` — collected data types + Required Reason APIs
- ✅ iPad Multitasking support (`UIRequiresFullScreen` removed)
- ✅ `UIBackgroundModes: [audio]` + interruption handling in
  `AudioRecorderService`
- ✅ StoreKit 2 paywall (`SubscriptionView` + `StoreManager`)
- ✅ Backend `/billing/apple/verify` endpoint with JWS verification
- ✅ Backend `/billing/apple/notifications` for App Store webhooks
- ✅ "Restore Purchases" button + EULA + Privacy Policy links on paywall
- ✅ ITSAppUsesNonExemptEncryption=false (only standard HTTPS)
- ✅ Microphone usage string updated to disclose background recording
- ✅ Cert pinning + Keychain `WhenUnlockedThisDeviceOnly` for HIPAA posture

---

## 7. Build & upload

```bash
cd ios-app
xcodegen generate
xcodebuild -project PalmCareAI.xcodeproj \
    -scheme PalmCareAI \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/PalmCareAI.xcarchive \
    archive
xcodebuild -exportArchive \
    -archivePath build/PalmCareAI.xcarchive \
    -exportOptionsPlist ExportOptions.plist \
    -exportPath build/Export
```

Then upload via Transporter or:
```bash
xcrun altool --upload-app -f build/Export/PalmCareAI.ipa \
    -t ios --apiKey "$APP_STORE_KEY_ID" --apiIssuer "$APP_STORE_ISSUER_ID"
```
