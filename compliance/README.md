# PalmCare AI — HIPAA Compliance Program

**Status:** In Progress
**Last Updated:** February 22, 2026

---

## Quick Start — What To Do Right Now

### This Week (Free, ~2 hours total)

1. **Email OpenAI for BAA:** Send email to `baa@openai.com`
   - Subject: "BAA Request — PalmCare AI"
   - Body: "We are PalmCare AI (PalmTai LLC), a home care management SaaS platform. We use the OpenAI API (Whisper for transcription, GPT for contract generation) to process Protected Health Information on behalf of HIPAA-covered home care agencies. We request a Business Associate Agreement. We confirm we need zero-data-retention endpoints."

2. **Email Anthropic for BAA:** Contact via https://www.anthropic.com/contact-sales
   - Same description as above, mention Claude API usage for document analysis

3. **Add SSL to database:** Add `?sslmode=require` to your `DATABASE_URL` in Railway

4. **Sign these documents:** Print, sign, and date the approval pages in:
   - `02-PRIVACY-POLICY.md`
   - `03-SECURITY-POLICY.md`
   - `04-BREACH-NOTIFICATION-POLICY.md`

### Next 30 Days

5. **Contact Railway:** Email `solutions@railway.app` for enterprise BAA
6. **Switch email provider:** Replace Resend with Paubox or AWS SES (Resend has no BAA)
7. **Contact Twilio:** Request HIPAA Editions for voice recording BAA
8. **Remove PHI from logs:** See `07-TECHNICAL-SAFEGUARDS-AUDIT.md` for specific lines to fix

### Next 90 Days

9. Enable encryption at rest (database + storage)
10. Implement field-level encryption for voiceprints and tax IDs
11. Complete workforce HIPAA training
12. Enforce MFA for admin accounts
13. Establish audit log review schedule

---

## Document Index

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 01 | [Risk Assessment](01-RISK-ASSESSMENT.md) | Identifies and prioritizes security risks | Complete |
| 02 | [Privacy Policy](02-PRIVACY-POLICY.md) | PHI privacy practices and individual rights | Complete — needs signature |
| 03 | [Security Policy](03-SECURITY-POLICY.md) | Administrative, physical, technical safeguards | Complete — needs signature |
| 04 | [Breach Notification Policy](04-BREACH-NOTIFICATION-POLICY.md) | Incident response and breach reporting | Complete — needs signature |
| 05 | [BAA Template](05-BAA-TEMPLATE.md) | Template for client-facing BAA agreements | Complete — needs legal review |
| 06 | [Vendor BAA Tracker](06-VENDOR-BAA-TRACKER.md) | Tracks BAA status with all vendors | Complete — action items pending |
| 07 | [Technical Safeguards Audit](07-TECHNICAL-SAFEGUARDS-AUDIT.md) | Audit of implemented security controls | Complete — 72% score |
| 08 | [Workforce Training Plan](08-WORKFORCE-TRAINING-PLAN.md) | HIPAA training program for all staff | Complete — execution pending |

---

## Compliance Score

```
Overall HIPAA Readiness: ~65%

[████████████████░░░░░░░░░] 65%

✅ Completed:
  - Risk assessment documented
  - Privacy policy written
  - Security policy written
  - Breach notification procedures documented
  - BAA template created
  - Technical safeguards audited
  - JWT authentication with expiration
  - Role-based access control
  - Audit logging middleware
  - Password hashing (bcrypt)
  - Account lockout policy
  - MFA available
  - TLS in transit
  - Input validation
  - SQL injection prevention

⏳ In Progress:
  - Vendor BAA execution (OpenAI, Anthropic — just need to email)
  - Email provider migration (Resend → HIPAA-compliant)
  - Database SSL enforcement

❌ Not Started:
  - Encryption at rest (database + storage)
  - Field-level encryption (voiceprints, EIN)
  - Workforce training execution
  - MFA enforcement for admins
  - Data retention automation
  - Audit log review schedule
  - Annual penetration testing
```

---

## Cost Estimate

| Item | Cost | Timeline |
|------|------|----------|
| OpenAI BAA | Free | This week |
| Anthropic BAA | Free | This week |
| Railway enterprise BAA | ~$100-500/mo increase | 2 weeks |
| Twilio HIPAA Editions | ~$50-200/mo increase | 2 weeks |
| HIPAA email provider (Paubox) | Free - $49/mo | 2 weeks |
| Legal review of BAA template | $500-2,000 (one-time) | 30 days |
| **Total estimated increase** | **~$200-750/mo + one-time legal** | |

---

## Important Notes

- **There is no official HIPAA "certification"** — compliance is self-declared, backed by documentation and audits
- All documents in this directory must be **retained for 6 years**
- Risk assessment must be **reviewed annually** or when significant changes occur
- Store signed BAAs in `compliance/baas/` directory
- This program should be reviewed by a healthcare compliance attorney ($500-2,000 for review)

---

## File Structure

```
compliance/
├── README.md                          ← You are here
├── 01-RISK-ASSESSMENT.md              ← Security risk analysis
├── 02-PRIVACY-POLICY.md               ← Privacy Rule compliance
├── 03-SECURITY-POLICY.md              ← Security Rule compliance
├── 04-BREACH-NOTIFICATION-POLICY.md   ← Incident response plan
├── 05-BAA-TEMPLATE.md                 ← Client-facing BAA
├── 06-VENDOR-BAA-TRACKER.md           ← Vendor BAA status
├── 07-TECHNICAL-SAFEGUARDS-AUDIT.md   ← Technical controls audit
├── 08-WORKFORCE-TRAINING-PLAN.md      ← Training program
└── baas/                              ← Signed BAA storage
    └── (store signed PDFs here)
```
