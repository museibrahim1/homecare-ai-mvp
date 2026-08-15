# Product roadmap: Trust loop (offline → edit → queue → send)

Owner: Muse / PalmCare iOS  
Updated: 2026-08-15  
Sources: founder brief + codebase audit of AssessmentSession / VisitDetail / Home / EmailContractSheet

## Goal

Caregivers trust Palm in real homes. Weak wifi, mid-visit failures, and approve-only docs must not kill the relationship. After week one they live in a work queue, not a client directory.

## Capability today

| Area | Status | Gap |
|------|--------|-----|
| Offline / bad-signal recording | Partial | Local WAV + crash recovery exist. Upload failure **deletes** audio. No retry queue. |
| Edit before approve | Missing | Billables approve/deny only. Notes and contract read-only. |
| Processing errors | Partial | Step chips exist. Restart is destructive. No per-doc retry. No "2 of 4 ready". |
| First-run wow | Missing | Auth → MainTab. No Eleanor packet before paywall. |
| Home / Queue | Partial | Recent visits + stats. No actionable buckets. |
| Send status | Partial | Email sends. Delivery webhooks only for CRM, not agreements. No signed tracking. |
| Visual consistency | Partial | Dark Record orb vs light visit tabs. Multiple chip styles. |

## Build order (ship in this sequence)

### P0 — Offline upload queue + reassurance ✅ shipped 2026-08-15
**Why first:** Trust dies if the visit recording vanishes after a failed upload.
**Done when:** Failed upload keeps the WAV, shows "We still have your audio", Retry works, queue drains on reconnect, PHI purge still runs at 48h for abandoned items.
**Shipped:** `PendingUploadStore`, AssessmentSession keeps audio on failure, Record banner + alert, auto-retry on reconnect / foreground.

### P1 — Processing: X of 4 + per-doc retry ✅ shipped 2026-08-15
**Why:** Agencies need "retry notes" without restarting the visit. Backend `pipeline_state` already supports per-step patch.
**Done when:** Overview shows ready count; failed step has Retry; `/restart` is not the only recovery.
**Shipped:** `retryPipelineStep` API client, Overview retry rows, tab empty states with per-doc retry, stuck-after-5-min detection.

### P2 — Home work queue ✅ shipped 2026-08-15 (signature status soft)
**Why:** Daily tool after week one.
**Done when:** Home lists Needs review / Failed upload / Processing / Awaiting signature (when send status exists) / Follow up.
**Shipped:** Home "Your Queue" buckets. "Ready to send" stands in for awaiting signature until P4.

### P3 — Edit before approve ✅ shipped 2026-08-15 (billables + notes)
**Why:** Caregivers will bounce if they cannot tweak a line.
**Done when:** Billable minutes/description editable; note sections editable; contract text editable with save before send.
**Shipped:** Billables Edit + Save; Notes SOAP + narrative Edit. Contract inline edit still open.

### P4 — Send confirmation + status ✅ shipped 2026-08-15
**Why:** Without delivered/opened/signed, people email from their phone.
**Done when:** Visit stores send events; queue shows status; bounce surfaces a retry.
**Shipped:** `visits.agreement_send` JSONB; persist on Gmail send; Overview Mark signed / Mark bounced / Resend; Home queue Awaiting signature + Bounced. Auto delivered/opened needs Resend routing later (Gmail has no delivery webhooks).

### P5 — First-run wow before paywall ✅ shipped 2026-08-15
**Why:** Build-playbook §3.5. Eleanor packet in sandbox, then plan.
**Done when:** New user sees one completed packet before subscription pressure.
**Shipped:** Bundled Eleanor sample packet full-screen on first launch, then soft Paywall sheet.

### P6 — Visual consistency (Pipeline Glass) ✅ shipped 2026-08-15
**Why:** Two apps feeling = lower trust.
**Done when:** Shared PalmChip / tabs / cards; Record stays intentional dark hero while idle; visit/contract chips match.
**Shipped:** `PalmGlassSurface` mint wash + frost cards; floating glass tab bar with orb center; Home / Clients / Record idle / Settings / Workspace / Client detail restyled to Paper App Glass. Recording stage stays dark.

## Non-goals (this cycle)
- Full DocuSign replacement in P4 (can start with Resend delivery/open/bounce).
- Thin programmatic SEO or marketing work in this track.
- Rewriting the entire design system before P0–P3 land.

## Success metrics
- Upload failure → recovery rate (retry succeeds without re-record)
- % visits with at least one doc edit before send
- Time to first "wow" for new trial users
- Daily active use of Home queue vs Clients tab
