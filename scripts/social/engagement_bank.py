"""Engagement talking points for LinkedIn + Threads.

APPROVAL ONLY. Never auto-post.
Written in Muse's voice: first person, short sentences, home care specifics.
Inspired by live founder discourse (YC RFS themes: aging care, trust, earnest building).
Not copied from anyone. No AI filler.

Voice rules:
- I / we when it is Muse speaking
- One idea per sentence
- Concrete home care detail, not abstract AI talk
- End with one real question he would actually ask an owner
- No em dashes, no slash bait, no "like if you agree", no numbered vendor quizzes
"""
from __future__ import annotations

ENGAGEMENT: list[dict[str, str]] = [
    {
        "id": "e01",
        "topic": "The visit was already written",
        "pillar": "Why I built this",
        "linkedin": (
            "I keep coming back to the same weird fact.\n\n"
            "The assessment was already documented. Out loud. In the room. "
            "Then we make a nurse type it again at night.\n\n"
            "If you run an agency, does that second pass still own your evenings?"
        ),
        "threads": (
            "Weird fact I cannot shake:\n\n"
            "The visit was already written out loud. Then we type it again at night.\n\n"
            "Does that second pass still own your evenings?"
        ),
    },
    {
        "id": "e02",
        "topic": "Human before the family",
        "pillar": "Trust and safety",
        "linkedin": (
            "I will not ship a tool that sends a care plan or a contract to a family "
            "before someone on your team reads it.\n\n"
            "AI can draft. A person still decides.\n\n"
            "Where do you draw that line at your agency?"
        ),
        "threads": (
            "My hard line: nothing hits a family before a human on your team reads it.\n\n"
            "Where do you draw that line?"
        ),
    },
    {
        "id": "e03",
        "topic": "Ask owners, not the timeline",
        "pillar": "Build together",
        "linkedin": (
            "I am not interested in performing founder content.\n\n"
            "I am interested in what broke in your paperwork this week. "
            "Wrong template. Missed billable. Notes finished on Sunday.\n\n"
            "What failed on your team lately that still makes you mad?"
        ),
        "threads": (
            "Skip the founder theater.\n\n"
            "What paperwork failure on your team still makes you mad?"
        ),
    },
    {
        "id": "e04",
        "topic": "Aging care is the job",
        "pillar": "Why this market",
        "linkedin": (
            "Home care is not a side quest for AI. It is the work.\n\n"
            "More older adults. Not enough caregivers. Families already doing unpaid coordination. "
            "And the software still asks nurses to retype the visit.\n\n"
            "What part of that stack hurts your agency most right now?"
        ),
        "threads": (
            "More older adults. Not enough caregivers. Software that still makes you retype the visit.\n\n"
            "What hurts most at your agency right now?"
        ),
    },
    {
        "id": "e05",
        "topic": "Three voices",
        "pillar": "Trust and safety",
        "linkedin": (
            "A good assessment has three voices.\n\n"
            "The nurse asking. The client answering. The family adding what they are scared of.\n\n"
            "If your notes mash that into one anonymous block, you lose the thread.\n\n"
            "Do your notes keep speakers separate today?"
        ),
        "threads": (
            "Nurse. Client. Family.\n\n"
            "Do your notes keep those voices separate, or mash them together?"
        ),
    },
    {
        "id": "e06",
        "topic": "First agreement wins",
        "pillar": "Agency ops",
        "linkedin": (
            "In private duty, the first clear agreement in front of the family usually wins them.\n\n"
            "I hear owners say they lost clients while the packet was still sitting in a Word doc.\n\n"
            "How long does assessment to signature take for you right now?"
        ),
        "threads": (
            "Private duty question:\n\n"
            "How long from assessment to signed agreement at your shop?"
        ),
    },
    {
        "id": "e07",
        "topic": "Said once",
        "pillar": "Billables",
        "linkedin": (
            "The line that gets said once near the end of the visit is the one that never hits the invoice.\n\n"
            "I have watched that happen with bathing help, transportation, meals said in passing.\n\n"
            "Which one do you think your team loses most?"
        ),
        "threads": (
            "Said once at the end of the visit. Gone from the invoice.\n\n"
            "What do you lose most: bathing, transport, meals, or something else?"
        ),
    },
    {
        "id": "e08",
        "topic": "New nurses and forms",
        "pillar": "Hiring",
        "linkedin": (
            "New nurses do not quit because of the visits.\n\n"
            "They quit because week two is forms, templates, and nights of typing what they already said out loud.\n\n"
            "When you hire, what takes longer to teach: the clinical judgment or your paperwork?"
        ),
        "threads": (
            "New hire reality:\n\n"
            "Harder to teach, clinical judgment or your paperwork stack?"
        ),
    },
    {
        "id": "e09",
        "topic": "State rules are not a logo swap",
        "pillar": "Trust and safety",
        "linkedin": (
            "I do not trust a home care contract that is just last year's Word doc with a new logo.\n\n"
            "States do not share one rule book. Agencies that pretend they do get surprised later.\n\n"
            "How do you handle state specific language today?"
        ),
        "threads": (
            "Hot take: a logo-swapped contract template is a quiet risk.\n\n"
            "How do you handle state specific language today?"
        ),
    },
    {
        "id": "e10",
        "topic": "Typing is not care",
        "pillar": "Caregiver first",
        "linkedin": (
            "Typing is not care.\n\n"
            "Families pay for the human work. The keyboard shift after the visit is the unpaid job.\n\n"
            "If you could cut one paperwork task this month and keep care the same, what goes?"
        ),
        "threads": (
            "Typing is not care.\n\n"
            "One paperwork task you would cut tomorrow if care quality stayed the same?"
        ),
    },
    {
        "id": "e11",
        "topic": "Do not build on a model trick",
        "pillar": "Trust and safety",
        "linkedin": (
            "If the next model update makes your product weaker, you built on a trick.\n\n"
            "If it makes you stronger, you built on a real workflow.\n\n"
            "For me that workflow is record, draft, human review, send.\n\n"
            "What part of your stack would still matter if the models got twice as good tomorrow?"
        ),
        "threads": (
            "If models got twice as good tomorrow, what part of your agency stack would still matter?"
        ),
    },
    {
        "id": "e12",
        "topic": "Sunday laptop",
        "pillar": "Time and relief",
        "linkedin": (
            "Sunday night with a laptop open is not culture. It is unfinished documentation from the week.\n\n"
            "I built PALM so that pile can shrink before the weekend starts.\n\n"
            "What does Sunday look like on your team right now?"
        ),
        "threads": (
            "Sunday night laptop open: culture, or unfinished notes from the week?\n\n"
            "What does yours look like?"
        ),
    },
    {
        "id": "e13",
        "topic": "Phone visits count",
        "pillar": "How the work happens",
        "linkedin": (
            "Not every assessment is on a couch.\n\n"
            "Phone intakes and reassessments are real. The paperwork after them is the same mess.\n\n"
            "What share of your assessments are phone versus in the home?"
        ),
        "threads": (
            "Rough split:\n\n"
            "Phone assessments versus in-home at your agency?"
        ),
    },
    {
        "id": "e14",
        "topic": "Better place to type",
        "pillar": "Product thesis",
        "linkedin": (
            "Most home care software sells you a better place to type.\n\n"
            "Schedulers. EVV. Dashboards. Useful. The typing stays.\n\n"
            "I am building the opposite: delete the retyping.\n\n"
            "Are you shopping for another system of record, or for fewer hours after the visit?"
        ),
        "threads": (
            "Are you shopping for another place to type, or for fewer hours after the visit?"
        ),
    },
    {
        "id": "e15",
        "topic": "312 hours",
        "pillar": "Owner math",
        "linkedin": (
            "3 assessments a week. 2 hours of paperwork each. That is 312 hours a year.\n\n"
            "I run that math with owners because nobody budgets for it, and it still shows up in burnout.\n\n"
            "If you did that math last month, what number did you get?"
        ),
        "threads": (
            "Assessments per week times hours of after-visit paperwork.\n\n"
            "What yearly number do you land on?"
        ),
    },
    {
        "id": "e16",
        "topic": "Family waiting",
        "pillar": "Agency ops",
        "linkedin": (
            "A delayed contract is not just a slow PDF.\n\n"
            "It is a family still calling other agencies while your packet sits unfinished.\n\n"
            "When paperwork lags on your side, what usually causes it?"
        ),
        "threads": (
            "When the family is waiting on the agreement, what usually causes the delay?"
        ),
    },
    {
        "id": "e17",
        "topic": "Edit before send",
        "pillar": "Trust and safety",
        "linkedin": (
            "You stay in control means you can change the draft before it leaves.\n\n"
            "Hours. Services. Rate. Wording. Reject the whole thing if it is wrong.\n\n"
            "On AI-assisted drafts, what do your coordinators change most?"
        ),
        "threads": (
            "On AI-assisted drafts, what do coordinators change most: hours, services, rate, or wording?"
        ),
    },
    {
        "id": "e18",
        "topic": "Reassessment pile",
        "pillar": "How the work happens",
        "linkedin": (
            "Reassessments create the same paperwork pile as first visits.\n\n"
            "Then people treat them like busywork, and the plan drifts away from the client.\n\n"
            "What is harder for you: getting the reassessment scheduled, or finishing the packet after?"
        ),
        "threads": (
            "Reassessments:\n\n"
            "Harder to schedule the visit, or finish the packet after?"
        ),
    },
    {
        "id": "e19",
        "topic": "Wrong fear",
        "pillar": "Trust and safety",
        "linkedin": (
            "The fear I hear most is that AI will replace caregivers.\n\n"
            "I think that fear is pointed at the wrong job. Care is the work families pay for. "
            "The replaceable job is retyping the visit.\n\n"
            "What is the real AI fear inside your agency: job loss, wrong documents, or something else?"
        ),
        "threads": (
            "Real AI fear at your agency:\n\n"
            "Job loss, wrong documents, or something else?"
        ),
    },
    {
        "id": "e20",
        "topic": "Intake week",
        "pillar": "Time and relief",
        "linkedin": (
            "Intake week is loud.\n\n"
            "The bottleneck is rarely the conversation. It is turning that conversation into a packet "
            "someone can send without staying up late.\n\n"
            "On a busy week, where does work pile up first for you?"
        ),
        "threads": (
            "Busy intake week:\n\n"
            "Does work pile up on the visits, or on the paperwork after?"
        ),
    },
    {
        "id": "e21",
        "topic": "Who approves",
        "pillar": "Trust and safety",
        "linkedin": (
            "Speed is useless if the wrong person is accountable.\n\n"
            "I want a review queue. A named human. Then send.\n\n"
            "At your agency, who should own final approval: assessor, coordinator, or owner?"
        ),
        "threads": (
            "Who should own final approval before a packet goes to a family?\n\n"
            "Assessor, coordinator, or owner?"
        ),
    },
    {
        "id": "e22",
        "topic": "Talk to users",
        "pillar": "Build together",
        "linkedin": (
            "YC-style advice that actually stuck with me: talk to users constantly.\n\n"
            "So I am asking you, not a slide deck.\n\n"
            "If you tried AI for documentation and bounced, what made you stop?"
        ),
        "threads": (
            "If you tried AI for documentation and bounced, what made you stop?"
        ),
    },
    {
        "id": "e23",
        "topic": "Lost to paperwork speed",
        "pillar": "Agency ops",
        "linkedin": (
            "I have heard owners say they lost a client because another agency got the agreement there first.\n\n"
            "Same visit quality. Slower packet.\n\n"
            "Has that happened to you?"
        ),
        "threads": (
            "Have you lost a client mainly because another agency got the paperwork there first?"
        ),
    },
    {
        "id": "e24",
        "topic": "Ugly version",
        "pillar": "Build together",
        "linkedin": (
            "Tell me the ugly version of your paperwork week.\n\n"
            "Not the polished ops story. The one with sticky notes, shared drives, and a nurse texting "
            "a rate at 8pm.\n\n"
            "What still happens too often on your team?"
        ),
        "threads": (
            "Ugly paperwork week. No polish.\n\n"
            "What still happens too often on your team?"
        ),
    },
    {
        "id": "e25",
        "topic": "Minutes after the visit",
        "pillar": "Product bar",
        "linkedin": (
            "Minutes after the visit is the only documentation bar I respect.\n\n"
            "If a tool still leaves your nurse with an evening of cleanup, it did not solve the job.\n\n"
            "What target would you set for post-visit documentation time?"
        ),
        "threads": (
            "What target would you set for post-visit documentation time?\n\n"
            "Be honest."
        ),
    },
    {
        "id": "e26",
        "topic": "Multi office",
        "pillar": "Build together",
        "linkedin": (
            "Multi-office agencies do not need another pitch deck from me.\n\n"
            "They need one workflow every coordinator can trust, with the same review rules.\n\n"
            "If you run more than one location, what breaks first when you try to standardize documentation?"
        ),
        "threads": (
            "Multi-office:\n\n"
            "What breaks first when you try to standardize documentation?"
        ),
    },
    {
        "id": "e27",
        "topic": "Never auto-send",
        "pillar": "Trust and safety",
        "linkedin": (
            "My never-auto-send list is short on purpose.\n\n"
            "Care plans. Contracts. Anything with hours and rates. Anything a family signs.\n\n"
            "What else belongs on that list for you?"
        ),
        "threads": (
            "Never auto-send: care plans, contracts, hours, rates, anything a family signs.\n\n"
            "What else belongs on your list?"
        ),
    },
    {
        "id": "e28",
        "topic": "Find the packet",
        "pillar": "Ops reality",
        "linkedin": (
            "When someone asks for the packet, you should not dig through email, Drive, and a text thread.\n\n"
            "Transcript. Plan. Billables. Agreement. One client.\n\n"
            "How long does that hunt take on your team today?"
        ),
        "threads": (
            "How long to pull a complete assessment packet when someone asks for it?"
        ),
    },
    {
        "id": "e29",
        "topic": "Why I started",
        "pillar": "Why I built this",
        "linkedin": (
            "I did not start PALM because documentation software needed another feature.\n\n"
            "I started it because good caregivers were losing evenings to work that was already spoken out loud.\n\n"
            "If you built tools for home care, what problem would you refuse to ignore?"
        ),
        "threads": (
            "I started PALM because evenings were getting eaten by typing what was already said.\n\n"
            "What problem in home care would you refuse to ignore?"
        ),
    },
    {
        "id": "e30",
        "topic": "Friday leave",
        "pillar": "Time and relief",
        "linkedin": (
            "Friday clock-out is a test.\n\n"
            "If the packet is unfinished, the weekend is unfinished.\n\n"
            "Did your team's paperwork leave when they did last Friday?"
        ),
        "threads": (
            "Last Friday:\n\n"
            "Did paperwork leave when your team did, or follow them home?"
        ),
    },
]


def by_id(eid: str) -> dict[str, str] | None:
    for row in ENGAGEMENT:
        if row["id"] == eid:
            return row
    return None
