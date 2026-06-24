export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-is-ai-powered-home-care-software',
    title: 'What Is AI-Powered Home Care Software?',
    description:
      'Learn how artificial intelligence is transforming home care documentation, from voice assessments to instant contract generation — and why agencies are switching.',
    date: '2026-03-10',
    readTime: '6 min read',
    category: 'Industry',
    content: `
Home care agencies manage mountains of paperwork every day — assessments, service plans, contracts, billing sheets, compliance documents. For decades, the only answer was manual data entry, paper forms, and legacy scheduling systems that were never designed for modern care delivery.

**AI-powered home care software changes that.**

## What Does "AI-Powered" Actually Mean?

When we say AI-powered, we mean software that uses artificial intelligence to automate tasks that previously required manual work:

- **Voice transcription** — Record a client assessment conversation and the AI converts speech to structured text in real time, identifying speakers, extracting care needs, and flagging medications automatically.
- **Automatic contract generation** — Once an assessment is transcribed, AI maps extracted data (services, hours, rates, diagnoses) into a state-compliant service agreement. No copy-pasting. No re-typing.
- **Smart billing extraction** — AI identifies billable items from conversation context, calculates hours, and prepares invoices aligned with payer requirements.
- **Intelligent CRM** — AI categorizes leads, suggests follow-ups, and helps agencies close new clients faster.

## How It Differs from Legacy Home Care Software

Traditional platforms like AxisCare, WellSky, and CareTime are scheduling and billing systems first. They digitized paper forms, but the core workflow is still manual: type client info into a form, fill out an assessment template field by field, copy data into a contract.

AI-native software like PalmCare AI was built differently. Instead of digitizing paperwork, it eliminates it. The data flows from a voice recording through transcription, analysis, and document generation — automatically.

## Who Benefits Most?

- **Small agencies (5–30 clients)** save 10+ hours per week on documentation.
- **Growing agencies (30–200 clients)** reduce onboarding time from days to hours.
- **Enterprise agencies (200+ clients)** gain consistency across locations and reduce compliance risk.

## Is AI Transcription Accurate Enough for Healthcare?

Modern speech recognition models like Deepgram Nova-3 achieve over 95% accuracy on medical conversations, with smart formatting that handles medications, diagnoses, and care terminology. PalmCare AI also includes a human review step — staff review and approve the AI output before anything is finalized.

## Getting Started

The fastest way to see AI-powered home care software in action is to [book a free demo](/). In 30 minutes, you'll see how a single voice recording becomes a signed service agreement — with zero manual data entry.
`,
  },
  {
    slug: 'voice-to-contract-saves-home-care-agencies-time',
    title: 'How Voice-to-Contract Technology Saves Home Care Agencies Hours Every Week',
    description:
      'Home care agencies spend 15+ hours per week on documentation. Voice-to-contract technology cuts that to minutes. Here\'s how the workflow actually works.',
    date: '2026-03-08',
    readTime: '5 min read',
    category: 'Product',
    content: `
Documentation is the number one time drain for home care agencies. Between client assessments, service plans, contracts, and billing — administrative staff spend more time on paperwork than on actual care coordination.

**Voice-to-contract technology flips that equation.**

## The Traditional Workflow (and Where Time Gets Lost)

Here's what a typical new client onboarding looks like without AI:

1. **Assessment visit** — A nurse or coordinator conducts an in-home assessment, taking handwritten notes (30–60 minutes).
2. **Data entry** — Back at the office, someone types those notes into the EHR or CRM (30–45 minutes).
3. **Contract drafting** — An admin pulls a template, fills in client details, services, rates, and state-required fields (20–40 minutes).
4. **Review and corrections** — Errors get caught, corrections made, the contract is re-printed (15–30 minutes).
5. **Signature and filing** — The contract is sent for signature and filed (10–20 minutes).

**Total: 2–3 hours per client.** Multiply by 10 new clients a month, and you're looking at 20–30 hours of pure administrative overhead.

## The Voice-to-Contract Workflow

With PalmCare AI, the same process takes under 10 minutes:

1. **Record the assessment** — The caregiver or coordinator opens the app, taps record, and has a natural conversation with the client. No forms, no checkboxes.
2. **AI transcribes and extracts** — Within seconds, AI transcribes the conversation, identifies speakers, and extracts care needs, medications, services, and billing items.
3. **Contract auto-generates** — The system maps extracted data into a state-compliant contract template, filling every field automatically.
4. **Review and sign** — Staff reviews the pre-filled contract, makes any adjustments, and sends for electronic signature.

**Total: 5–10 minutes per client.**

## Real Numbers from Real Agencies

Agencies using voice-to-contract technology report:

- **85% reduction** in documentation time per client
- **3x faster** new client onboarding
- **60% fewer** contract errors and revisions
- **Same-day** turnaround from assessment to signed contract (vs. 3–5 days)

## What About Accuracy?

The AI doesn't replace human judgment — it accelerates it. Every transcription and contract goes through a review step. Staff see exactly what the AI extracted, can edit any field, and approve before the document is finalized. The AI handles the tedious work; humans handle the decisions.

## Try It Yourself

The best way to understand voice-to-contract is to experience it. [Book a free 30-minute demo](/) and we'll walk you through a live assessment-to-contract workflow using your own agency's data.
`,
  },
  {
    slug: 'hipaa-compliance-guide-home-care-agencies-2026',
    title: 'HIPAA Compliance Guide for Home Care Agencies in 2026',
    description:
      'A practical guide to HIPAA compliance for home care agencies — covering PHI handling, encryption requirements, staff training, and how technology can help.',
    date: '2026-03-05',
    readTime: '8 min read',
    category: 'Compliance',
    content: `
Every home care agency that handles Protected Health Information (PHI) must comply with HIPAA. But compliance isn't just about checking a box — it's about building systems and habits that protect patient data at every step.

This guide covers the essentials for home care agencies in 2026.

## What Counts as PHI in Home Care?

PHI includes any individually identifiable health information. In home care, that means:

- Client names, addresses, phone numbers, dates of birth
- Diagnoses, medications, care plans, assessment notes
- Insurance information, billing records, Medicaid/Medicare IDs
- Voice recordings of assessments or care conversations
- Photos or videos taken during care visits

**If it identifies a patient and relates to their health or care, it's PHI.**

## The Five HIPAA Rules That Matter Most

### 1. The Privacy Rule
Controls who can access PHI and under what circumstances. Home care agencies must have clear policies about which staff members can view client records.

### 2. The Security Rule
Requires administrative, physical, and technical safeguards for electronic PHI (ePHI). This includes encryption, access controls, and audit logging.

### 3. The Breach Notification Rule
If a data breach occurs, you must notify affected individuals within 60 days, and HHS if 500+ records are compromised.

### 4. The Minimum Necessary Rule
Staff should only access the minimum PHI needed to perform their job. A billing clerk doesn't need access to clinical notes.

### 5. Business Associate Agreements (BAAs)
Any vendor that handles PHI on your behalf — software providers, billing companies, cloud hosts — must sign a BAA.

## Technical Safeguards Every Agency Needs

- **Encryption at rest and in transit** — All ePHI must be encrypted using AES-256 or equivalent. This includes data stored in your software, backups, and data moving between devices and servers.
- **Role-based access controls** — Not every employee needs access to every client record. Implement role-based permissions.
- **Audit trails** — Every access to PHI should be logged. Who viewed what, when, and from where.
- **Automatic session timeouts** — If a device is idle, the session should lock automatically.
- **Secure authentication** — Multi-factor authentication (MFA) for all staff accessing ePHI.

## How PalmCare AI Handles HIPAA Compliance

PalmCare AI was built with HIPAA compliance from day one:

- **256-bit AES encryption** for all data at rest and in transit
- **Role-based access controls** with granular permissions
- **Comprehensive audit trails** for every data access and modification
- **Automatic session management** with configurable timeouts
- **Secure cloud infrastructure** with SOC 2 compliant hosting
- **BAA available** for all agency plans

## Staff Training Checklist

Technology alone isn't enough. Your team needs regular training:

- [ ] Annual HIPAA training for all staff
- [ ] Secure device handling (lock screens, no public Wi-Fi for PHI)
- [ ] Incident reporting procedures
- [ ] Social media policies (never post about clients)
- [ ] Secure communication channels (no PHI via personal text/email)

## Next Steps

If your agency needs a technology partner that takes HIPAA seriously, [start your free trial](/register) to see how PalmCare AI protects patient data while streamlining your workflow.
`,
  },
  {
    slug: '5-signs-your-agency-outgrown-paper-documentation',
    title: '5 Signs Your Home Care Agency Has Outgrown Paper-Based Documentation',
    description:
      'Still using paper forms or basic spreadsheets? Here are five signs your home care agency is ready for modern documentation software.',
    date: '2026-03-01',
    readTime: '4 min read',
    category: 'Operations',
    content: `
Paper-based documentation was fine when your agency had five clients. But as you grow, paper becomes a liability — slowing you down, creating errors, and putting you at risk.

Here are five signs it's time to make the switch.

## 1. You're Losing Hours to Data Re-Entry

If your staff conducts an assessment on paper, then types it into a spreadsheet, then copies it into a contract template — you're doing the same work three times. Every re-entry step is wasted time and another opportunity for errors.

**The fix:** Software that captures data once and flows it through your entire pipeline — assessment to contract to billing — automatically.

## 2. Contracts Take Days Instead of Hours

When a new client needs a service agreement, how long does it take? If the answer is "a few days" (because you're waiting for admin to pull a template, fill in details, get it reviewed, and mail it), you're losing clients to faster competitors.

**The fix:** AI contract generation that produces state-compliant agreements in seconds, not days.

## 3. You've Had a Compliance Scare

Did an auditor flag missing documentation? Did a caregiver leave PHI in a car? Paper records are inherently insecure — they can be lost, stolen, damaged, or accessed by unauthorized people. Digital records with encryption and access controls are the standard.

**The fix:** HIPAA-compliant software with encrypted storage, audit trails, and role-based access.

## 4. Caregivers Hate the Paperwork

High caregiver turnover is an industry crisis. If your care staff spend more time on forms than on care, you're contributing to burnout. Modern tools like mobile apps with voice recording and one-tap logging reduce caregiver frustration.

**The fix:** A mobile app that lets caregivers document visits by speaking, not typing.

## 5. You Can't Get a Clear Picture of Your Business

How many active clients do you have right now? What's your average revenue per client? Which caregivers have expiring certifications? If answering these questions requires digging through folders or merging spreadsheets, you don't have visibility — you have chaos.

**The fix:** A CRM with real-time dashboards, analytics, and automated reporting.

## Ready to Upgrade?

If you recognized your agency in two or more of these signs, it's time. [Book a free demo](/) to see how PalmCare AI replaces paper-based chaos with a streamlined, AI-powered workflow.
`,
  },
  {
    slug: 'complete-guide-home-care-client-assessments',
    title: 'The Complete Guide to Home Care Client Assessments',
    description:
      'Everything home care agencies need to know about conducting thorough client assessments — what to document, state requirements, and how AI is changing the process.',
    date: '2026-02-25',
    readTime: '7 min read',
    category: 'Education',
    content: `
The client assessment is the foundation of every home care relationship. It determines what services the client needs, how many hours of care to provide, what to bill, and what goes into the service agreement.

Get it right, and everything downstream flows smoothly. Get it wrong, and you're dealing with care gaps, billing disputes, and compliance issues.

## What to Cover in a Home Care Assessment

A comprehensive assessment should document:

### Client Information
- Full legal name, date of birth, address
- Emergency contacts and authorized representatives
- Insurance information (Medicaid, Medicare, private)
- Primary care physician and specialists

### Medical History
- Current diagnoses and conditions
- Medications (name, dosage, frequency, prescriber)
- Allergies and contraindications
- Recent hospitalizations or ER visits
- Cognitive status and behavioral considerations

### Functional Assessment
- Activities of Daily Living (ADLs): bathing, dressing, toileting, transferring, eating
- Instrumental ADLs: cooking, cleaning, shopping, medication management, transportation
- Mobility and fall risk
- Communication abilities
- Pain assessment

### Home Environment
- Safety hazards (loose rugs, stairs, lighting)
- Equipment needs (wheelchair, walker, hospital bed)
- Accessibility issues
- Living situation (alone, with family, pets)

### Social and Emotional
- Social support network
- Mental health considerations
- Cultural or religious preferences
- Goals and preferences for care

## State-Specific Requirements

Each state has its own documentation requirements for home care assessments. Common variations include:

- **Required assessment timeframes** — Some states mandate initial assessments within 48 hours of service start.
- **Licensed assessor requirements** — Many states require assessments by an RN or licensed social worker.
- **Reassessment frequency** — Annual, semi-annual, or upon significant change of condition.
- **Specific forms or templates** — Some Medicaid programs require state-issued assessment instruments.

Always check your state's home care licensing regulations to ensure your assessment process meets all requirements.

## Common Assessment Mistakes

1. **Incomplete documentation** — Leaving fields blank or writing "see notes" without actual notes.
2. **Not involving the client** — The client (or their representative) should actively participate.
3. **Ignoring the home environment** — Safety hazards at home are just as important as medical history.
4. **One-size-fits-all approach** — An assessment for a post-surgical recovery client looks very different from one for a dementia care client.
5. **Waiting too long to document** — If you wait until you're back at the office, you forget details.

## How AI Is Changing Assessments

Traditional assessments require filling out lengthy forms during or after the visit. AI-powered tools like PalmCare AI let assessors have a natural conversation with the client while the AI handles documentation:

- **Voice recording** captures the full assessment conversation
- **AI transcription** converts speech to text with medical terminology support
- **Smart extraction** identifies diagnoses, medications, ADL needs, and billing items
- **Automatic mapping** populates assessment forms and contract templates

The result: a more thorough, more natural assessment process that produces better documentation in less time.

## Assessment Best Practices

1. **Build rapport first** — Spend a few minutes getting to know the client before diving into medical questions.
2. **Use open-ended questions** — "Tell me about a typical day" reveals more than "Can you bathe independently?"
3. **Document in real time** — Use a mobile device or voice recording so nothing gets lost.
4. **Include client preferences** — Care plans that respect preferences lead to better outcomes and satisfaction.
5. **Review with the client** — Before leaving, summarize your findings and confirm accuracy.

## Start Modernizing Your Assessments

If your agency is still using paper forms or typing notes after the fact, there's a better way. [Book a demo](/) to see how PalmCare AI turns a single voice recording into a complete, compliant assessment — and a signed contract.
`,
  },
  {
    slug: 'how-much-does-home-care-software-cost',
    title: 'How Much Does Home Care Software Cost in 2026?',
    description:
      'A plain-English breakdown of home care software pricing in 2026 — per-user fees, setup costs, what drives the price, and how to compare plans without surprises.',
    date: '2026-06-23',
    readTime: '7 min read',
    category: 'Pricing',
    content: `
If you run a home care agency and you're shopping for software, the first question is usually the hardest to answer: what does it actually cost? Most vendors hide pricing behind a "book a demo" wall, so it's tough to compare. Here's a straight answer.

## The Short Version

Home care software in 2026 typically lands in one of three ranges:

- **Entry tools (solo / very small agencies):** roughly $50–$150 per month, often per-user.
- **Growing agencies (30–200 clients):** roughly $300–$800 per month, depending on user count and modules.
- **Enterprise (200+ clients, multi-location):** $1,000+ per month, usually custom-quoted.

Those numbers move based on a few things — let's break them down so you can read any quote accurately.

## What Actually Drives the Price

- **Per-user vs. per-client pricing.** Some vendors charge per caregiver seat, which punishes you for growing your team. Others charge by active client count. Know which model you're signing up for.
- **Setup and onboarding fees.** Legacy platforms often add a one-time implementation fee ($500–$5,000) for data migration and training. Ask whether it's included.
- **Modules and add-ons.** Scheduling, billing, EVV, and reporting are sometimes sold separately. A low headline price can double once you add what you actually need.
- **Contract length.** Annual commitments are usually cheaper per month, but make sure you can leave if it isn't working.

## Questions to Ask Before You Sign

1. Is pricing per user or per client?
2. What's the setup or migration fee?
3. Which features are included vs. add-ons?
4. Is there a free trial, and does it include all features?
5. Can I cancel anytime, and what happens to my data if I do?

## Where the Real Savings Are

The sticker price is only half the math. The bigger number is the time your team spends on documentation. If your staff spends 10–15 hours a week typing assessments, filling forms, and re-keying data into contracts, that labor cost dwarfs most software fees.

This is where AI-native tools change the equation. PalmCare AI turns a recorded assessment into a state-specific service contract automatically — so the question isn't just "what does the software cost," it's "how many hours does it give back." For most agencies, that's the number that decides it.

## See a Real Quote

PalmCare AI offers transparent plans for solo, growing, and enterprise agencies, each with a 14-day free trial and no setup fee. [Book a demo](/) and we'll walk through a quote based on your client count — no guesswork.
`,
  },
  {
    slug: 'how-to-write-home-care-service-agreement',
    title: 'How to Write a Home Care Service Agreement (Free Checklist)',
    description:
      'What every home care service agreement should include to be clear, compliant, and protect your agency — plus how to generate one from a recorded assessment in seconds.',
    date: '2026-06-23',
    readTime: '8 min read',
    category: 'Compliance',
    content: `
A service agreement is the document that turns a care assessment into a working relationship. Done well, it sets expectations, satisfies state requirements, and protects both your agency and the client. Done poorly — or skipped — it's where disputes and compliance gaps start. Here's what to include.

## What a Home Care Service Agreement Should Cover

- **Parties and effective date.** The agency, the client (and responsible party, if any), and when service begins.
- **Scope of services.** The specific care being provided — personal care, companionship, medication reminders, ADL support — written plainly, not as a generic list.
- **Schedule and hours.** Days, hours, and how changes are handled.
- **Rates and billing.** Hourly or visit rate, payer (private pay, Medicaid, long-term care insurance), billing cycle, and late-payment terms.
- **Caregiver responsibilities.** What caregivers will and won't do, including any tasks that require a nurse.
- **Client rights and responsibilities.** Including the right to be informed, to privacy, and to change or end services.
- **Termination terms.** Notice period and how either side can end the agreement.
- **State-specific clauses.** Mandatory language varies by state — disclosures, bill of rights, grievance procedures, and more.
- **Signatures.** Client (or representative) and an agency representative, with dates.

## The Free Checklist

- [ ] Parties and start date
- [ ] Plain-language scope of services
- [ ] Schedule and how changes are handled
- [ ] Rate, payer, and billing terms
- [ ] Caregiver scope and limits
- [ ] Client rights and grievance process
- [ ] Termination and notice terms
- [ ] State-required disclosures and clauses
- [ ] Signature blocks with dates

## The Hard Part: State-Specific Requirements

A general template gets you most of the way, but home care is regulated state by state. Florida, California, and Texas each require different disclosures and mandatory clauses. Using a one-size template risks an agreement that's clear but not compliant.

## From Conversation to Contract

This is exactly the work PalmCare AI was built to remove. Record the assessment, and PALM writes the care plan, the billables, and a state-specific service agreement built from what was actually said — pre-filled and ready for review in seconds. You review and sign; the compliance details are already in place.

[Book a demo](/) to see a service agreement generated from a single recorded assessment.
`,
  },
  {
    slug: 'best-home-care-software-2026-comparison',
    title: 'Best Home Care Software in 2026: AxisCare vs WellSky vs PalmCare AI',
    description:
      'An honest comparison of leading home care platforms in 2026 — what AxisCare, WellSky, and PalmCare AI each do well, and how to choose the right fit for your agency.',
    date: '2026-06-23',
    readTime: '8 min read',
    category: 'Comparison',
    content: `
There are dozens of home care platforms, but most agencies end up comparing a few. Here's an honest look at three common choices in 2026 — what each does well, and where they differ — so you can pick the right fit.

## At a glance

| Capability | AxisCare | WellSky | PalmCare AI |
|---|---|---|---|
| Primary focus | Scheduling & EVV | Broad enterprise suite | Assessment → signed contract |
| Voice-recorded assessments | No | No | Yes |
| Auto-generated service contracts | Manual | Manual | Automatic |
| State-specific contract clauses | Manual | Varies | Built in (50 states) |
| Typical setup time | Days to weeks | Weeks | About 24 hours |
| Best for | Scheduling & EVV needs | Large, complex orgs | Cutting documentation time |

## AxisCare

AxisCare is a well-established scheduling and EVV platform. It's strong on the operational basics: shift scheduling, electronic visit verification, and billing workflows. Agencies that need a mature, widely-used scheduling backbone often land here.

- **Best for:** agencies that primarily need scheduling, EVV, and billing.
- **Watch for:** assessments and contracts are still largely manual — you fill out forms and templates by hand.

## WellSky

WellSky is an enterprise-grade platform spanning many areas of post-acute and home care. It's broad and deep, with strong reporting and integrations.

- **Best for:** larger organizations that need a wide, configurable enterprise suite.
- **Watch for:** breadth comes with complexity and cost; implementation can be lengthy.

## PalmCare AI

PalmCare AI takes a different starting point: instead of digitizing paperwork, it removes it. You record a care assessment, and the AI transcribes it, separates speakers, extracts billables, writes the visit notes, and generates a state-specific service contract — automatically.

- **Best for:** agencies that want to cut documentation time and turn assessments into signed contracts fast.
- **Watch for:** it's AI-native and focused on the assessment-to-contract workflow rather than being a decades-old all-in-one.

## How to Choose

1. **Start with your biggest time sink.** If it's scheduling and EVV, a legacy platform may cover it. If it's documentation and contracts, an AI-native tool will give you the most hours back.
2. **Count the manual steps.** Every time data is re-typed from one place to another is a place for errors and lost time.
3. **Check state compliance.** Make sure contracts reflect your state's requirements without manual editing.
4. **Trial it with real visits.** A demo shows the happy path; a trial shows what your team actually experiences.

## The Bottom Line

Legacy platforms digitized the paperwork. AI-native platforms aim to eliminate it. If your agency's pain is the hours spent on assessments, notes, billing, and contracts, that's exactly what PalmCare AI was built to remove.

[Book a demo](/) and see your own assessment turned into a signed contract — then compare.
`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
