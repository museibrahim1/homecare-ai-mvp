# Homecare AI - Feature Explanations

Use these explanations alongside screenshots in your pitch deck.

---

## 1. Login & Authentication

**Screenshot:** `01-login.png`

### What It Shows:
Clean, professional login interface with the Homecare AI branding.

### Key Points to Mention:
- **Multi-tenant architecture** — Each agency gets isolated data
- **Demo mode** — One-click access for investors/prospects
- **Agency registration** — Self-service onboarding
- **JWT-based auth** — Industry-standard security

### Talking Points:
> "Every agency gets their own secure environment. Users can log in, or try the demo with one click. New agencies can register themselves — no sales call required."

---

## 2. Assessments Dashboard

**Screenshot:** `02-assessments.png`

### What It Shows:
The main work queue showing all care assessments with status tracking.

### Key Metrics Displayed:
- **Total Visits** — All assessments in the system
- **Pending Review** — Assessments awaiting coordinator approval
- **Approved** — Completed and signed off
- **Today** — Assessments scheduled/completed today

### Key Features:
- **Status badges** — Color-coded review status
- **Date/time** — When assessment was created
- **Assigned to** — Which coordinator owns it
- **Search & filter** — Find assessments quickly

### Talking Points:
> "This is the command center. Coordinators see exactly what needs attention. Orange means pending review — those assessments have gone through our AI pipeline and are ready for human review before sending to the client."

---

## 3. Assessment Pipeline / Visit Detail

**Screenshot:** `03-visit-detail.png`

### What It Shows:
The processing pipeline for a single assessment with three stages.

### Pipeline Stages:
1. **Transcribe** (Green check = complete)
   - Converts audio to text
   - Identifies speakers
   - Creates timestamped segments

2. **Bill** (Green check = complete)
   - Extracts services mentioned
   - Applies category-based pricing
   - Generates billable items

3. **Contract** (Outline = not yet run)
   - Merges data with templates
   - Creates service agreement
   - Ready for review

### Data Panels:
- **Transcript** — 24 segments of conversation
- **Billables** — 10 items identified
- **Contract** — Generated (when complete)

### Talking Points:
> "Here's the magic. Upload audio or paste a transcript, then click through the pipeline. Transcribe identifies who said what. Bill extracts every service mentioned and applies your pricing. Contract creates a draft agreement. What used to take hours now takes minutes."

---

## 4. Contract Preview & Generation

**Screenshot:** `04-contract-preview.png`

### What It Shows:
The generated contract preview with editing and export options.

### Contract Sections Visible:
- **Agency header** — Logo, address, contact
- **Document title** — "HOME CARE SERVICE AGREEMENT"
- **Effective date** — Auto-populated
- **Parties** — Service Provider and Client details

### Action Buttons:
- **Edit** — Modify content manually
- **Regenerate** — Re-run AI with changes
- **Print** — Export to PDF

### Tab Navigation:
- Transcript (24 segments)
- Billables (10 items)
- Contract (1 document)

### Talking Points:
> "Human-in-the-loop is critical in healthcare. The AI generates the contract, but coordinators review before sending. They can edit any section, regenerate with different parameters, or print directly. Nothing goes to the client without human approval."

---

## 5. Client Management (CRM)

**Screenshot:** `05-clients.png`

### What It Shows:
The client database with key information at a glance.

### Client Metrics:
- **Total Clients** — 4
- **Active** — 4
- **High Care** — 4 (care level indicator)
- **Pending** — 0

### Client Card Information:
- **Name** — Dorothy Chen
- **Care Level** — High Care badge
- **Phone** — 555-1003
- **Location** — Des Moines
- **Condition** — "Arthritis with recent hip replacement surgery"
- **Emergency Contact** — Michael Chen

### Talking Points:
> "Every client has a profile that follows them through assessments. Care level badges help prioritize. Medical conditions are extracted from assessments and stored here. Emergency contacts are always one click away."

---

## 6. Reports & Analytics

**Screenshot:** `06-reports.png`

### What It Shows:
Operational reporting dashboard with key metrics and export options.

### Dashboard Metrics:
- **This Week** — 20 assessments
- **Services** — 98 identified
- **Contracts** — 4 generated
- **Clients** — 4 active

### Available Reports:
1. **Weekly Timesheet** — Export billable hours for payroll
2. **Monthly Summary** — Overview of visits and services
3. **Billing Report** — Detailed breakdown of billable items
4. **Client Activity** — Visit history per client

### Talking Points:
> "Operations teams need data. Weekly timesheets export directly to payroll systems. Monthly summaries help with capacity planning. Billing reports reconcile with invoices. All the data the AI extracts becomes actionable intelligence."

---

## 7. Voice Identification (NEW)

**No Screenshot Yet** — Feature recently added

### What It Solves:
Traditional transcription can't reliably identify WHO is speaking. In healthcare, knowing whether the client or caregiver said something is critical.

### How It Works:
1. **Staff records 30-second voice sample** in Settings
2. **AI creates unique voiceprint** (like a fingerprint for voice)
3. **Every future recording** automatically identifies staff by voice
4. **Client names** extracted from conversation context

### Technical Details:
- Uses Pyannote.ai voiceprint technology
- 50%+ confidence threshold for matches
- Works without verbal introductions
- Voiceprints stored securely per user

### Talking Points:
> "This is a breakthrough. Staff record their voice once, and from then on, the AI knows who they are in every recording. For the client, we extract their name from the conversation. No more 'Speaker 1' and 'Speaker 2' confusion."

---

## 8. SOAP Notes Generation (NEW)

**No Screenshot Yet** — Feature recently added

### What It Produces:
Clinical documentation in standard SOAP format:

| Section | Description | Example |
|---------|-------------|---------|
| **Subjective** | Client's reported symptoms | "Patient reports increased pain in right hip" |
| **Objective** | Observable findings | "Mobility limited, using walker, vitals stable" |
| **Assessment** | Clinical evaluation | "Post-surgical recovery progressing normally" |
| **Plan** | Care recommendations | "Continue PT exercises, follow-up in 2 weeks" |

### Additional Data:
- **Tasks Performed** — List of services with duration
- **Client Responses** — How client reacted to care
- **Narrative Summary** — Human-readable visit summary

### Talking Points:
> "Documentation is the biggest time sink in healthcare. Our AI generates SOAP notes automatically from the conversation. Caregivers can review and approve rather than write from scratch. That's 20-30 minutes saved per visit."

---

## 9. Pipeline / Deals Board (NEW)

**No Screenshot Yet** — Feature recently added

### What It Shows:
Visual Kanban board showing client journey through stages.

### Pipeline Stages:
1. **Intake** — New inquiry, not yet assessed
2. **Assessment** — Currently being evaluated
3. **Proposal** — Contract generated, awaiting signature
4. **Active** — Signed client, receiving services
5. **Completed** — Relationship ended

### Card Information:
- Client name
- Monthly service value
- Contract status (Ready/Not Ready)
- Quick actions (View, Edit, Move)

### Talking Points:
> "This is your sales pipeline for care services. See exactly where each client is in the journey. Know the revenue value at each stage. Drag and drop to update status. Perfect for agency managers tracking conversions."

---

## 10. Integrations & Automations (NEW)

**No Screenshot Yet** — Feature recently added

### Current Integrations:
- **Google Calendar** — Sync visit schedules
- **Google Drive** — Document storage
- **Gmail** — Email from within the app

### Available Automations:
- ✅ Auto-generate contract when billing completes
- ✅ Notify coordinator when assessment ready
- ✅ Update client status after contract generation
- ✅ Send reminder for unsigned contracts

### Talking Points:
> "We're building toward a fully automated workflow. Finish an assessment, and the contract generates automatically. Change a client status, and notifications go out. Less manual work means more time for actual care."

---

## Talking Points Summary

### For Investors:
- "AI-first approach to healthcare documentation"
- "Human-in-the-loop ensures compliance and accuracy"
- "Minutes instead of hours per assessment"
- "Voiceprint technology is a unique differentiator"

### For Customers (Agencies):
- "Works with your existing audio recordings"
- "Customizable templates match your branding"
- "Reduces documentation time by 80%"
- "Improves billing accuracy and revenue capture"

### For Healthcare Professionals:
- "Less paperwork, more patient care"
- "SOAP notes generated automatically"
- "Accurate speaker identification"
- "Easy review and approval workflow"
