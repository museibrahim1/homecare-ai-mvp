# PalmCare AI — HIPAA Security Risk Assessment

**Organization:** PalmCare AI (PalmTai LLC)
**Assessment Date:** February 22, 2026
**Conducted By:** PalmCare AI Security Team
**Review Cycle:** Annual (next review: February 2027)
**Document Retention:** 6 years per 45 CFR § 164.530(j)

---

## 1. Purpose

This Risk Assessment identifies and evaluates risks and vulnerabilities to the confidentiality, integrity, and availability of electronic Protected Health Information (ePHI) created, received, maintained, or transmitted by PalmCare AI, as required under the HIPAA Security Rule (45 CFR § 164.308(a)(1)(ii)(A)).

---

## 2. Scope

### 2.1 Systems in Scope

| System | Description | PHI Type |
|--------|-------------|----------|
| PostgreSQL Database | Primary data store for all structured PHI | Client demographics, medical conditions, medications, insurance, care plans |
| S3-Compatible Storage | Object storage for files | Voice recordings, contract documents, visit notes |
| FastAPI Application | Backend API server | Processes and transmits all PHI |
| Next.js Web Application | Frontend application | Displays PHI to authorized users |
| Celery Workers | Background task processors | Process voice recordings, generate contracts/notes |

### 2.2 External Services in Scope

| Service | PHI Transmitted | BAA Status |
|---------|----------------|------------|
| OpenAI (Whisper + GPT) | Voice recordings, transcript text | Available — action required |
| Anthropic (Claude) | Transcript text, document content | Available — action required |
| Railway (Hosting) | All PHI (hosts application) | Available for enterprise — action required |
| Twilio (Voice) | Phone numbers, voice recordings | Available — action required |
| Resend (Email) | Client names, contracts, notes in email | **NOT AVAILABLE — must remediate** |
| Pyannote.ai (Diarization) | Voice recordings, voiceprints | Unknown — must investigate |
| Stirling-PDF (OCR) | Contract templates | Self-hosted — no BAA needed |
| Stripe (Payments) | Business email, subscription data | Not required (no PHI) |

### 2.3 PHI Data Categories

- **Demographic:** Name, DOB, gender, address, phone, email
- **Medical:** Diagnoses, allergies, medications, physician info, care plans, cognitive/mobility status
- **Insurance:** Provider name, insurance ID, Medicaid/Medicare ID
- **Clinical:** Voice recordings of care assessments, transcripts, visit notes, ADL logs
- **Financial:** Billable items, service rates, contract terms
- **Biometric:** Voiceprint data for speaker identification

---

## 3. Risk Identification and Analysis

### RISK-001: Lack of Encryption at Rest for Database
- **Threat:** Unauthorized access to database files on disk
- **Vulnerability:** PostgreSQL data files are not encrypted at rest
- **PHI Impact:** All structured client data (demographics, medical, insurance)
- **Likelihood:** Low (requires physical/OS-level access)
- **Impact:** Critical (exposes all client records)
- **Risk Level:** HIGH
- **Mitigation:** Enable disk-level encryption on Railway PostgreSQL or migrate to provider with transparent data encryption
- **Status:** OPEN
- **Target Date:** March 31, 2026

### RISK-002: Lack of Encryption at Rest for Object Storage
- **Threat:** Unauthorized access to stored voice recordings and documents
- **Vulnerability:** S3 bucket encryption not explicitly configured
- **PHI Impact:** Voice recordings, contracts, visit notes
- **Likelihood:** Low
- **Impact:** Critical (voice recordings contain raw PHI)
- **Risk Level:** HIGH
- **Mitigation:** Enable SSE-S3 or SSE-KMS encryption on storage bucket
- **Status:** OPEN
- **Target Date:** March 31, 2026

### RISK-003: PHI Exposure in Application Logs
- **Threat:** PHI leakage through log files accessible to operations staff
- **Vulnerability:** Client names, email addresses, and phone numbers appear in application logs
- **PHI Impact:** Names, emails, phone numbers
- **Likelihood:** Medium (logs are regularly accessed for debugging)
- **Impact:** Medium (limited PHI exposed)
- **Risk Level:** MEDIUM
- **Mitigation:** Implement log sanitization to redact PHI before writing to logs
- **Status:** OPEN
- **Target Date:** April 30, 2026

### RISK-004: No BAA with Email Service Provider (Resend)
- **Threat:** Email provider processes PHI without HIPAA obligations
- **Vulnerability:** Resend does not offer a BAA; contracts and notes are emailed via Resend
- **PHI Impact:** Client names, addresses, care services, contract details sent via email
- **Likelihood:** High (emails sent regularly)
- **Impact:** High (regulatory non-compliance)
- **Risk Level:** CRITICAL
- **Mitigation:** Either (a) switch to HIPAA-compliant email provider (Paubox, AWS SES with BAA) or (b) remove PHI from email content and use secure download links instead
- **Status:** OPEN
- **Target Date:** March 15, 2026

### RISK-005: No BAAs Executed with AI Providers
- **Threat:** AI providers process PHI without HIPAA obligations
- **Vulnerability:** Voice recordings and transcripts sent to OpenAI and Anthropic without signed BAAs
- **PHI Impact:** Complete voice recordings, full transcript text with medical information
- **Likelihood:** High (core application functionality)
- **Impact:** Critical (raw medical conversations)
- **Risk Level:** CRITICAL
- **Mitigation:** Execute BAAs with OpenAI (baa@openai.com) and Anthropic (sales contact). Verify zero-data-retention is enabled.
- **Status:** OPEN
- **Target Date:** March 15, 2026

### RISK-006: No BAA with Hosting Provider (Railway)
- **Threat:** Hosting provider staff could access PHI without HIPAA obligations
- **Vulnerability:** Railway hosts all application infrastructure containing PHI
- **PHI Impact:** All PHI categories
- **Likelihood:** Low (Railway has SOC 2 Type II)
- **Impact:** Critical
- **Risk Level:** HIGH
- **Mitigation:** Contact Railway (solutions@railway.app) for enterprise BAA, or migrate to AWS/GCP with BAA
- **Status:** OPEN
- **Target Date:** March 31, 2026

### RISK-007: Insufficient Database Connection Security
- **Threat:** Database traffic intercepted in transit
- **Vulnerability:** SSL/TLS not explicitly enforced on PostgreSQL connections
- **PHI Impact:** All structured PHI
- **Likelihood:** Low (internal network)
- **Impact:** Critical
- **Risk Level:** MEDIUM
- **Mitigation:** Add `?sslmode=require` to DATABASE_URL connection string
- **Status:** OPEN
- **Target Date:** March 15, 2026

### RISK-008: EIN Field Not Actually Encrypted
- **Threat:** Sensitive business tax ID exposed in database
- **Vulnerability:** Code comments indicate encryption but no implementation exists
- **PHI Impact:** Business tax identification numbers
- **Likelihood:** Low
- **Impact:** Medium
- **Risk Level:** MEDIUM
- **Mitigation:** Implement field-level encryption using Fernet or AES for sensitive identifiers
- **Status:** OPEN
- **Target Date:** April 30, 2026

### RISK-009: No Automatic Session Timeout on Frontend
- **Threat:** Unauthorized access via unattended browser session
- **Vulnerability:** While JWT tokens expire in 1 hour, no client-side inactivity timeout forces re-authentication
- **PHI Impact:** All PHI visible in the application
- **Likelihood:** Medium (shared workstations in care settings)
- **Impact:** Medium
- **Risk Level:** MEDIUM
- **Mitigation:** Implement 15-minute inactivity timeout on frontend with session warning
- **Status:** PARTIALLY MITIGATED (session warning exists, needs verification)
- **Target Date:** April 30, 2026

### RISK-010: No Data Retention/Disposal Policy
- **Threat:** PHI retained longer than necessary
- **Vulnerability:** No automated data retention schedule or secure disposal process
- **PHI Impact:** All PHI categories
- **Likelihood:** High (data accumulates indefinitely)
- **Impact:** Medium (increases breach exposure window)
- **Risk Level:** MEDIUM
- **Mitigation:** Define and implement data retention schedule; implement secure deletion procedures
- **Status:** OPEN
- **Target Date:** May 31, 2026

### RISK-011: Voiceprint Biometric Data Storage
- **Threat:** Biometric data theft/misuse
- **Vulnerability:** Voiceprint data stored as base64 in database without additional encryption
- **PHI Impact:** Biometric identifiers (voiceprints)
- **Likelihood:** Low
- **Impact:** High (biometric data cannot be changed if compromised)
- **Risk Level:** HIGH
- **Mitigation:** Implement field-level encryption for voiceprint data; add access controls
- **Status:** OPEN
- **Target Date:** April 30, 2026

---

## 4. Existing Security Controls

### 4.1 Administrative Safeguards
| Control | Status | Notes |
|---------|--------|-------|
| Security Officer Designated | Partial | CEO acting as interim security officer |
| Workforce Training | Not Started | Training program needed |
| Access Authorization | Implemented | Role-based access (admin, manager, staff, caregiver) |
| Security Incident Procedures | Not Documented | Procedures needed |
| Contingency Plan | Not Documented | Backup/disaster recovery plan needed |

### 4.2 Technical Safeguards
| Control | Status | Notes |
|---------|--------|-------|
| Access Control (Unique IDs) | Implemented | JWT-based auth with unique user IDs |
| Audit Controls | Implemented | Audit logging middleware records PHI access |
| Integrity Controls | Partial | Data validation on input; no integrity checksums |
| Transmission Security (TLS) | Implemented | HTTPS via Railway; TLS for external APIs |
| Encryption at Rest | NOT Implemented | Database and storage not encrypted |
| Authentication | Implemented | Bcrypt password hashing, MFA available |
| Account Lockout | Implemented | 5 failed attempts, 15-minute lockout |
| Password Policy | Implemented | Min 8 chars, complexity requirements |
| Session Management | Implemented | 1-hour JWT expiration, forced logout capability |

### 4.3 Physical Safeguards
| Control | Status | Notes |
|---------|--------|-------|
| Facility Access | N/A | Cloud-hosted (Railway data centers) |
| Workstation Security | Not Documented | Policy needed |
| Device and Media Controls | Not Documented | Policy needed |

---

## 5. Risk Summary Matrix

| Risk ID | Description | Level | Status |
|---------|-------------|-------|--------|
| RISK-004 | No BAA with email provider | CRITICAL | Open |
| RISK-005 | No BAAs with AI providers | CRITICAL | Open |
| RISK-001 | No database encryption at rest | HIGH | Open |
| RISK-002 | No storage encryption at rest | HIGH | Open |
| RISK-006 | No BAA with hosting provider | HIGH | Open |
| RISK-011 | Voiceprint data unencrypted | HIGH | Open |
| RISK-003 | PHI in application logs | MEDIUM | Open |
| RISK-007 | DB connection SSL not enforced | MEDIUM | Open |
| RISK-008 | EIN not encrypted | MEDIUM | Open |
| RISK-009 | Frontend session timeout | MEDIUM | Partial |
| RISK-010 | No data retention policy | MEDIUM | Open |

---

## 6. Remediation Priority

### Immediate (within 30 days)
1. Execute BAAs with OpenAI and Anthropic (free, just email them)
2. Switch email provider from Resend to HIPAA-compliant alternative OR remove PHI from emails
3. Contact Railway for enterprise BAA
4. Add `sslmode=require` to database connection

### Short-term (30-90 days)
5. Enable encryption at rest for database and object storage
6. Implement log sanitization
7. Encrypt voiceprint data at field level
8. Document all security policies (see Policy documents)

### Medium-term (90-180 days)
9. Implement data retention schedule
10. Complete workforce HIPAA training
11. Conduct penetration testing
12. Implement field-level encryption for insurance IDs

---

## 7. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Officer | _________________ | __________ | _________ |
| CEO | _________________ | __________ | _________ |

*This risk assessment will be reviewed and updated annually or when significant changes occur to the information system or operating environment.*
