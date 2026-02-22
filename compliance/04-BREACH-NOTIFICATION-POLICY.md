# PalmCare AI — Breach Notification Policy & Incident Response Plan

**Policy Number:** BN-001
**Effective Date:** February 22, 2026
**Last Reviewed:** February 22, 2026
**Next Review:** February 22, 2027
**Policy Owner:** Security Officer / CEO

---

## 1. Purpose

This policy establishes procedures for identifying, responding to, and reporting breaches of unsecured Protected Health Information (PHI) as required by the HIPAA Breach Notification Rule (45 CFR §§ 164.400-414).

---

## 2. Definitions

- **Breach:** The acquisition, access, use, or disclosure of PHI in a manner not permitted by the Privacy Rule that compromises the security or privacy of the PHI.
- **Unsecured PHI:** PHI that is not rendered unusable, unreadable, or indecipherable to unauthorized persons through encryption or destruction.
- **Security Incident:** The attempted or successful unauthorized access, use, disclosure, modification, or destruction of information or interference with system operations.

### 2.1 Breach Exclusions
A breach does NOT include:
- Unintentional access by an authorized workforce member acting in good faith, with no further disclosure
- Inadvertent disclosure between authorized persons at the same organization
- Disclosures where the recipient could not reasonably retain the information

---

## 3. Incident Response Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| Security Officer (CEO) | Leads response, makes notification decisions | [CEO Email] |
| Technical Lead | Investigates technical aspects, contains breach | [CTO/Dev Lead Email] |
| Privacy Officer | Assesses PHI impact, manages notifications | [Privacy Officer Email] |
| Legal Counsel | Advises on regulatory obligations | [Legal Contact] |

---

## 4. Incident Response Procedure

### Phase 1: Detection and Reporting (0-4 hours)

**Any workforce member** who suspects a security incident must:
1. Immediately report to the Security Officer via email or phone
2. Document: what happened, when, what data may be affected, who was involved
3. Do NOT attempt to investigate or remediate independently
4. Preserve all evidence (do not delete logs, emails, or files)

**Automated Detection:**
- Failed login alerts (5+ consecutive failures)
- Unusual data export volumes
- API access from unexpected IP addresses
- Off-hours PHI access patterns

### Phase 2: Investigation and Containment (4-48 hours)

The Security Officer will:

1. **Contain the incident:**
   - Revoke compromised credentials immediately
   - Isolate affected systems if necessary
   - Block suspicious IP addresses
   - Force logout all sessions if account compromise suspected

2. **Investigate:**
   - Review audit logs for scope of access
   - Identify what PHI was accessed/disclosed
   - Determine the number of individuals affected
   - Identify the cause (technical failure, human error, malicious act)

3. **Document:**
   - Complete the Incident Report Form (Section 8)
   - Preserve all evidence and logs
   - Record timeline of events and response actions

### Phase 3: Breach Assessment (48-72 hours)

Conduct the four-factor breach risk assessment per 45 CFR § 164.402:

| Factor | Assessment Question |
|--------|-------------------|
| **1. Nature and extent of PHI** | What types of PHI were involved? (names, SSN, diagnoses, etc.) |
| **2. Unauthorized person** | Who accessed the PHI? Was it an employee, external attacker, business associate? |
| **3. Was PHI actually viewed?** | Was the PHI actually acquired or viewed, or was it just exposed? |
| **4. Mitigation** | What steps were taken to mitigate harm? Was the PHI recovered? |

**Determination:** If the risk assessment shows a low probability that PHI was compromised, it is NOT a reportable breach. Document the assessment and rationale. If the assessment indicates more than a low probability of compromise, proceed to notification.

### Phase 4: Notification (within 60 days of discovery)

**As a Business Associate, PalmCare AI must:**

1. **Notify the Covered Entity (the agency)** without unreasonable delay and no later than 60 days after discovering the breach
   - Identify the individuals affected
   - Describe the nature of the breach
   - Describe the PHI involved
   - Describe what PalmCare AI is doing to mitigate harm
   - Describe what PalmCare AI is doing to prevent future breaches

2. **The Covered Entity is responsible for:**
   - Notifying affected individuals within 60 days
   - Notifying HHS (immediately if 500+ individuals; annually if fewer)
   - Notifying media (if 500+ individuals in a state/jurisdiction)

### Phase 5: Remediation (ongoing)

1. Implement corrective actions to prevent recurrence
2. Update risk assessment with new findings
3. Update security policies and procedures as needed
4. Conduct additional training if human error was involved
5. Document all remediation steps and completion dates

---

## 5. Breach Notification Content

Notifications to Covered Entities must include:

1. Date of the breach and date of discovery
2. Description of what happened
3. Types of PHI involved (e.g., names, DOBs, diagnoses, insurance IDs)
4. Number of individuals affected
5. Steps PalmCare AI has taken to investigate and mitigate
6. Steps PalmCare AI recommends the Covered Entity take
7. Contact information for questions

---

## 6. Breach Log

All security incidents and breaches are recorded in the Breach Log with:
- Incident ID and date
- Description of incident
- PHI involved
- Number of individuals affected
- Breach determination (yes/no with rationale)
- Notification dates and recipients
- Corrective actions taken
- Resolution date

The Breach Log is maintained for 6 years and reviewed quarterly.

---

## 7. Scenarios and Response Playbooks

### Scenario A: Compromised User Credentials
1. Force logout and disable account immediately
2. Reset password and require MFA enrollment
3. Review audit logs for all activity during compromise window
4. Notify affected agency if PHI was accessed
5. Assess scope using breach risk assessment

### Scenario B: Unauthorized API Access
1. Revoke API keys/tokens immediately
2. Block source IP addresses
3. Review all API calls from the unauthorized source
4. Assess data accessed/exfiltrated
5. Rotate all potentially compromised secrets

### Scenario C: Employee Snooping (Unauthorized Internal Access)
1. Suspend employee access immediately
2. Review audit logs for all PHI accessed
3. Interview employee and document findings
4. Apply sanctions per policy
5. Notify affected agencies if breach confirmed

### Scenario D: Vendor Data Breach (OpenAI, Anthropic, etc.)
1. Contact vendor for breach details and scope
2. Determine if PalmCare AI data was affected
3. Review what PHI was transmitted to the vendor
4. Notify affected agencies
5. Assess whether to continue using the vendor

### Scenario E: Ransomware/System Compromise
1. Isolate affected systems immediately
2. Activate disaster recovery procedures
3. Do NOT pay ransom (consult law enforcement)
4. Restore from clean backups
5. Conduct full forensic investigation
6. Notify all affected agencies

---

## 8. Incident Report Form

```
INCIDENT REPORT — CONFIDENTIAL

Date of Incident: _______________
Date Discovered: _______________
Reported By: _______________
Report Date: _______________

DESCRIPTION:
_________________________________________
_________________________________________

SYSTEMS AFFECTED:
[ ] Database    [ ] Object Storage    [ ] API Server
[ ] Web App     [ ] Email System      [ ] Third-party Service
Other: _______________

PHI TYPES INVOLVED:
[ ] Names           [ ] Dates of Birth    [ ] Addresses
[ ] Phone Numbers   [ ] Email Addresses   [ ] SSN/Tax ID
[ ] Medical Records [ ] Insurance Info     [ ] Voice Recordings
[ ] Transcripts     [ ] Contracts         [ ] Billing Data
[ ] Voiceprints     [ ] Other: _______________

ESTIMATED INDIVIDUALS AFFECTED: _______________

CAUSE:
[ ] External attack     [ ] Employee error
[ ] System malfunction  [ ] Vendor breach
[ ] Lost/stolen device  [ ] Unauthorized access
[ ] Other: _______________

CONTAINMENT ACTIONS TAKEN:
_________________________________________

BREACH RISK ASSESSMENT:
Factor 1 (Nature of PHI): _______________
Factor 2 (Unauthorized person): _______________
Factor 3 (PHI actually viewed?): _______________
Factor 4 (Mitigation): _______________

DETERMINATION:
[ ] Breach - notification required
[ ] Not a breach - documented rationale: _______________

NOTIFICATIONS SENT:
Covered Entity notified: [ ] Yes  Date: _______________
                         [ ] No   Reason: _______________

CORRECTIVE ACTIONS:
_________________________________________

Completed By: _______________  Date: _______________
Reviewed By: _______________   Date: _______________
```

---

## 9. Testing

This incident response plan is tested annually through:
- Tabletop exercises simulating breach scenarios
- Technical testing of containment procedures (account lockout, forced logout)
- Review and update of contact information
- Documentation of test results and improvements

---

**Approved By:** _________________________ Date: ______________

**Title:** Security Officer / CEO
