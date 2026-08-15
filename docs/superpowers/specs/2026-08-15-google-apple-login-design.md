# Google + Apple Sign-In Design

**Date:** 2026-08-15  
**Status:** Approved for implementation (spec patched 2026-08-15 for schema/id/identity gaps)  
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
  else create User (hashed_password NULL)
        ↓
ALWAYS upsert user_identities (provider, provider_user_id, email)
        ↓
Issue access_token + refresh_token (same as today)
        ↓
needs_onboarding? → agency name + consent screen
        ↓
POST /auth/business/complete-onboarding
        ↓
Business + BusinessUser(id = User.id, password_hash nullable) + AgencySettings + trial
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

- `hashed_password` **nullable** (social-only accounts). Migration: `ALTER … ALTER COLUMN hashed_password DROP NOT NULL`
- Email unique still enforced when present
- Apple private relay emails are valid emails; store as-is
- `full_name` stays **NOT NULL**. On create, set with the fallback chain in `/auth/social` below (never insert NULL)

### `business_users` changes (required for social onboarding)

Today `password_hash` is `nullable=False`. Email register always sets a real hash. Social complete-onboarding has no password.

- Migration: `business_users.password_hash` **nullable**
- Social owner rows: `password_hash = NULL`
- Password login / business login paths that call `verify_password` must treat NULL hash as “no password login” (401), not crash
- Do **not** invent a fake bcrypt sentinel unless a downstream path still requires a string; prefer NULL + explicit checks

### Shared User ↔ BusinessUser id (required)

Email register creates `BusinessUser` first, then `User(id=owner.id)` so both tables share one UUID.

Social creates `User` first. Therefore **`complete-onboarding` MUST create the owner `BusinessUser` with `id=current_user.id`** (the authenticated User’s id), not a new `uuid4()`.

`needs_onboarding` is true when **no** `BusinessUser` exists with `BusinessUser.id == User.id` (same rule as today for linked accounts). Creating a BusinessUser with a different id would leave onboarding stuck `true` forever.

### Deriving `needs_onboarding`

`true` when there is no `BusinessUser` row whose **`id` equals the authenticated `User.id`**. Do not invent a separate flag unless needed for caching.

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
3. Resolve user:
   - Match `user_identities` by `(provider, provider_user_id)` → use that user
   - Else match `users.email` to verified provider email → **auto-link** (insert identity)
   - Else **create** `User` with `hashed_password=NULL` and:
     - `full_name` = request `full_name` (trimmed) if non-empty
       else token `name` claim if present
       else email local-part (before `@`) if email present
       else `"PalmCare User"`
     - Reject (400) if creating a user with **no email and no prior identity** cannot happen for Google; for Apple, email is required on first grant — if missing on create path, return 400 “Apple did not provide an email. Use email signup or try again.”
4. **Always write `user_identities`** after resolve (create or update):
   - On new user or auto-link: `INSERT` `(user_id, provider, provider_user_id, email)`
   - On existing identity match: optionally refresh `email` if provider returned one
   - This insert is **mandatory**. Later Apple grants often omit email; repeat login depends on stored `provider_user_id`
5. Return tokens + `needs_onboarding` + user payload compatible with `/auth/me`

Errors (stable, user-safe):

- 401 invalid/expired token
- 400 unsupported provider / missing token / missing Apple email on first create
- 429 rate limited

### `POST /auth/business/complete-onboarding`

Auth required. Body: `{ "agency_name": "...", "consent": true }`.

- Reject if consent false
- If `BusinessUser` already exists with `id == current_user.id` → return that business (idempotent)
- Else create:
  1. `Business` (agency name from body, or fallback from `user.full_name` / email local-part)
  2. **`BusinessUser(id=current_user.id`, `business_id=…`, `email=user.email`, `full_name=user.full_name`, `password_hash=NULL`, `role="owner"`, `is_owner=True`, `email_verified=True`)** — same UUID as User
  3. `AgencySettings` + 14-day trial subscription (mirror `POST /auth/business/register` side effects, without setting a password)
- Do **not** create a second `User` row (social already created it)

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
| Apple hides email on later grants | Match via stored `user_identities.provider_user_id` from first grant (identity row required on every successful social auth) |
| Missing display name on create | Fallback: token name → email local-part → `"PalmCare User"`; never NULL `users.full_name` |
| Email already has Business | Auto-link; skip onboarding (`BusinessUser.id == User.id` already exists) |
| Duplicate social create race | Unique on `(provider, provider_user_id)`; retry as login |
| Social-only delete | Email confirm + DELETE string; no password |

## Spec patches (2026-08-15)

Verified against live models (`users.hashed_password` / `full_name` NOT NULL; `business_users.password_hash` NOT NULL; register uses `User(id=owner.id)`):

1. **Bug:** complete-onboarding would violate `business_users.password_hash NOT NULL`. **Fix:** make column nullable; social owners store NULL; password verify paths handle NULL.
2. **Bug:** `needs_onboarding` keyed off User id, but creating a new BusinessUser uuid would never clear it. **Fix:** `BusinessUser(id=current_user.id)` on complete-onboarding.
3. **Bug:** optional `full_name` vs `users.full_name NOT NULL`. **Fix:** documented fallback chain; never insert NULL.
4. **Bug:** resolve path did not require writing `user_identities`. **Fix:** always upsert identity after resolve so Apple email-less re-logins work.

## Testing checklist

- [ ] New Apple user → onboarding → trial → Home (iOS); `BusinessUser.id == User.id`
- [ ] New Google user → same (iOS + web)
- [ ] Existing password user + Google same email → one account, linked identity row, no second Business
- [ ] Second Apple sign-in with email omitted → finds same user via `user_identities`
- [ ] Social create with no display name → user gets fallback full_name; no DB error
- [ ] Social-only delete → data removed; cannot sign in again
- [ ] Password user delete still requires password
- [ ] Email/password, magic link, MFA unchanged
- [ ] Incomplete onboarding cannot reach main product tabs
- [ ] After complete-onboarding, `needs_onboarding` is false

## Out of scope (v1)

- Provider unlink in Settings
- Microsoft / Facebook / SSO
- Migrating web tokens from `localStorage` to httpOnly-only
- Changing Apple IAP or Google Calendar OAuth flows

## Non-goals

- Replacing FastAPI auth with Supabase Auth or Clerk
- Fabricating testimonials or changing marketing claims
