# PalmCare AI — App Store Launch Plan

> Step-by-step guide to publishing PalmCare AI on the iOS App Store.

---

## Phase 1: Apple Developer Account (Do First)

- [ ] **Enroll in the Apple Developer Program** at [developer.apple.com/programs](https://developer.apple.com/programs)
  - Cost: **$99/year**
  - Use your business entity (Palm Technologies) or personal account
  - Enrollment takes **24–48 hours** to approve
  - You need this before you can do anything else

- [ ] **Once approved**, sign in to:
  - [App Store Connect](https://appstoreconnect.apple.com)
  - [Apple Developer Portal](https://developer.apple.com)

---

## Phase 2: Certificates & Provisioning (Xcode)

- [ ] In **Xcode → Settings → Accounts**, add your Apple Developer account
- [ ] In your **project target → Signing & Capabilities**:
  - Set **Team** to your developer account/organization
  - Verify **Bundle ID** is `com.palmtechnologies.palmcare`
  - Enable **"Automatically manage signing"**
  - Xcode will create the provisioning profile and certificates automatically

- [ ] Confirm these **capabilities/permissions** are in Info.plist (already done):
  - Microphone usage description
  - Face ID usage description
  - Custom URL scheme (`com.palmcare.ai`)

---

## Phase 3: App Icon

- [ ] **Create the app icon** — a static version of the landing page orb:
  - **Size**: 1024×1024px PNG, no transparency, no rounded corners (iOS adds them)
  - **Design**: Teal-to-cyan-to-purple angular gradient background matching the orb colors (`#0D9488`, `#0891B2`, `#8B5CF6`, `#2DD4BF`), white mic icon centered
  - Tools: Figma, Canva, or ask your AI assistant to generate it
  - **Replace** the file at: `ios-app/PalmCareAI/Assets.xcassets/AppIcon.appiconset/AppIcon.png`

---

## Phase 4: App Store Connect Setup

### 4a. Create the App

- [ ] In [App Store Connect](https://appstoreconnect.apple.com), click **"+" → New App**
  - **Platform**: iOS
  - **Name**: PalmCare AI
  - **Primary Language**: English (U.S.)
  - **Bundle ID**: `com.palmtechnologies.palmcare`
  - **SKU**: `palmcare-ai-ios`

### 4b. App Information

- [ ] **Category**: Medical (primary), Business (secondary)
- [ ] **Content Rights**: Does not contain third-party content
- [ ] **Age Rating**: Fill out questionnaire (likely **4+**, no objectionable content)

### 4c. Pricing & Availability

- [ ] **Price**: Free (if using in-app subscriptions for Starter/Growth/Pro)
- [ ] **Regions**: Select countries to distribute in
- [ ] **Subscriptions**: If applicable, set up in-app subscription tiers under **App Store Connect → Subscriptions**

### 4d. App Store Listing Content

| Field | Content |
|-------|---------|
| **Subtitle** (30 chars) | `AI-Powered Care Documentation` |
| **Promotional Text** (170 chars) | `Record client assessments with AI. Auto-generate contracts, notes, and transcriptions. Built for home care professionals.` |
| **Description** | See draft below |
| **Keywords** (100 chars) | `homecare,caregiver,assessment,transcription,contracts,AI,healthcare,documentation,nursing,notes` |
| **Support URL** | Your website or support page (required) |
| **Marketing URL** | Your website (optional) |
| **Privacy Policy URL** | Hosted privacy policy page (**required**) |

#### Draft App Description

```
PalmCare AI is the all-in-one documentation tool built for home care professionals.

RECORD & TRANSCRIBE
Tap to record client assessments. PalmCare AI transcribes your voice in real-time with speaker diarization, so you can focus on your client — not paperwork.

AUTO-GENERATE DOCUMENTS
Contracts, assessment notes, and reports are generated automatically after each visit. Download as PDF or DOCX, organized by client.

CLIENT MANAGEMENT
Keep all your clients organized with contact info, medical history, emergency contacts, and visit history in one place.

WORKSPACE
Your calendar, contracts, and tasks — all in one workspace. Documents are grouped by client for easy access.

SECURE & PRIVATE
Face ID login, encrypted data, and HIPAA-conscious design keep your clients' information safe.

Whether you're a solo caregiver or managing a team, PalmCare AI saves you hours of documentation every week.
```

---

## Phase 5: Screenshots

- [ ] Take screenshots on these device sizes (**minimum 2 sizes required**):

| Device Size | Resolution | Example Device |
|-------------|------------|----------------|
| **6.7"** | 1290 × 2796 | iPhone 15 Pro Max |
| **6.5"** | 1284 × 2778 | iPhone 14 Plus |
| **5.5"** (optional) | 1242 × 2208 | iPhone 8 Plus |

- [ ] **Take 5–8 screenshots per size** showing these screens:
  1. Landing page with the orb
  2. Home dashboard with stats and recent visits
  3. Palm It (recording) screen
  4. Clients list
  5. Client detail view
  6. Workspace → Contracts organized by client
  7. Settings page
  8. (Optional) Calendar or Tasks view

- [ ] **Add text overlays** (recommended but optional):
  - "Record assessments with AI"
  - "Auto-generate contracts & notes"
  - "Manage all your clients in one place"
  - Tools: Figma, [screenshots.pro](https://screenshots.pro), or Canva

> **Tip**: Use the Simulator in Xcode (Cmd+S to screenshot) or a real device (Power + Volume Up).

---

## Phase 6: Privacy & Compliance

### 6a. App Privacy Nutrition Labels

- [ ] In App Store Connect, fill out **App Privacy**:

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|-----------------|-------------------|
| Email address | Yes | Yes | No |
| Name | Yes | Yes | No |
| Phone number | Yes | Yes | No |
| Health data (client records) | Yes | Yes | No |
| Audio data (recordings) | Yes | Yes | No |
| User ID | Yes | Yes | No |

### 6b. Privacy Policy

- [ ] **Host a privacy policy page** at a public URL
  - The app already has Terms & Privacy content in the Settings view — use that as a starting point
  - Can be a simple webpage, a Google Doc set to public, or a page on your website
  - **Must** be accessible without login

### 6c. HIPAA Considerations

- [ ] If marketing to healthcare providers:
  - Mention HIPAA compliance in your app description
  - Ensure backend has encryption at rest and in transit (Railway uses HTTPS ✓)
  - Consider a BAA (Business Associate Agreement) with your hosting provider if handling real PHI

---

## Phase 7: Pre-Upload Checklist

Before archiving, verify these:

- [ ] **Version number** is set: `1.0.0` (Marketing Version in Xcode target)
- [ ] **Build number** is set: `1` (increment for each upload)
- [ ] **App icon** is in place (1024×1024, no transparency)
- [ ] **All placeholder buttons work** — Apple rejects apps with non-functional UI
- [ ] **Demo account works** — test login with `demo@agency.com`
- [ ] **No crashes** on launch, login, recording, or navigating tabs
- [ ] **Privacy policy URL** is live and accessible
- [ ] **Google Calendar redirect URI** added to Google Cloud Console:
  `https://api-production-a0a2.up.railway.app/calendar/mobile-callback`

---

## Phase 8: Build & Upload

- [ ] In Xcode, select **"Any iOS Device (arm64)"** as the build destination
- [ ] **Product → Archive** (wait for it to complete)
- [ ] In the **Organizer** window (Window → Organizer):
  - Select the archive
  - Click **"Distribute App"**
  - Choose **"App Store Connect"**
  - Click **Upload**
  - Wait for processing (5–15 minutes)

- [ ] The build will appear in **App Store Connect → TestFlight** and under your app's version

---

## Phase 9: TestFlight Testing (Recommended)

### Internal Testing (No Review Needed)

- [ ] In App Store Connect → TestFlight → **Internal Testing**
- [ ] Add yourself and any team members (up to 25 testers)
- [ ] Install via TestFlight app on your iPhone
- [ ] Test all features end-to-end:
  - Login / registration
  - Recording an assessment
  - Viewing clients and client detail
  - Downloading contracts
  - Calendar, Tasks
  - Settings (Face ID, password change)
  - Google Calendar connection

### External Testing (Optional, Requires Beta Review)

- [ ] Add external testers by email
- [ ] Submit for **Beta App Review** (24–48 hours)
- [ ] Good for getting feedback from real care professionals before launch

---

## Phase 10: Submit for App Review

- [ ] In App Store Connect, go to your app version
- [ ] **Select the build** you uploaded
- [ ] **Add Review Notes** for Apple:
  ```
  Demo account for testing:
  Email: demo@agency.com
  Password: [your demo password]
  
  This app is for home care professionals to record client 
  assessments via voice, auto-generate contracts and notes, 
  and manage client information. Microphone access is used 
  for recording assessments. Face ID is used for quick login.
  ```

- [ ] **Submit for Review**

### Timeline & Common Rejection Reasons

| Item | Detail |
|------|--------|
| **Review time** | Usually 24–48 hours (can take up to 7 days) |
| **Rejection: Missing privacy policy** | Ensure your privacy policy URL is live |
| **Rejection: Broken login** | Make sure demo account works on production API |
| **Rejection: Placeholder content** | No "Coming Soon" or non-functional buttons |
| **Rejection: Crashes** | Test thoroughly on a real device |
| **Rejection: Incomplete metadata** | Fill out all required fields in App Store Connect |

> If rejected, Apple will tell you exactly why. Fix the issue, increment the build number, re-upload, and resubmit.

---

## Phase 11: Launch Day

- [ ] **Once approved**, choose your release option:
  - **Immediately** — goes live as soon as approved
  - **Scheduled date** — pick a specific launch date
  - **Manual release** — you control when it goes live

- [ ] **Post-launch tasks**:
  - Monitor **crash reports** in Xcode Organizer and App Store Connect
  - Respond to **user reviews** in App Store Connect
  - Track **downloads and usage** in App Store Connect Analytics
  - Plan **version 1.1** based on user feedback
  - Consider **App Store Optimization** (ASO): update keywords, screenshots, description based on what converts

---

## Quick Reference Checklist

| # | Step | Status |
|---|------|--------|
| 1 | Apple Developer Account ($99/yr) | ⬜ |
| 2 | Xcode signing & provisioning | ⬜ |
| 3 | App icon (orb + mic, 1024×1024) | ⬜ |
| 4 | App Store Connect listing created | ⬜ |
| 5 | App description & keywords written | ⬜ |
| 6 | Screenshots taken (6.7" and 6.5") | ⬜ |
| 7 | Privacy policy URL hosted & live | ⬜ |
| 8 | App Privacy nutrition labels filled | ⬜ |
| 9 | Google Calendar redirect URI added | ⬜ |
| 10 | Archive & upload from Xcode | ⬜ |
| 11 | TestFlight internal testing | ⬜ |
| 12 | Review notes with demo account | ⬜ |
| 13 | Submit for App Review | ⬜ |
| 14 | Launch! | ⬜ |

---

*Last updated: February 22, 2026*
