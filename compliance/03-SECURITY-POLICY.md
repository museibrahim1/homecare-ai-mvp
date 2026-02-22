# PalmCare AI — HIPAA Security Policy

**Policy Number:** SP-001
**Effective Date:** February 22, 2026
**Last Reviewed:** February 22, 2026
**Next Review:** February 22, 2027
**Policy Owner:** Security Officer / CEO

---

## 1. Purpose

This policy establishes the administrative, physical, and technical safeguards required to protect the confidentiality, integrity, and availability of electronic Protected Health Information (ePHI) as required by the HIPAA Security Rule (45 CFR Part 164, Subpart C).

---

## 2. Administrative Safeguards

### 2.1 Security Management Process (§ 164.308(a)(1))

**Risk Analysis:** A comprehensive risk assessment is conducted annually and whenever significant changes occur (see 01-RISK-ASSESSMENT.md).

**Risk Management:** Identified risks are documented with mitigation plans, assigned owners, and target dates. The risk register is reviewed quarterly.

**Sanction Policy:** Workforce members who violate security policies are subject to progressive disciplinary action up to and including termination.

**Information System Activity Review:** Audit logs are reviewed monthly for suspicious activity. Automated alerts are configured for high-risk events.

### 2.2 Assigned Security Responsibility (§ 164.308(a)(2))

The CEO serves as interim Security Officer responsible for:
- Overseeing the security program
- Conducting risk assessments
- Managing incident response
- Ensuring workforce training compliance

### 2.3 Workforce Security (§ 164.308(a)(3))

**Authorization:** Access to ePHI is granted based on job function using role-based access control:

| Role | Access Level |
|------|-------------|
| Platform Admin (PalmCare AI) | System administration only; no routine PHI access |
| Agency Owner | Full access to their agency's data |
| Agency Admin | Full access to their agency's data |
| Agency Manager | Access to assigned teams and clients |
| Agency Staff | Access to assigned clients |
| Caregiver | Access to assigned client care information only |

**Termination:** Upon workforce member separation:
- System access revoked within 24 hours
- All devices returned and wiped
- Access review conducted to identify any residual access

### 2.4 Information Access Management (§ 164.308(a)(4))

- Access provisioning requires manager approval
- Access reviews conducted quarterly
- Privileged access (admin) requires MFA and is limited to named individuals

### 2.5 Security Awareness and Training (§ 164.308(a)(5))

All workforce members receive training on:
- Security reminders (quarterly email updates)
- Protection from malware (safe computing practices)
- Login monitoring (recognizing unauthorized access attempts)
- Password management (see Authentication section)

### 2.6 Security Incident Procedures (§ 164.308(a)(6))

See Breach Notification Policy (Document 04) for incident response procedures.

### 2.7 Contingency Plan (§ 164.308(a)(7))

**Data Backup:**
- PostgreSQL: Automated daily backups with point-in-time recovery
- Object Storage: Cross-region replication (when available)
- Application Code: Version controlled in Git with remote repository

**Disaster Recovery:**
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour
- Railway provides infrastructure redundancy
- Database can be restored from backups within RTO

**Emergency Mode Operations:**
- Read-only mode can be activated to preserve data during incidents
- Critical functions prioritized: authentication, data access, audit logging

**Testing:** Disaster recovery procedures tested annually.

### 2.8 Evaluation (§ 164.308(a)(8))

- Annual security evaluation against HIPAA requirements
- Evaluation triggered by environmental or operational changes
- Results documented and shared with leadership

---

## 3. Technical Safeguards

### 3.1 Access Control (§ 164.312(a))

**Unique User Identification:**
- Every user has a unique UUID and email address
- No shared accounts permitted
- Service accounts documented and reviewed quarterly

**Emergency Access Procedure:**
- In an emergency requiring immediate PHI access (e.g., system outage affecting patient safety), the CEO/Security Officer may authorize direct database access
- Authorization must be verbal or written and documented within 4 hours
- All emergency access is logged in the audit system with reason code "EMERGENCY"
- Emergency access events are reviewed within 24 hours by the Security Officer
- A post-incident report is filed documenting: who accessed what, why, duration, and whether the access was appropriate
- Emergency access credentials are rotated after each use

**Automatic Logoff:**
- JWT tokens expire after 1 hour
- Frontend session timeout after 15 minutes of inactivity
- Forced logout capability for compromised accounts

**Encryption and Decryption:**
- See Encryption section (3.4)

### 3.2 Audit Controls (§ 164.312(b))

**Implemented Audit Logging:**
- All API requests to PHI endpoints logged with: user ID, timestamp, action, resource ID, IP address
- HIPAA audit middleware captures: endpoint path, HTTP method, user identity, response status
- Audit logs stored in PostgreSQL `audit_logs` table
- Logs retained for 6 years

**Monitored Events:**
- Login attempts (successful and failed)
- PHI access (read, create, update, delete)
- Administrative actions (user provisioning, role changes)
- Data exports (contract downloads, report generation)
- Failed authorization attempts

**Audit Log Review Schedule:**
- **Monthly:** CEO/Security Officer reviews audit logs for anomalies — unusual access patterns, off-hours PHI access, bulk data exports, failed login spikes
- **Quarterly:** Comprehensive access review — verify all active users still require their access level, remove stale accounts
- **Annually:** Full audit log analysis as part of the annual security evaluation
- **On-demand:** Triggered by any suspected incident or breach
- Review findings are documented and retained for 6 years

### 3.3 Integrity Controls (§ 164.312(c))

**Data Validation:**
- Input validation on all API endpoints using Pydantic schemas
- Type checking and range validation for all PHI fields
- SQL injection prevention via SQLAlchemy ORM parameterized queries

**Transmission Integrity:**
- TLS 1.2+ for all HTTPS connections
- API response integrity via HTTP headers

### 3.4 Encryption (§ 164.312(e))

**In Transit:**
- All web traffic: TLS 1.2+ (enforced by Railway)
- API-to-database: SSL/TLS (to be enforced via connection string)
- External API calls: HTTPS (OpenAI, Anthropic, Twilio, Stripe)
- Email: TLS (provider-dependent)

**At Rest (Target State):**
- Database: Disk-level encryption (Railway managed)
- Object Storage: SSE-S3 or SSE-KMS encryption
- Backups: Encrypted using provider-managed keys
- Sensitive fields (voiceprints, tax IDs): AES-256 field-level encryption

### 3.5 Authentication (§ 164.312(d))

**Password Requirements:**
- Minimum 8 characters
- Must include: uppercase, lowercase, and numeric characters
- Passwords hashed with bcrypt (cost factor 12)
- Password history: Previous 5 passwords cannot be reused (to implement)

**Multi-Factor Authentication:**
- Available for all users
- Required for administrative accounts (to enforce)
- TOTP-based (Google Authenticator, Authy compatible)

**Account Lockout:**
- 5 consecutive failed login attempts triggers 15-minute lockout
- Lockout events logged and monitored

---

## 4. Physical Safeguards

### 4.1 Facility Access Controls (§ 164.310(a))

PalmCare AI operates as a cloud-only SaaS platform. Physical safeguards are delegated to infrastructure providers:

- **Railway:** SOC 2 Type II certified data centers
- **AWS S3 (if used):** SOC 2, ISO 27001, HIPAA eligible

### 4.2 Workstation Use and Security (§ 164.310(b-c))

**Policy for Remote Workers:**
- Company devices must use full-disk encryption (FileVault/BitLocker)
- Screen lock required after 5 minutes of inactivity
- PHI must not be stored on local devices
- Work only on secured networks (no public Wi-Fi without VPN)
- Anti-malware software required and kept updated

### 4.3 Device and Media Controls (§ 164.310(d))

**Disposal:** Devices containing ePHI must be wiped using NIST 800-88 guidelines before disposal.

**Media Reuse:** All data securely erased before device reassignment.

**Accountability:** Hardware inventory maintained with assigned users.

---

## 5. Network Security

### 5.1 Firewall and Network Segmentation
- Railway provides network isolation between services
- Database accessible only via internal network (not publicly exposed)
- API endpoints protected by authentication middleware

### 5.2 Intrusion Detection
- Application-level monitoring via Railway metrics
- Anomalous traffic patterns flagged for review
- Rate limiting on authentication endpoints

---

## 6. Vulnerability Management

### 6.1 Patch Management
- Operating system patches: Applied via container rebuild (weekly)
- Application dependencies: Reviewed monthly; critical patches within 48 hours
- Infrastructure: Managed by Railway

### 6.2 Vulnerability Scanning
- Dependency vulnerability scanning via GitHub Dependabot
- Annual penetration testing (to implement)
- OWASP Top 10 review annually

---

## 7. Policy Exceptions

Any exception to this policy requires:
1. Written justification
2. Risk assessment of the exception
3. Compensating controls documented
4. Approval by Security Officer
5. Time-limited duration with review date

---

**Approved By:** _________________________ Date: ______________

**Title:** Security Officer / CEO
