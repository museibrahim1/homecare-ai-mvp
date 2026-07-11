# PostHog Warehouse Runbook (PalmCare AI)

This is the fastest path to finish warehouse setup in PostHog from your local terminal/UI.

## 1) Run the wizard locally (interactive terminal)

From `apps/web`:

```bash
npx -y @posthog/wizard@latest warehouse
```

Use a normal terminal (not CI/non-interactive), or it will fail with the raw-mode TTY error.

## 2) Connect Postgres first

Source type: `Postgres`  
Region: `US` (current default for this project)

Map fields from your API `DATABASE_URL`:

- `host`
- `port`
- `database`
- `user`
- `password`
- `schema`: `public`

## 3) (Recommended) Use a read-only DB user

Run this on production Postgres before connecting PostHog:

```sql
-- create readonly user
CREATE ROLE posthog_ro LOGIN PASSWORD 'replace-with-strong-password';

-- connect privileges
GRANT CONNECT ON DATABASE postgres TO posthog_ro;
GRANT USAGE ON SCHEMA public TO posthog_ro;

-- existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO posthog_ro;

-- future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO posthog_ro;
```

Then use `posthog_ro` in the wizard.

## 4) Recommended table sync plan

Start with these tables for product/revenue funnel analytics:

- `users` -> `incremental` on `updated_at`
- `businesses` -> `incremental` on `updated_at`
- `business_users` -> `incremental` on `updated_at`
- `clients` -> `incremental` on `updated_at`
- `visits` -> `incremental` on `updated_at`
- `notes` -> `incremental` on `updated_at`
- `billable_items` -> `incremental` on `updated_at`
- `contracts` -> `incremental` on `updated_at`
- `subscriptions` -> `incremental` on `updated_at`
- `invoices` -> `incremental` on `updated_at`
- `usage_analytics` -> `incremental` on `updated_at`
- `provider_engagement` -> `incremental` on `updated_at`

Leave large/noisy tables out at first (you can add later once costs are clear):

- `audit_logs`
- `transcript_segments`
- `diarization_turns`
- `audio_assets`

## 5) Prefix and naming

Use prefix: `postgres_prod`  
Your HogQL tables become `postgres_prod_users`, `postgres_prod_visits`, etc.

## 6) Validate first queries

After first sync starts, run these in PostHog SQL:

```sql
SELECT count(*) FROM postgres_prod_users;
SELECT count(*) FROM postgres_prod_visits;

SELECT date_trunc('day', created_at) AS day, count(*) AS signups
FROM postgres_prod_users
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;
```

## 7) Keep instrumentation and warehouse separate

Current app instrumentation already sends product events from web (`posthog-js`) and API-side analytics endpoints.
Warehouse sync is for relational business data (accounts, visits, invoices), not a replacement for event capture.

## 8) If you also add Stripe source later

This repo uses Apple IAP as primary billing path now. If Stripe is added later:

- Use a separate source prefix: `stripe_prod`
- Enable webhook sync where supported
- Keep `postgres_prod` and `stripe_prod` separate for clean joins

