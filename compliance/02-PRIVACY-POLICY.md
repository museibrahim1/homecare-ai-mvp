# PalmCare AI — HIPAA Privacy Policy

**Policy Number:** PP-001
**Effective Date:** February 22, 2026
**Last Reviewed:** February 22, 2026
**Next Review:** February 22, 2027
**Policy Owner:** Privacy Officer / CEO

---

## 1. Purpose

This policy establishes the requirements for protecting the privacy of Protected Health Information (PHI) in compliance with the HIPAA Privacy Rule (45 CFR Part 160 and Part 164, Subparts A and E).

PalmCare AI (PalmTai Inc., a C Corporation incorporated in Nebraska) operates as a **Business Associate** under HIPAA, processing PHI on behalf of Covered Entities (home care agencies) that use our platform.

---

## 2. Scope

This policy applies to:
- All PalmCare AI employees, contractors, and agents
- All systems that create, receive, maintain, or transmit PHI
- All forms of PHI: electronic, paper, and oral

---

## 3. Definitions

- **PHI (Protected Health Information):** Individually identifiable health information transmitted or maintained in any form, including client names, addresses, dates of birth, medical conditions, care plans, voice recordings, and billing data.
- **ePHI (Electronic PHI):** PHI in electronic form.
- **Covered Entity:** Home care agencies and healthcare providers that use PalmCare AI.
- **Business Associate:** PalmCare AI and any subcontractors that access PHI.
- **Minimum Necessary:** The principle that access to PHI should be limited to the minimum amount needed to accomplish the intended purpose.

---

## 4. Uses and Disclosures of PHI

### 4.1 Permitted Uses
PalmCare AI may use or disclose PHI only for:
- **Treatment:** Processing care assessments, generating care plans and visit notes
- **Payment:** Generating billable items, creating service contracts
- **Health Care Operations:** Quality improvement, training AI models (only with de-identified data), analytics and reporting
- **As required by the Business Associate Agreement** with the Covered Entity
- **As required by law**

### 4.2 Prohibited Uses
PalmCare AI will NOT:
- Use PHI for marketing purposes
- Sell PHI under any circumstances
- Use PHI for purposes not specified in the Business Associate Agreement
- Disclose PHI to unauthorized third parties
- Use real PHI for product demos or sales presentations (only synthetic/de-identified data)

### 4.3 Minimum Necessary Standard
- Access to PHI is restricted based on job role and function
- Role-based access controls enforce minimum necessary access:
  - **Caregivers:** Access only to their assigned clients' care information
  - **Agency Staff:** Access to clients within their agency
  - **Agency Admins:** Full access to their agency's data
  - **PalmCare AI Engineers:** No routine access to production PHI; access only for authorized support with audit logging

---

## 5. Individual Rights

PalmCare AI supports Covered Entities in fulfilling individual rights by providing:

### 5.1 Right of Access
- Clients can request access to their PHI through their home care agency
- PalmCare AI will provide data exports within 30 days of a verified request from the Covered Entity

### 5.2 Right to Amend
- Amendment requests are processed through the Covered Entity
- PalmCare AI will update records within 60 days of receiving a verified amendment request

### 5.3 Right to an Accounting of Disclosures
- PalmCare AI maintains audit logs of all PHI disclosures
- Audit logs are retained for 6 years
- Accounting reports can be generated upon request from the Covered Entity

### 5.4 Right to Request Restrictions
- Requests for restrictions on PHI use are forwarded to the Covered Entity for determination

### 5.5 Right to Confidential Communications
- PalmCare AI supports communication preferences as configured by the Covered Entity

---

## 6. Business Associate Obligations

### 6.1 Subcontractor Management
PalmCare AI will:
- Execute BAAs with all subcontractors that access PHI
- Maintain a current list of all subcontractors with PHI access
- Verify subcontractor compliance annually

### 6.2 Current Subcontractors Requiring BAAs

| Subcontractor | Service | PHI Access | BAA Status |
|---------------|---------|------------|------------|
| Railway | Cloud hosting | All ePHI | Pending |
| OpenAI | Voice transcription, AI processing | Voice recordings, transcripts | Pending |
| Anthropic | AI processing, document analysis | Transcripts, document content | Pending |
| Twilio | Voice calls | Phone numbers, voice recordings | Pending |
| Email Provider | Transactional email | Client names, contract content | Must switch to HIPAA-compliant provider |

### 6.3 Breach Notification
- PalmCare AI will report any breach of unsecured PHI to the Covered Entity within 60 days of discovery
- See Breach Notification Policy (Document 04) for detailed procedures

---

## 7. De-identification

When PHI must be used for analytics, product development, or demonstrations:
- All 18 HIPAA identifiers must be removed per the Safe Harbor method (45 CFR § 164.514(b))
- De-identified data sets must be reviewed and approved before use
- Re-identification codes, if used, are stored separately with restricted access

---

## 8. Data Retention and Disposal

### 8.1 Retention Schedule
| Data Type | Retention Period | Justification |
|-----------|-----------------|---------------|
| Client records | Duration of BAA + 6 years | HIPAA requirement |
| Voice recordings | 3 years after visit | Clinical documentation |
| Transcripts | 3 years after visit | Clinical documentation |
| Contracts | Duration of contract + 6 years | Legal/regulatory |
| Audit logs | 6 years | HIPAA requirement |
| Billing records | 6 years | Legal/regulatory |

### 8.2 Disposal Procedures
- Electronic PHI: Secure deletion using cryptographic erasure or multi-pass overwrite
- Database records: Permanent deletion with verification
- Storage objects: Deletion from all replicas and backups within 90 days
- Paper PHI: Cross-cut shredding (not applicable for cloud-only operations)

---

## 9. Workforce Training

### 9.1 Requirements
- All workforce members receive HIPAA privacy training within 30 days of hire
- Annual refresher training required for all workforce members
- Training records maintained for 6 years

### 9.2 Training Topics
- What constitutes PHI
- Permitted and prohibited uses/disclosures
- Minimum necessary standard
- Individual rights
- Reporting suspected violations
- Sanctions for violations

---

## 10. Sanctions

Violations of this policy may result in:
- Verbal warning (first minor offense)
- Written warning with mandatory retraining
- Suspension of system access
- Termination of employment/contract
- Reporting to HHS Office for Civil Rights if required by law

---

## 11. Complaints

Complaints regarding privacy practices should be directed to:
- **Privacy Officer:** support@palmcareai.com
- Complaints can also be filed with the HHS Office for Civil Rights
- No retaliation will be taken against any individual for filing a complaint

---

## 12. Policy Review

This policy is reviewed annually and updated as needed when:
- Regulatory changes occur
- Significant system changes are made
- A breach or incident occurs
- Business operations change materially

---

**Approved By:** _________________________ Date: ______________

**Title:** Privacy Officer / CEO
