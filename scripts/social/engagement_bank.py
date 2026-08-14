"""Engagement talking points for LinkedIn + Threads.

APPROVAL ONLY. Never wire these into run_scheduled_posts.py.
Muse picks which ones to post. Marketing automation stays separate.

Rules:
- End with ONE specific, answerable question
- No engagement bait ("like if you agree", "comment YES")
- No em dashes, no slash-joined alternatives, no unverifiable claims
- LinkedIn: founder voice, depth, no link in body
- Threads: shorter, conversational, no link in body (link only if Muse asks, as first reply)
"""
from __future__ import annotations

# id, topic, pillar, linkedin body, threads body
ENGAGEMENT: list[dict[str, str]] = [
    {
        "id": "e01",
        "topic": "Second documentation",
        "pillar": "Time and relief",
        "linkedin": (
            "The most expensive part of a care assessment is the second time it gets documented.\n\n"
            "The first time is free. Client, family, and assessor say everything out loud in the room. "
            "The second time costs your best nurse her evening.\n\n"
            "At your agency, how many hours per week still go into that second pass?"
        ),
        "threads": (
            "Home care assessments get documented twice.\n\n"
            "Once out loud in the living room. Once again at a keyboard.\n\n"
            "How many hours a week does the second pass still take at your agency?"
        ),
    },
    {
        "id": "e02",
        "topic": "AI safety review step",
        "pillar": "Trust and safety",
        "linkedin": (
            "The trust question for AI in home care is simple.\n\n"
            "Does anything reach a family before a human on your team reviews it?\n\n"
            "If you are evaluating tools right now, what is your hard rule on that?"
        ),
        "threads": (
            "Quick AI safety check for home care tools:\n\n"
            "Does anything reach a family before a human on your team reviews it?\n\n"
            "What is your hard rule?"
        ),
    },
    {
        "id": "e03",
        "topic": "Build together",
        "pillar": "Build together",
        "linkedin": (
            "I am building documentation AI with agency owners, not for them in private.\n\n"
            "If you could require one safety rule before any AI-generated care plan or contract "
            "reaches a family, what would it be?\n\n"
            "I read every reply."
        ),
        "threads": (
            "Building home care AI in public.\n\n"
            "One rule you would require before an AI draft reaches a family?\n\n"
            "I am collecting these."
        ),
    },
    {
        "id": "e04",
        "topic": "Evenings",
        "pillar": "Time and relief",
        "linkedin": (
            "Most home care software fights for the daytime. Scheduling. EVV. Payroll.\n\n"
            "The unpaid shift is still the evening: retyping the visit into notes, billables, and a service agreement.\n\n"
            "What eats more nights on your team right now, scheduling problems or post-visit paperwork?"
        ),
        "threads": (
            "What burns more evenings on your home care team?\n\n"
            "A) Scheduling chaos\n"
            "B) Post-visit paperwork\n\n"
            "Curious which one wins."
        ),
    },
    {
        "id": "e05",
        "topic": "Who said what",
        "pillar": "Trust and safety",
        "linkedin": (
            "A care assessment is three voices in one room.\n\n"
            "The caregiver's questions. The client's answers. The family's concerns.\n\n"
            "If your notes flatten that into one anonymous block of text, you lose accountability.\n\n"
            "Do your transcripts keep speakers separate today, or is it one merged paragraph?"
        ),
        "threads": (
            "Care assessments have three voices.\n\n"
            "Caregiver. Client. Family.\n\n"
            "Do your notes keep them separate, or merge everything into one blob?"
        ),
    },
    {
        "id": "e06",
        "topic": "Speed to signature",
        "pillar": "Proof",
        "linkedin": (
            "In private duty, the agency that puts a clear agreement in front of the family first "
            "usually wins the client.\n\n"
            "Speed-to-signature is not a vanity metric. It is revenue.\n\n"
            "What is your average time from assessment to signed agreement right now?"
        ),
        "threads": (
            "Honest question for agency owners:\n\n"
            "How long from assessment to signed agreement at your shop?\n\n"
            "Hours, days, or weeks?"
        ),
    },
    {
        "id": "e07",
        "topic": "Lost billables",
        "pillar": "How it works",
        "linkedin": (
            "The billable that gets mentioned once, late in the visit, is the one that never makes the invoice.\n\n"
            "Bathing help. Transportation. A meal reminder said in passing.\n\n"
            "Which service do you suspect slips through most often on your team?"
        ),
        "threads": (
            "Which billable slips through most often when someone is writing notes from memory?\n\n"
            "Bathing, meals, transportation, or something else?"
        ),
    },
    {
        "id": "e08",
        "topic": "New hire burnout",
        "pillar": "Time and relief",
        "linkedin": (
            "New assessors rarely burn out on the visits.\n\n"
            "They burn out learning your forms, your templates, and your after-hours typing habit.\n\n"
            "When you onboard a new nurse, what takes longer to teach: the clinical judgment or the paperwork stack?"
        ),
        "threads": (
            "Onboarding a new home care assessor:\n\n"
            "What is harder to teach, clinical judgment or your paperwork stack?"
        ),
    },
    {
        "id": "e09",
        "topic": "State rules",
        "pillar": "Trust and safety",
        "linkedin": (
            "50 states plus DC means a lot of different expectations for a home care service agreement.\n\n"
            "Generic templates fail quietly. The draft looks fine until someone checks the wrong clause.\n\n"
            "How do you handle state specific language today: lawyer review, shared template, or something else?"
        ),
        "threads": (
            "Home care contracts across states:\n\n"
            "How do you handle state specific language today?\n\n"
            "Lawyer review, shared template, or something else?"
        ),
    },
    {
        "id": "e10",
        "topic": "Typing is not care",
        "pillar": "Time and relief",
        "linkedin": (
            "Typing is not care.\n\n"
            "Families pay for the human work. The after-hours keyboard is the unpaid job that burns good people out.\n\n"
            "If you could delete one documentation task from your team's week without touching care quality, which task goes first?"
        ),
        "threads": (
            "If you could delete one paperwork task from your week without hurting care quality, which one goes first?"
        ),
    },
    {
        "id": "e11",
        "topic": "AI drafts humans decide",
        "pillar": "Trust and safety",
        "linkedin": (
            "AI drafts. Caregivers decide.\n\n"
            "That sentence is the whole safety model I will defend in public.\n\n"
            "Where do you still want a human mandatory checkpoint in your documentation flow?"
        ),
        "threads": (
            "AI drafts. Caregivers decide.\n\n"
            "Where should a human checkpoint stay mandatory in your documentation flow?"
        ),
    },
    {
        "id": "e12",
        "topic": "Sunday nights",
        "pillar": "Time and relief",
        "linkedin": (
            "Sunday night is still a documentation shift for too many home care teams.\n\n"
            "Laptop open. Cold coffee. Notes that should have been finished after the visit.\n\n"
            "What does your team's typical Sunday night look like right now?"
        ),
        "threads": (
            "Home care folks:\n\n"
            "What does Sunday night look like on your team right now?\n\n"
            "Done, or still catching up on notes?"
        ),
    },
    {
        "id": "e13",
        "topic": "Phone assessments",
        "pillar": "How it works",
        "linkedin": (
            "Not every assessment happens on a couch.\n\n"
            "Phone intakes and reassessments are real. The paperwork pile after them is the same.\n\n"
            "What share of your assessments happen by phone versus in the home?"
        ),
        "threads": (
            "Rough split at your agency:\n\n"
            "What percent of assessments are phone versus in-home?"
        ),
    },
    {
        "id": "e14",
        "topic": "EHR companion",
        "pillar": "How it works",
        "linkedin": (
            "Most home care software gives your team a better place to type.\n\n"
            "Scheduling. EVV. Care management. Useful tools. The typing stays.\n\n"
            "Are you looking for another system of record, or something that removes a documentation step?"
        ),
        "threads": (
            "When you shop home care software, are you hunting for:\n\n"
            "A) Another place to type\n"
            "B) A way to delete a documentation step\n\n"
            "Which one?"
        ),
    },
    {
        "id": "e15",
        "topic": "Owner math",
        "pillar": "Proof",
        "linkedin": (
            "3 assessments a week at 2 hours of paperwork each is 312 hours a year.\n\n"
            "That is 39 working days per assessor spent retyping conversations that already happened.\n\n"
            "If you ran that math on your team last month, what number did you get?"
        ),
        "threads": (
            "Do the math for your team:\n\n"
            "Assessments per week times hours of after-visit paperwork.\n\n"
            "What yearly number do you land on?"
        ),
    },
    {
        "id": "e16",
        "topic": "Family waiting",
        "pillar": "Proof",
        "linkedin": (
            "A delayed contract is not just a slow PDF.\n\n"
            "It is a family comparing you to the agency that already put a clear agreement in their hands.\n\n"
            "When families wait on paperwork, what usually causes the delay on your side?"
        ),
        "threads": (
            "When a family waits on the agreement, what usually causes the delay?\n\n"
            "Staffing, templates, review, or something else?"
        ),
    },
    {
        "id": "e17",
        "topic": "Control",
        "pillar": "Trust and safety",
        "linkedin": (
            "You stay in control is not a slogan. It is a product requirement.\n\n"
            "Edit the draft. Reject a line. Send only when it matches the visit you ran.\n\n"
            "Which edit do coordinators make most often on AI-assisted drafts in your world: services, hours, rates, or language?"
        ),
        "threads": (
            "If AI drafts a care packet, what do coordinators edit most?\n\n"
            "Services, hours, rates, or wording?"
        ),
    },
    {
        "id": "e18",
        "topic": "Reassessments",
        "pillar": "How it works",
        "linkedin": (
            "Reassessments create the same paperwork pile as first visits, then people treat them like busywork.\n\n"
            "That is how plans drift away from what the client actually needs.\n\n"
            "How often do you reassess, and what is the hardest part of that cycle?"
        ),
        "threads": (
            "Reassessment cycle question:\n\n"
            "What is the hardest part, scheduling the visit or finishing the paperwork after?"
        ),
    },
    {
        "id": "e19",
        "topic": "Fear of AI",
        "pillar": "Trust and safety",
        "linkedin": (
            "The fear I hear most is that AI will replace caregivers.\n\n"
            "That fear is pointed at the wrong job. Caregiving is the human work families pay for. "
            "The replaceable job is retyping the visit.\n\n"
            "What is the real AI fear inside your agency right now: job loss, wrong documents, or something else?"
        ),
        "threads": (
            "Honest AI fear check for home care teams:\n\n"
            "Is it job loss, wrong documents, or something else?"
        ),
    },
    {
        "id": "e20",
        "topic": "Intake day",
        "pillar": "Time and relief",
        "linkedin": (
            "Intake day is loud. The paperwork after it does not have to be.\n\n"
            "The bottleneck is rarely the conversation. It is turning that conversation into a packet someone can send.\n\n"
            "On a busy intake week, where does work pile up first for you?"
        ),
        "threads": (
            "Busy intake week:\n\n"
            "Where does work pile up first, the visits or the paperwork after?"
        ),
    },
    {
        "id": "e21",
        "topic": "Coordinator queue",
        "pillar": "Trust and safety",
        "linkedin": (
            "A review queue is how you keep speed and accountability in the same product.\n\n"
            "AI can draft fast. Your people still own what leaves the building.\n\n"
            "Who should own final approval at your agency: the assessor, a coordinator, or an owner?"
        ),
        "threads": (
            "Who should own final approval before a packet goes to a family?\n\n"
            "Assessor, coordinator, or owner?"
        ),
    },
    {
        "id": "e22",
        "topic": "Vendor questions",
        "pillar": "Trust and safety",
        "linkedin": (
            "Five questions I would ask any home care AI vendor:\n\n"
            "1. What reaches a family before human review?\n"
            "2. Can I see who said what in the source transcript?\n"
            "3. How do you handle state specific contract language?\n"
            "4. What can a coordinator edit before send?\n"
            "5. What data stays under the agency's control?\n\n"
            "Which question would you add as number six?"
        ),
        "threads": (
            "What is the one question you always ask AI vendors in home care before you trust a draft?"
        ),
    },
    {
        "id": "e23",
        "topic": "Same day proposal",
        "pillar": "Proof",
        "linkedin": (
            "Same-day proposal ready used to sound aggressive. Now it sounds like competitive hygiene.\n\n"
            "Families do not pause their search because your team needs two more nights with a laptop.\n\n"
            "Have you ever lost a client mainly because another agency got the paperwork there first?"
        ),
        "threads": (
            "Have you ever lost a client mainly because another agency got the paperwork there first?\n\n"
            "Yes, no, or not sure?"
        ),
    },
    {
        "id": "e24",
        "topic": "Build with us feedback",
        "pillar": "Build together",
        "linkedin": (
            "Tell me what broke in your paperwork week.\n\n"
            "Not the polished version. The ugly version. Wrong template. Missed billable. Sunday catch-up. "
            "A draft that felt unsafe to send.\n\n"
            "What is the one paperwork failure that still happens too often on your team?"
        ),
        "threads": (
            "Ugly paperwork question:\n\n"
            "What failure still happens too often on your team?\n\n"
            "Wrong template, missed billable, Sunday catch-up, or unsafe-feeling draft?"
        ),
    },
    {
        "id": "e25",
        "topic": "Minutes not hours",
        "pillar": "Proof",
        "linkedin": (
            "Minutes, not hours, is the only documentation claim that matters after a real visit.\n\n"
            "If a tool still leaves your nurse with an evening of cleanup, it did not solve the job.\n\n"
            "What is a realistic target for post-visit documentation time on your team?"
        ),
        "threads": (
            "Realistic target for post-visit documentation time on your team?\n\n"
            "Under 15 minutes, under an hour, or still measured in hours?"
        ),
    },
    {
        "id": "e26",
        "topic": "Multi location",
        "pillar": "Build together",
        "linkedin": (
            "Multi-location agencies do not need another slide deck.\n\n"
            "They need one live workflow that coordinators in every office can trust, with the same review rules.\n\n"
            "If you run more than one office, what breaks first when you try to standardize documentation?"
        ),
        "threads": (
            "Multi-office home care:\n\n"
            "What breaks first when you try to standardize documentation across locations?"
        ),
    },
    {
        "id": "e27",
        "topic": "Never auto send",
        "pillar": "Trust and safety",
        "linkedin": (
            "I keep a public list of things that should never auto-send in home care AI.\n\n"
            "Contracts. Care plans. Anything with hours and rates. Anything a family will sign.\n\n"
            "What else belongs on that never-auto-send list?"
        ),
        "threads": (
            "Never auto-send list for home care AI:\n\n"
            "Contracts and care plans are already on mine.\n\n"
            "What else belongs there?"
        ),
    },
    {
        "id": "e28",
        "topic": "Audit ready",
        "pillar": "Trust and safety",
        "linkedin": (
            "When someone asks for the packet, you should not dig through three folders and a text thread.\n\n"
            "Transcript, plan, billables, agreement. One client. One place.\n\n"
            "How long does it take your team to pull a complete assessment packet today?"
        ),
        "threads": (
            "How long to pull a complete assessment packet when someone asks for it?\n\n"
            "Minutes, hours, or it depends who is in the office?"
        ),
    },
    {
        "id": "e29",
        "topic": "Founder evenings",
        "pillar": "Build together",
        "linkedin": (
            "I did not start PALM because documentation software was missing a feature.\n\n"
            "I started it because good caregivers were losing evenings to work that was already spoken out loud.\n\n"
            "If you built tools for home care, what problem would you refuse to ignore?"
        ),
        "threads": (
            "If you built tools for home care, what problem would you refuse to ignore?"
        ),
    },
    {
        "id": "e30",
        "topic": "Friday clock out",
        "pillar": "Time and relief",
        "linkedin": (
            "Friday clock-out is a culture test.\n\n"
            "If the packet is unfinished, the weekend is unfinished. If review happened during the week, "
            "people leave on time.\n\n"
            "Did your team's paperwork leave when they did last Friday?"
        ),
        "threads": (
            "Last Friday check:\n\n"
            "Did your team's paperwork leave when they did, or did it follow them home?"
        ),
    },
]


def by_id(eid: str) -> dict[str, str] | None:
    for row in ENGAGEMENT:
        if row["id"] == eid:
            return row
    return None
