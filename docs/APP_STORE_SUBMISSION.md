# PALM — App Store / TestFlight Submission Checklist (v1.0 Beta)

This document captures App Store Connect setup and reviewer notes for the
**free beta** build (no in-app purchases). Codebase items are marked ✅ when done.

---

## 1. App Store Connect

### 1a. Create the app record
- **Display name:** PALM
- **Bundle ID:** `com.palmcareai.app`
- **Primary category:** Business
- **Secondary category:** Productivity
- **Avoid** Medical category for v1.0 beta — triggers extra HIPAA intake.
- **Age rating:** 17+ (Unrestricted Web Access; Medical/Treatment Information)

### 1b. Demo account for Apple review

| Field | Value |
| ----- | ----- |
| Email | `demo-screenshots@palmtai.com` |
| Password | *(stored in team password manager — set at account creation)* |

Agency: **Sunrise Home Care** (FL). Pre-seeded with 5 clients and 1 fully
processed assessment (Eleanor Whitfield: transcript, 8 billables, SOAP notes,
contract).

**Review notes (copy/paste):**

> PALM is a B2B care-documentation app for licensed U.S. home care agencies.
> Sign in with the demo account above. Tap **Palm It** (center mic) to record
> an assessment, or open **Home → Eleanor Whitfield** to view a completed visit
> with transcript, billables, clinical notes, and service agreement.
>
> **Beta:** All features are free during evaluation. There are **no in-app
> purchases** and no subscription paywall on iOS.
>
> **Microphone:** Used only to record client assessments. Recording continues in
> the background while a visit is active; it stops when the user taps Stop.
>
> **Account deletion:** Settings → Danger Zone → Delete Account (requires password).
>
> **Sign in with Apple:** Not required — email/password only; no third-party OAuth login.

---

## 2. Screenshots (ready)

**Location:** `marketing/app-store-screenshots/` — 19 captures at 1320×2868 (6.9" iPhone).

Suggested App Store order:
1. Landing (`01_landing.png`)
2. Home dashboard (`04_home.png`)
3. Record ready (`07_record_ready.png`)
4. Recording active (`08_recording_active.png`)
5. Assessment overview (`10_assessment_overview.png`)
6. Billables (`12_billables.png`)
7. Contract (`14_contract.png`)
8. Clients (`05_clients.png`)
9. Palm assistant (`19_palm_assistant.png`)

Web copies: `apps/web/public/screenshots/ios/`

---

## 3. Privacy & legal URLs

| Item | URL |
| ---- | --- |
| Privacy Policy | https://palmcareai.com/legal/privacy |
| Terms | https://palmcareai.com/legal/terms |
| Marketing | https://palmcareai.com |
| Support | mailto:support@palmtai.com |

App Privacy form should match `ios-app/PalmCareAI/PrivacyInfo.xcprivacy`.

---

## 4. Codebase items ✅ (beta build)

- ✅ Account deletion — Settings → Danger Zone → `POST /auth/delete-account`
- ✅ `PrivacyInfo.xcprivacy` — collected data types + Required Reason APIs (no IAP/analytics entries)
- ✅ No unused Camera/Photo Library permission strings
- ✅ No in-app subscription paywall (beta_free_access on API)
- ✅ `ITSAppUsesNonExemptEncryption=false`
- ✅ Microphone + background audio usage strings
- ✅ Terms & Privacy links at registration + in-app sheet
- ✅ PALM branding (not "AI-powered")
- ✅ 51-state contract pipeline validated (`scripts/test_all_states.py --llm`)

---

## 5. Build & upload

```bash
cd ios-app
xcodegen generate
xcodebuild -project PalmCareAI.xcodeproj \
    -scheme PalmCareAI \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/PalmCareAI.xcarchive \
    archive
```

Upload via Xcode Organizer or Transporter.

---

## 6. Post-beta (when adding paid plans)

Re-enable StoreKit paywall, App Store Server Notifications, and update
privacy manifest with Purchase History. See git history before subscription
removal (commit ~e3112a29).
