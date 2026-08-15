# Google + Apple Sign-In Design

**Date:** 2026-08-15  
**Status:** Approved for implementation planning  
**Surfaces:** iOS app + web (`apps/web`)  
**Auth stack:** Existing FastAPI + Postgres + JWT (not Supabase Auth)

## Goal

Let caregivers sign up and sign in with Google or Apple on iOS and web, with lower friction than email/password, while keeping the current session model, business onboarding, trial, and account deletion.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Surfaces | iOS + web |
| Architecture | Native provider tokens → `POST /auth/social` → PalmCare JWT |
| New social user | Create `User` first; agency name + consent in a post-login step |
| Same email as existing account | Auto-link provider and sign in |
| Email/password / magic link / MFA | Unchanged |
| Unlink providers in Settings | Out of scope for v1 |
| Web `localStorage` token hardening | Out of scope for v1 (separate task) |

## Architecture

```
Google / Apple UI
        ↓
id_token (+ Apple full name on first grant only)
        ↓
POST /auth/social { provider, id_token, full_name?, nonce? }
        ↓
Verify JWT (Apple JWKS / Google certs; check aud)
        ↓
Match user_identities.provider_user_id
  else match verified email → auto-link identity
  else create User (password_hash nullable)
        ↓
Issue access_token + refresh_token (same as today)
        ↓
needs_onboarding? → agency name + consent screen
        ↓
POST /auth/business/complete-onboarding
        ↓
Business + BusinessUser (owner) + AgencySettings + 14-day trial
        ↓
Main app
```

Rate-limit `/auth/social` like login. Log HIPAA-style audit events for social login, link, onboard, and delete.

## UI

### Login and Register (iOS + web)

- Buttons above the email form: **Continue with Apple**, **Continue with Google**
- Divider: “or use email”
- Apple must be offered whenever Google is (App Store Guideline: Sign in with Apple required if third-party social login is offered)
- Keep existing email/password, magic link, and MFA flows

### Post-social onboarding (new screen)

Shown when the authenticated user has no Business yet:

- Agency name (optional default from Google/Apple display name or email local-part)
- Same ToS / Privacy / AI-data consent as `RegistrationConsentView` / web register
- Submit → `complete-onboarding` → enter app
- Block main tabs until onboarding completes

### Account deletion (required, already partially shipped)

Exists today: iOS `DeleteAccountSheet` + `POST /auth/delete-account`.

**Gap:** delete currently requires `password`. Social-only users have no password and cannot delete.

**v1 fix:**

- If `hashed_password` is set → keep password + `"DELETE MY ACCOUNT"` confirmation
- If social-only (no password) → require confirmation string + typed email match (or recent social re-auth). No password field.
- Cascade cleanup stays as today (visits, business teardown, etc.)
- Platform admin `@palmtai.com` self-delete remains blocked

## Data model

### New table `user_identities`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | cascade delete |
| provider | text | `apple` \| `google` |
| provider_user_id | text | stable subject (`sub`) |
| email | text nullable | last email from provider |
| created_at | timestamptz | |
| unique | (provider, provider_user_id) | |
| index | user_id | |

One user may have password + Apple + Google.

### `users` changes

- `hashed_password` nullable (social-only accounts)
- Email unique still enforced when present
- Apple private relay emails are valid emails; store as-is

### Deriving `needs_onboarding`

`true` when there is no `BusinessUser` (or Business) linked for this user id. Do not invent a separate flag unless needed for caching.

## API

### `POST /auth/social`

Request:

```json
{
  "provider": "apple" | "google",
  "id_token": "...",
  "full_name": "optional, Apple first grant",
  "nonce": "optional, if client hashed nonce into token"
}
```

Behavior:

1. Verify signature and claims (`iss`, `aud`, `exp`; nonce if provided)
2. Audiences:
   - Apple: iOS bundle id `com.palmcareai.app` and web Services ID
   - Google: iOS client id and web client id
3. Resolve user: identity row → else email auto-link → else create user
4. Return tokens + `needs_onboarding` + user payload compatible with `/auth/me`

Errors (stable, user-safe):

- 401 invalid/expired token
- 400 unsupported provider / missing token
- 429 rate limited

### `POST /auth/business/complete-onboarding`

Auth required. Body: `{ "agency_name": "...", "consent": true }`.

- Reject if consent false
- If already has Business → return current business (idempotent)
- Else create Business + owner BusinessUser + AgencySettings + 14-day trial (mirror `POST /auth/business/register` side effects, without password)

### `POST /auth/delete-account` (update)

Extend `DeleteAccountRequest`:

- `confirmation: str` (required, `"DELETE MY ACCOUNT"`)
- `password: str | null` — required only when user has a password
- `email_confirm: str | null` — required when user has no password; must match account email

## Client work

### iOS

- Entitlements: `com.apple.developer.applesignin`
- Apple: `AuthenticationServices` (`ASAuthorizationAppleIDProvider`)
- Google: Google Sign-In SDK (or OIDC) with iOS client id; send `idToken` to API
- `APIService`: `socialLogin`, `completeOnboarding`; update delete-account payload for social-only
- Gate `MainTabView` / root on `needs_onboarding`
- New `SocialOnboardingView` (agency + consent)

### Web

- Google Identity Services / One Tap or button → `credential` (JWT) → API
- Apple JS SDK for Services ID → `id_token` → API
- Same buttons on `/login` and `/register`
- Onboarding route or modal before `/dashboard`
- Delete-account UI: hide password when social-only

## Console / env setup (manual once)

### Apple

- Enable Sign in with Apple on App ID
- Create Services ID for web (return URLs for palmcareai.com)
- Create Sign in with Apple key (`.p8`); note Key ID + Team ID
- iOS entitlements wired in Xcode / `project.yml`

### Google

- OAuth client IDs: iOS + Web
- Authorized JS origins / redirect URIs for web

### Railway / `.env` (names)

```
APPLE_SIGNIN_TEAM_ID
APPLE_SIGNIN_KEY_ID
APPLE_SIGNIN_PRIVATE_KEY   # PEM contents or path
APPLE_SIGNIN_CLIENT_IDS    # comma: bundle id, services id
GOOGLE_SIGNIN_CLIENT_IDS   # comma: iOS + web client ids (audiences)
```

Do not reuse Calendar/Gmail `GOOGLE_CLIENT_ID` / secret for identity login audiences unless they are intentionally the same OAuth clients (prefer dedicated sign-in clients).

Existing `APPLE_*` IAP vars stay for StoreKit only.

## Error and edge cases

| Case | Behavior |
|---|---|
| User cancels sheet | Stay on login; no error toast spam |
| Invalid token | “Sign-in failed. Try again.” |
| Apple hides email on later grants | Match via `provider_user_id` from first grant |
| Email already has Business | Auto-link; skip onboarding |
| Duplicate social create race | Unique on `(provider, provider_user_id)`; retry as login |
| Social-only delete | Email confirm + DELETE string; no password |

## Testing checklist

- [ ] New Apple user → onboarding → trial → Home (iOS)
- [ ] New Google user → same (iOS + web)
- [ ] Existing password user + Google same email → one account, linked, no second Business
- [ ] Social-only delete → data removed; cannot sign in again
- [ ] Password user delete still requires password
- [ ] Email/password, magic link, MFA unchanged
- [ ] Incomplete onboarding cannot reach main product tabs

## Out of scope (v1)

- Provider unlink in Settings
- Microsoft / Facebook / SSO
- Migrating web tokens from `localStorage` to httpOnly-only
- Changing Apple IAP or Google Calendar OAuth flows

## Non-goals

- Replacing FastAPI auth with Supabase Auth or Clerk
- Fabricating testimonials or changing marketing claims
