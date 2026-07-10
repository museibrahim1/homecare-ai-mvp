export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
  /** For listicles: the ranked items, emitted as ItemList JSON-LD for SEO/AEO. */
  listItems?: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'best-ai-tools-home-care-agencies-2026',
    title: 'The 7 Best AI Tools for Home Care Agencies in 2026',
    description:
      'A ranked list of the best AI tools for home care agencies in 2026. It covers documentation, clinical scribes, contract templates, monitoring, and training, with what each one is actually best at.',
    date: '2026-07-09',
    readTime: '8 min read',
    category: 'Comparison',
    listItems: [
      'PalmCare AI, best for assessments, care plans, and state-specific service contracts',
      'Eleos Health, best AI clinical scribe for behavioral and home health documentation',
      'Apricot by AlayaCare, best ambient scribe inside a home health EHR',
      'nVoq, best medical dictation for clinicians who prefer speaking to typing',
      'Sensi.AI, best in-home audio monitoring for around-the-clock awareness',
      'CareAcademy, best AI-assisted caregiver training and compliance tracking',
      'PandaDoc, best general e-signature and document workflow tool',
    ],
    content: `
AI tools for home care are not interchangeable. A clinical scribe, a contract generator, and an in-home monitor solve different problems. This list ranks the seven AI tools doing real work for home care agencies in 2026 and says plainly what each one is best at, so you can match the tool to the job.

## 1. PalmCare AI, best for assessments, care plans, and service contracts

PalmCare AI is built for non-medical home care agencies. It does one job better than anything else on this list: it turns a recorded client assessment into finished paperwork. You record the conversation. It writes the transcript, the care plan, the billable items, the visit notes, and a state-specific service agreement built from what was actually said. A staff member reviews and approves everything before it goes out.

- **Best for:** agencies that want each assessment to become a ready-to-sign contract in minutes.
- **Standout:** service agreements with the correct clauses for all 50 states, generated automatically.
- **Consider something else if:** you are a Medicare-certified home health agency that needs OASIS charting. That is a job for a scribe, covered next.

## 2. Eleos Health, best AI clinical scribe for behavioral and home health

Eleos listens during sessions and produces clinical documentation in real time, with compliance analytics on top. It is well established in behavioral health and growing in home health. The output is clinical notes, not client contracts.

- **Best for:** clinical documentation and supervision insights.
- **Consider something else if:** your bottleneck is intake paperwork rather than clinical charting.

## 3. Apricot by AlayaCare, best ambient scribe inside an EHR

Apricot generates visit documentation while the visit happens and syncs it into the AlayaCare platform. If you already run on AlayaCare, it is the easiest way to add AI documentation.

- **Best for:** AlayaCare customers who want AI charting without another vendor.
- **Consider something else if:** you are not on AlayaCare, or you need service agreements.

## 4. nVoq, best medical dictation

nVoq is speech recognition tuned for healthcare. Home health and hospice clinicians use it to dictate accurately into their existing systems. It transcribes what you say. It does not decide what the document should contain.

- **Best for:** clinicians replacing typing with speaking.
- **Consider something else if:** you want the AI to structure the document, not just transcribe it.

## 5. Sensi.AI, best in-home monitoring

Sensi uses audio-based AI in the client's home to detect falls, distress, and care quality issues between visits. It is a care intelligence tool rather than a documentation tool, and it pairs well with any platform on this list.

- **Best for:** around-the-clock awareness for high-acuity clients and clients who live alone.
- **Consider something else if:** you are solving a paperwork problem, not a monitoring problem.

## 6. CareAcademy, best caregiver training

CareAcademy handles state-required caregiver training with AI-assisted course recommendations and automatic compliance tracking. Every agency has to manage training compliance, and this is the cleanest way to do it.

- **Best for:** onboarding caregivers and keeping certifications current.

## 7. PandaDoc, best general document workflow

PandaDoc is not specific to home care, but plenty of agencies use it for proposals and e-signature. Its AI helps draft and edit documents from templates. You still fill in the care details and verify state requirements yourself.

- **Best for:** e-signature and polished proposals.
- **Consider something else if:** you want home care logic built in. Templates do not know your state's required clauses.

## How to choose

1. **Name the bottleneck first.** Intake paperwork, clinical charting, monitoring, and training are four different problems.
2. **Home health or home care?** Medicare-certified home health needs OASIS tools. Non-medical home care needs assessment-to-contract tools.
3. **Trial with a real client, not a demo script.** Ten minutes with your own assessment tells you more than any sales call.

If your slowest job is getting from a finished assessment to a signed agreement, that exact job is what [PalmCare AI](/register) was built for. You can try it free for 14 days.
`,
  },
  {
    slug: 'ways-home-care-agencies-use-ai-2026',
    title: '10 Ways Home Care Agencies Are Using AI in 2026',
    description:
      'Ten concrete ways home care agencies are putting AI to work in 2026, from voice-recorded assessments to automatic billing extraction, and what each one replaces.',
    date: '2026-07-09',
    readTime: '7 min read',
    category: 'Industry',
    listItems: [
      'Recording assessments instead of typing them',
      'Generating state-specific service contracts automatically',
      'Writing care plans from the assessment conversation',
      'Extracting billable items straight from the visit',
      'Drafting visit notes for caregiver review',
      'Screening and prioritizing new client inquiries',
      'Monitoring clients between visits with in-home AI',
      'Automating caregiver training and compliance tracking',
      'Answering family questions with agency chatbots',
      'Forecasting scheduling gaps before they happen',
    ],
    content: `
Ask ten agency owners what using AI means and you will get ten answers. AI is not one feature. It is a set of tools that each replace a specific piece of manual work. Here are the ten uses we actually see in the field in 2026, ordered roughly by how much time each one gives back.

## 1. Recording assessments instead of typing them

The single biggest shift. Instead of filling out forms during a home visit, the assessor records the conversation. AI transcribes it, separates the speakers, and pulls out the care needs. The conversation becomes the documentation.

## 2. Generating state-specific service contracts

Home care service agreements are regulated state by state, and getting the required clauses right by hand is slow and risky. AI tools like PalmCare AI generate the agreement from the assessment with the correct state clauses already in place.

## 3. Writing care plans from the conversation

The same recording that produces the contract can produce the care plan: goals, tasks per visit, schedule, and safety precautions, all consistent with what the client actually said they need.

## 4. Extracting billables straight from the visit

Hours, services, and rates mentioned in the assessment get captured as billing line items instead of being re-keyed later. Fewer touches means fewer billing errors.

## 5. Drafting visit notes for review

Caregivers speak a quick summary after a visit and AI structures it into a proper note. The caregiver reviews and approves. Nobody types on a phone keyboard in a parked car anymore.

## 6. Screening new client inquiries

AI intake assistants collect the basics from a new inquiry, including location, needs, hours, and payer, then rank the leads. Coordinators spend their callbacks on the families most likely to start service.

## 7. Monitoring between visits

Audio-based in-home AI like Sensi.AI listens for falls, distress, and care issues around the clock and flags anomalies for follow-up. It extends awareness beyond scheduled visit hours.

## 8. Automating training and compliance

Platforms like CareAcademy assign state-required training automatically and track expirations, so certification gaps get caught before an audit does.

## 9. Answering families with chatbots

Agency websites now answer common questions about services, coverage areas, and pricing basics instantly, then hand off to a human when the conversation gets specific. Families get answers at 9 PM. Coordinators get fewer repetitive calls.

## 10. Forecasting scheduling gaps

Scheduling systems increasingly flag likely call-offs and coverage gaps based on patterns, giving schedulers hours of warning instead of minutes.

## Where to start

Do not adopt ten tools. Pick the one job that eats the most hours at your agency. For most non-medical home care agencies, that is the intake paperwork chain: assessment, care plan, billables, contract. That entire chain from one recording is what [PalmCare AI](/register) does. Start there, measure the hours saved, then expand.
`,
  },
  {
    slug: 'questions-to-ask-before-buying-home-care-ai-software',
    title: '5 Questions to Ask Before Buying AI Software for Your Home Care Agency',
    description:
      'A practical buyer checklist for home care AI software: the five questions that separate tools that save hours from tools that create new work.',
    date: '2026-07-09',
    readTime: '5 min read',
    category: 'Operations',
    listItems: [
      'Is it built for home care, or adapted from another industry?',
      'What does it produce: a transcript, a note, or a finished document?',
      'Does a human review step come standard?',
      'How does it handle HIPAA and my state requirements?',
      'Can I test it with a real assessment before paying?',
    ],
    content: `
Every software vendor put AI on their homepage this year. Some of those tools will save your agency ten hours a week. Others will add a new system to babysit. These five questions separate the two. Ask them on every demo call.

## 1. Is it built for home care, or adapted from another industry?

A tool built for hospitals or general offices does not know what an ADL is, what a service agreement must contain in your state, or why a care plan and a contract have to match. Ask the vendor to name their home care customers and show a home care workflow end to end. Generic AI plus your industry knowledge is still your labor.

## 2. What does it produce: a transcript, a note, or a finished document?

This is the question most buyers skip. A transcription tool gives you accurate text you still have to process. A scribe gives you a clinical note. A documentation platform gives you the finished documents: care plan, billables, and a signable contract. None of these is wrong, but they are priced like different things because they are different things. Know which one you are buying.

## 3. Does a human review step come standard?

You want AI that drafts and humans that approve. If the tool sends documents anywhere without a review step, that is a compliance problem waiting for a date. If the vendor cannot show you the review screen, keep shopping.

## 4. How does it handle HIPAA and my state requirements?

The minimum bar is encryption at rest and in transit, role-based access, audit logs, and a signed BAA. For anything that produces contracts, also ask how it knows your state's required clauses and what happens when your state changes its rules. If the answer is that you can edit the template yourself, the compliance work is still yours.

## 5. Can I test it with a real assessment before paying?

A scripted demo always works. The real test is your actual audio: a real assessment with background noise, interruptions, and a client who wanders off topic. A vendor confident in their product will let you run one. A 14-day trial with full features is the standard now. Anything less deserves the question of why not.

## The short version

Buy the tool that produces the thing you need finished, built for your industry, with human review, real compliance answers, and a trial you can run on a real client. If the thing you need finished is the assessment-to-contract chain, [start a free trial of PalmCare AI](/register) and run question five on us first.
`,
  },
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
    slug: 'ai-home-care-documentation-tools-2026',
    title: 'AI Documentation Tools for Home Care Agencies, Compared (2026)',
    description:
      'The real AI tools that turn a recorded home visit into documentation in 2026 — AI clinical scribes (Eleos, Enzo, Apricot, Scribble), service-agreement templates (PandaDoc, Genie AI), and PalmCare AI — and how to choose as a home care agency.',
    date: '2026-06-23',
    readTime: '7 min read',
    category: 'Comparison',
    content: `
If you run a home care agency and you want AI to cut documentation time, the market is easy to confuse. One quick note first: **scheduling and EVV platforms — AxisCare, WellSky, Sandata — aren't on this list.** They manage shifts and electronic visit verification; they don't turn a recorded assessment into paperwork. The tools below do. They fall into three groups.

## At a glance

| What it does | AI clinical scribes | Service-agreement templates | PalmCare AI |
|---|---|---|---|
| Examples | Eleos, Enzo, nVoq, Apricot, Scribble | PandaDoc, Genie AI, DocHub | PalmCare AI |
| Built for | Medicare home health & hospice | General document drafting | Non-medical home care agencies |
| Captures the visit by voice | Yes | No | Yes |
| Main output | OASIS-E + clinical visit notes | Blank fillable template | Care plan + SOAP notes + billables + service contract |
| State-specific service contract | No | Manual editing | Automatic (50 states) |
| Best for | OASIS charting & reimbursement | One-off agreements | Assessments → signed contracts |

## 1. AI clinical scribes (Eleos, Enzo, nVoq, Apricot, Scribble, Lime)

These ambient AI tools listen during a visit and generate clinical documentation in real time. They're genuinely good — but they're built for **Medicare-certified home health and hospice**. Their output is OASIS-E, ICD-10 coding, and clinical visit notes that sync into a home-health EHR like WellSky, MatrixCare, HCHB, or Axxess.

- **Best for:** Medicare home health/hospice agencies that need OASIS charting and reimbursement-ready notes.
- **Watch for:** they don't produce a client service agreement, and they're oriented around clinical and Medicare workflows — not private-pay home care onboarding.

## 2. Service-agreement templates (PandaDoc, Genie AI, DocHub, Agiled)

These give you a caregiver or home care service agreement you fill in, often with e-signature. Useful for a one-off contract.

- **Best for:** drafting a single agreement from a template.
- **Watch for:** no voice, no assessment, no automatic care plan or billables — you still do the thinking and the typing, and getting the state-specific clauses right is on you.

## 3. PalmCare AI

PalmCare AI is built for **home care agencies** (non-medical / private duty). You record the client assessment, and it transcribes the conversation, separates speakers, extracts the billable services, writes the visit notes, and generates a **state-specific service contract** — built from what was actually said. A staff member reviews and approves before anything is finalized.

- **Best for:** home care agencies that want each assessment turned into a signed service agreement — plus notes and billables — in minutes.
- **Watch for:** it's focused on the home care assessment-to-contract workflow, not OASIS clinical charting for Medicare home health.

## How to choose

1. **Are you Medicare-certified home health, or non-medical home care?** Home health → an OASIS scribe. Home care → PalmCare AI.
2. **Do you need a signable client contract, or a clinical chart?** Scribes produce the chart; PALM produces the contract, care plan, and billables.
3. **Count the manual re-types in your current flow.** Every handoff is lost time and a chance for an error.
4. **Trial it with a real assessment,** not just a scripted demo.

## The bottom line

The AI scribe tools are excellent at clinical OASIS notes for home health. The template tools are fine for a one-off agreement. But if you're a home care agency and your pain is turning every assessment into a complete, state-specific service contract — with notes and billables — that specific job is what PalmCare AI was built for.

[Book a demo](/) and watch your own assessment become a signed contract — then compare.
`,
  },
  {
    slug: 'how-to-do-home-care-client-assessment',
    title: 'How to Do a Home Care Client Assessment (Step-by-Step + Checklist)',
    description:
      'A practical, step-by-step guide to conducting a non-medical home care client assessment — what to ask, what to document, and a free checklist you can follow on every visit.',
    date: '2026-06-24',
    readTime: '8 min read',
    category: 'Operations',
    content: `
A home care client assessment is the in-home visit where an agency documents a new client's needs, environment, and goals so it can build a safe care plan and a clear service agreement. A complete assessment covers daily living needs, health background, the home environment, and the services the client is buying — and it's the foundation everything else (care plan, billing, contract) is built on.

## What a home care assessment should cover

Use these sections on every assessment so nothing gets missed:

| Section | What to capture |
|---|---|
| Client & contacts | Legal name, DOB, address, emergency contacts, POA/guardian, primary physician |
| Activities of daily living (ADLs) | Bathing, dressing, grooming, toileting, transferring, eating — and how much help each needs |
| Instrumental ADLs (IADLs) | Meals, medication reminders, housekeeping, laundry, transportation, shopping |
| Health background | Diagnoses, allergies, medications, mobility aids, fall history, cognition |
| Home environment | Safety hazards, stairs, bathroom setup, pets, smoke/CO detectors |
| Services & schedule | Which services, how many hours, which days, start date, rate |
| Goals & preferences | What the client and family want, routines, cultural/dietary preferences |

## Step-by-step

1. **Prepare before the visit.** Confirm the appointment, review any referral or intake notes, and bring (or open) your assessment checklist.
2. **Build rapport first.** Explain who you are and what the visit is for. People share more when they're comfortable.
3. **Walk through ADLs and IADLs.** Ask how a normal day goes rather than reading a list — you'll surface needs the client wouldn't think to mention.
4. **Do a home safety scan.** Note hazards (loose rugs, poor lighting, bathroom grab bars) you can address in the care plan.
5. **Capture health background and medications.** Record diagnoses, allergies, and a current medication list.
6. **Agree on services, hours, and schedule.** Translate needs into the specific services the client is buying.
7. **Document and confirm.** Summarize what you heard, confirm it with the client/family, and capture consent.

## Free assessment checklist

- [ ] Client identity, contacts, physician, POA
- [ ] ADLs scored with level of assistance
- [ ] IADLs and household needs
- [ ] Diagnoses, allergies, medications, fall risk
- [ ] Home safety hazards noted
- [ ] Services, weekly hours, schedule, rate
- [ ] Goals, routines, and preferences
- [ ] Consent captured and documented

## Turn the assessment into a care plan and contract

The slowest part isn't the visit — it's everything after: re-typing the assessment into a care plan, pulling billable items, and drafting a state-specific service agreement. PalmCare AI does that from a recording of the assessment automatically, so the conversation becomes the documentation.

See [what belongs in the care plan next](/blog/home-care-care-plan-template), or [estimate the hours you'd save](/roi-calculator).
`,
  },
  {
    slug: 'home-care-care-plan-template',
    title: 'What to Include in a Home Care Care Plan (Free Template)',
    description:
      'A home care care plan turns an assessment into a clear plan of services, goals, and tasks. Here is exactly what to include, with a free template and how to generate one automatically.',
    date: '2026-06-24',
    readTime: '7 min read',
    category: 'Operations',
    content: `
A home care care plan is the document that turns a client assessment into an actionable plan: the services the caregiver will provide, the schedule, the goals, and the specific tasks for each visit. A good care plan is specific enough that any caregiver could step in and know exactly what to do — and it ties directly to what the client agreed to pay for.

## What every home care care plan should include

| Element | What it means |
|---|---|
| Client summary | Name, key diagnoses, allergies, mobility, cognition, emergency contacts |
| Goals | What "good" looks like — e.g., "remains safe at home," "no falls," "improved nutrition" |
| Services & tasks | The exact ADL/IADL tasks per visit (bathing, meals, meds reminders, light housekeeping) |
| Schedule | Days, times, and hours per visit |
| Safety & risk plan | Fall precautions, home hazards, what to do in an emergency |
| Special instructions | Diet, routines, preferences, equipment use |
| Review date | When the plan will be re-evaluated |

## How a care plan differs from a service agreement

They're related but not the same:

- The **care plan** is the clinical/operational document — *what care happens and how*.
- The **service agreement (contract)** is the legal/business document — *the terms, rate, responsibilities, and state-required clauses* the client signs.

You need both, and they must agree with each other. (See [how to write a home care service agreement](/blog/how-to-write-home-care-service-agreement).)

## Free care plan template

1. **Client snapshot** — identity, diagnoses, allergies, contacts
2. **Goals** — 2–4 measurable goals
3. **Services by visit** — task list per scheduled visit
4. **Schedule** — days, times, total weekly hours
5. **Safety plan** — risks and precautions
6. **Preferences** — diet, routine, cultural/religious notes
7. **Signatures & review date**

## Generate the care plan from the assessment

Re-typing the assessment into a care plan, then again into a contract, is where agencies lose hours. PalmCare AI generates the care plan, visit notes, billable items, and a state-specific service contract from one recorded assessment — all consistent with each other.

[Estimate your savings](/roi-calculator) or [see how PalmCare AI compares to other tools](/blog/ai-home-care-documentation-tools-2026).
`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
