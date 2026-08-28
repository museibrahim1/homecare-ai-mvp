"""Engagement talking points for LinkedIn company Page + Threads.

APPROVAL ONLY. Never auto-post.

LinkedIn destination: Palm Technologies company Page only
(LINKEDIN_ORGANIZATION_ID). Never Muse's personal profile.
Personal LinkedIn is for Muse's own non-PalmCare credibility posts.

LinkedIn length: multi-paragraph, founder-voice for the brand Page,
specific refusals and product facts, one real question at the end.
Studied from approved Palm founder calendar copy and Page voice.

Threads stay shorter but still complete thoughts, not one-liners.
"""
from __future__ import annotations

ENGAGEMENT: list[dict[str, str]] = [
    {
        "id": "e01",
        "topic": "Why agencies talked to me",
        "pillar": "Why I built this",
        "linkedin": (
            "Every home care agency I talked to before building Palm told me some version of the same thing.\n\n"
            "They got into this business to care for people, not to fight paperwork every night after the visits were done.\n\n"
            "That is still the whole reason Palm exists. Our ethos is not a slide in a deck. It shows up in what we refuse to build. "
            "We will not add features that make the product look bigger while making the owner's job harder to understand. "
            "We will not promise things we cannot deliver. No EVV. No billing processing. No scheduling.\n\n"
            "We do one job and we do it clean. Record the assessment. Generate the care plan and billables. Generate the contract. "
            "A human on your team still reviews before anything goes to a family.\n\n"
            "Integrity to me means the customer's win has to be our win, in that order. If an agency grows because Palm gave their nurses "
            "back hours in the field instead of hours at a keyboard, we grew for the right reason.\n\n"
            "If you run an agency: what still owns the most evenings on your team right now, and is it care work or retyping?"
        ),
        "threads": (
            "Before I built Palm, every agency said some version of the same thing.\n\n"
            "They got into home care to care for people, not to fight paperwork after the visits were done.\n\n"
            "We still refuse EVV, billing processing, and scheduling. One job: record the assessment, draft the care plan, "
            "billables, and contract, then a human reviews.\n\n"
            "What still owns the most evenings on your team: care work, or retyping?"
        ),
    },
    {
        "id": "e02",
        "topic": "AI will not replace caregivers",
        "pillar": "Trust and safety",
        "linkedin": (
            "\"AI is going to replace the caregivers.\"\n\n"
            "It is the objection I hear most from agency owners, so it is worth answering directly.\n\n"
            "It will not. Caregiving is the human work families are paying for, and no software does that.\n\n"
            "What AI can replace is the two hours of typing that happen after the visit. The assessment was already documented once, "
            "out loud, by the people in the room. Palm listens, then writes the notes, the billables, and the state specific agreement from it. "
            "The caregiver reviews and sends.\n\n"
            "Same care. Same visit. The evening comes back.\n\n"
            "That is also my safety model. Drafts are not done. A person still decides what reaches a family.\n\n"
            "If you run an agency: where does after-visit documentation time actually go for your team today?"
        ),
        "threads": (
            "\"AI is going to replace the caregivers.\"\n\n"
            "I hear that a lot. It is pointed at the wrong job.\n\n"
            "Care is what families pay for. The replaceable job is retyping the visit after it already happened out loud.\n\n"
            "Palm drafts. Your team reviews. Nothing auto-sends to a family.\n\n"
            "Where does after-visit documentation time actually go on your team?"
        ),
    },
    {
        "id": "e03",
        "topic": "Built without a big team",
        "pillar": "Build story",
        "linkedin": (
            "I did not read a thesis about leverage and then decide to build Palm.\n\n"
            "I am the case study. Palm would not exist in its current form without models that can actually do serious product work. "
            "I am one founder. When I started I did not have an engineering org, and I did not have runway to hire the fifteen people "
            "a documentation platform like this would normally take.\n\n"
            "What I had was the ability to ship the assessment engine, the billables logic, and the contract generator myself, "
            "then put a human review step in front of every packet so agencies stay accountable.\n\n"
            "Procurement used to mean buying parts. Now it means buying leverage. The durable part is not the model. "
            "The durable part is the workflow: record what was said, draft from it, keep speakers separate, apply state rules, "
            "and require a coordinator before anything leaves.\n\n"
            "If you are building in home care or evaluating AI vendors: what in your stack would still matter if the models got twice as good tomorrow?"
        ),
        "threads": (
            "Palm started with one founder and no engineering org to lean on.\n\n"
            "The leverage was real. The durable part is still the workflow: record, draft from what was said, "
            "human review, send.\n\n"
            "If models got twice as good tomorrow, what in your agency stack would still matter?"
        ),
    },
    {
        "id": "e04",
        "topic": "Second documentation",
        "pillar": "Time and relief",
        "linkedin": (
            "The most expensive part of a care assessment is the second time it gets documented.\n\n"
            "The first time is free. The client, the family, and the assessor say everything out loud in the room. "
            "The second time costs your best nurse her evening.\n\n"
            "That second pass is how care plans, billables, and service agreements get built in most agencies I talk to. "
            "Not because owners want it that way. Because the tools they bought gave them a better place to type, not a way to stop typing.\n\n"
            "Palm keeps the first documentation and deletes the second. Record the assessment. Review the draft. Send. "
            "Nothing reaches a family until someone on your team clears it.\n\n"
            "If your team still documents every visit twice, what does that second pass cost you in hours each week?"
        ),
        "threads": (
            "Assessments get documented twice.\n\n"
            "Once out loud in the living room. Once again at a keyboard at night.\n\n"
            "Most software sells a better place for the second pass. I built Palm to delete it, with a human still reviewing before send.\n\n"
            "What does that second pass cost your team in hours each week?"
        ),
    },
    {
        "id": "e05",
        "topic": "Nothing leaves without a human",
        "pillar": "Trust and safety",
        "linkedin": (
            "I will not ship a home care product that sends a care plan or a contract to a family before someone on your team reads it.\n\n"
            "Speed without that step is how agencies get burned. Families deserve a packet a coordinator was willing to put their name on. "
            "Your license deserves the same.\n\n"
            "So Palm drafts the transcript, the care plan, the billables, and the state specific agreement from the recording. "
            "Then it sits in a review queue. Edit it. Reject a line. Send only when it matches the visit you ran.\n\n"
            "AI drafts. Caregivers decide. That sentence is the safety model I will defend in public, and I want owners to help me harden it.\n\n"
            "What should never auto-send at your agency, and who should own final approval?"
        ),
        "threads": (
            "Hard line for me: nothing hits a family before a human on your team reads it.\n\n"
            "Palm drafts. Your coordinator edits or rejects. Then send.\n\n"
            "What should never auto-send at your agency, and who owns final approval?"
        ),
    },
    {
        "id": "e06",
        "topic": "Narrow on purpose",
        "pillar": "Product thesis",
        "linkedin": (
            "Most home care software fights for the daytime. Scheduling. EVV. Payroll. Dashboards.\n\n"
            "Useful tools. The unpaid shift is still the evening: retyping the visit into notes, billables, and a service agreement.\n\n"
            "I kept Palm narrow on purpose. We are not trying to become your entire operating system. "
            "We are trying to end the documentation double-entry that sits on top of whatever system you already run.\n\n"
            "Record the assessment. Get a reviewable packet. Keep your scheduler and your EVV if they work for you.\n\n"
            "When you shop tools right now, are you hunting for another system of record, or for fewer hours after the visit?"
        ),
        "threads": (
            "I kept Palm narrow on purpose.\n\n"
            "Not scheduling. Not EVV. Not billing processing. Documentation from the visit, with human review.\n\n"
            "Are you shopping for another system of record, or for fewer hours after the visit?"
        ),
    },
    {
        "id": "e07",
        "topic": "Said once, lost forever",
        "pillar": "Billables",
        "linkedin": (
            "\"She also needs help bathing.\"\n\n"
            "Said once, near the end of the assessment, while somebody was already thinking about the drive to the next house. "
            "In too many agencies that line never makes the invoice. Not because the team is careless. "
            "Because the billable lived in a conversation and died in memory.\n\n"
            "I have watched the same pattern with transportation, meals mentioned in passing, and hours that got rounded down "
            "because nobody wanted to reopen the packet at 9pm.\n\n"
            "Palm prices what was actually said in the recording, then puts it in front of a human before anything goes out. "
            "That review step is how you keep revenue without inventing services.\n\n"
            "Which billable do you suspect slips through most often on your team?"
        ),
        "threads": (
            "The line said once near the end of the visit is the one that never hits the invoice.\n\n"
            "Bathing. Transport. Meals in passing. Hours rounded down at 9pm.\n\n"
            "Palm pulls billables from the recording, then a human reviews.\n\n"
            "Which one do you lose most?"
        ),
    },
    {
        "id": "e08",
        "topic": "New hire paperwork",
        "pillar": "Hiring",
        "linkedin": (
            "New nurses do not burn out on the visits.\n\n"
            "They burn out in week two, when the clinical judgment was fine and the paperwork stack became the real job. "
            "Forms. Templates. Nightly typing of a conversation they already had in the living room.\n\n"
            "When I talk to owners about onboarding, the quiet confession is that training materials teach the visit, "
            "then tribal knowledge teaches the after-hours documentation habit. That habit is how good people leave.\n\n"
            "Palm turns the packet into a draft from the recording so training can become review, not retyping. "
            "A coordinator still approves. The new hire still learns the standard. They just stop bleeding evenings to learn it.\n\n"
            "When you hire, what takes longer to teach: clinical judgment, or your paperwork?"
        ),
        "threads": (
            "New nurses rarely quit because of the visits.\n\n"
            "They quit because week two is forms, templates, and nights of typing what they already said out loud.\n\n"
            "Harder to teach at your agency: clinical judgment, or paperwork?"
        ),
    },
    {
        "id": "e09",
        "topic": "State rules",
        "pillar": "Trust and safety",
        "linkedin": (
            "I do not trust a home care service agreement that is last year's Word doc with a new logo on top.\n\n"
            "Fifty states plus DC do not share one rule book. Agencies that pretend they do get surprised later, "
            "usually when someone actually reads the packet.\n\n"
            "Palm drafts on the state you operate in, from the assessment you recorded. That is slower product work than "
            "a generic template, and it is the only kind I am willing to put in front of a family after a human review.\n\n"
            "Compliance is not a bolt-on feature for us. It is why a coordinator can trust the draft enough to send it the same day.\n\n"
            "How do you handle state specific language today: lawyer review, shared template, or something else?"
        ),
        "threads": (
            "A logo-swapped contract template is a quiet risk.\n\n"
            "States do not share one rule book. Palm drafts on the state you operate in, from the visit, then a human reviews.\n\n"
            "How do you handle state specific language today?"
        ),
    },
    {
        "id": "e10",
        "topic": "First agreement wins",
        "pillar": "Agency ops",
        "linkedin": (
            "In private duty, the agency that puts a clear agreement in front of the family first usually wins the client.\n\n"
            "I have heard owners say they lost a family while the packet was still sitting unfinished. Same visit quality. "
            "Slower paperwork. The other agency got there with something clear enough to sign.\n\n"
            "That is not a vanity metric. That is revenue leaking through documentation lag.\n\n"
            "Palm's answer is not \"send AI garbage faster.\" It is draft from the visit itself, keep a human in the loop, "
            "and get a reviewable packet ready while the coat is still on.\n\n"
            "What is your average time from assessment to signed agreement right now, and what usually causes the delay?"
        ),
        "threads": (
            "Private duty reality: the first clear agreement usually wins the client.\n\n"
            "I have heard owners lose families to slower paperwork, not worse care.\n\n"
            "How long from assessment to signature at your shop, and what causes the delay?"
        ),
    },
    {
        "id": "e11",
        "topic": "Three voices",
        "pillar": "Trust and safety",
        "linkedin": (
            "A good care assessment has three voices in one room.\n\n"
            "The nurse asking careful questions. The client answering about their real day. "
            "The family adding what they are scared of when nobody else is looking.\n\n"
            "If your notes mash that into one anonymous block of text, you lose accountability. "
            "You also lose the ability to explain later why a service, an hour count, or a safety note is in the plan.\n\n"
            "Palm keeps speakers separate in the transcript so the care plan and the contract are built from what was actually said, "
            "not from what somebody reconstructed at 9pm. Then a human still reviews before send.\n\n"
            "Do your notes keep speakers separate today, or is it one merged paragraph?"
        ),
        "threads": (
            "Nurse. Client. Family.\n\n"
            "If notes mash those voices into one blob, you lose the thread when someone asks why a line is in the plan.\n\n"
            "Do your notes keep speakers separate today?"
        ),
    },
    {
        "id": "e12",
        "topic": "Sunday nights",
        "pillar": "Time and relief",
        "linkedin": (
            "Sunday night with a laptop open is not culture.\n\n"
            "It is unfinished documentation from a week of visits that were already spoken out loud. "
            "Cold coffee. Three notes left. A contract that should have been reviewable on Friday.\n\n"
            "I built Palm so that pile can shrink before the weekend starts. Record during the week. "
            "Review while the context is fresh. Keep Sunday.\n\n"
            "That only works if the draft is trustworthy enough that a coordinator will clear it. "
            "Which is why the review queue is not optional in our product.\n\n"
            "What does Sunday night look like on your team right now?"
        ),
        "threads": (
            "Sunday night laptop open is not culture. It is unfinished documentation from the week.\n\n"
            "I built Palm so review can happen while the visit is still fresh, with a human still clearing the packet.\n\n"
            "What does Sunday look like on your team?"
        ),
    },
    {
        "id": "e13",
        "topic": "Aging care is the work",
        "pillar": "Why this market",
        "linkedin": (
            "Home care is not a side quest for AI. It is the work.\n\n"
            "More older adults every year. Not enough caregivers. Millions of family members already doing unpaid coordination. "
            "And the software stack still asks nurses to retype the visit after they already did the hard human part.\n\n"
            "I am not interested in building another chatbot that sits next to the real job. "
            "I am interested in the unsexy packet: transcript, care plan, billables, contract, reviewed by a person who owns the outcome.\n\n"
            "If Palm helps an agency keep a good nurse, or get a clear agreement in front of a family the same day, that is the win.\n\n"
            "What part of that stack hurts your agency most right now?"
        ),
        "threads": (
            "Home care is not a side quest for AI.\n\n"
            "More older adults. Not enough caregivers. Software that still makes people retype the visit.\n\n"
            "I am building the packet: transcript, plan, billables, contract, human review.\n\n"
            "What hurts most at your agency right now?"
        ),
    },
    {
        "id": "e14",
        "topic": "Talk to owners",
        "pillar": "Build together",
        "linkedin": (
            "I am not interested in performing founder content.\n\n"
            "I am interested in what broke in your paperwork this week. Wrong template. Missed billable. "
            "Notes finished on Sunday. A draft that felt unsafe to send. A family waiting while two offices argued about wording.\n\n"
            "YC-style advice that actually stuck with me is simple: talk to users constantly. So I am asking you, not a slide deck.\n\n"
            "We build the safety bar with agency owners. What should never auto-send. What a coordinator must always check. "
            "What families deserve to see before they sign.\n\n"
            "If you tried AI for documentation and bounced, what made you stop? I read every reply."
        ),
        "threads": (
            "Skip the founder theater.\n\n"
            "I want the ugly paperwork failure from your week, or the reason you bounced off AI documentation tools.\n\n"
            "What made you stop, or what still makes you mad?"
        ),
    },
    {
        "id": "e15",
        "topic": "Owner math",
        "pillar": "Proof",
        "linkedin": (
            "3 assessments a week at 2 hours of paperwork each is 312 hours a year.\n\n"
            "That is 39 working days per assessor spent retyping conversations that already happened. "
            "For a team of five, you are funding roughly 195 days of transcription labor nobody puts in the budget.\n\n"
            "I run that math with owners because it explains burnout better than any feature list. "
            "It also explains why \"type faster\" tools never feel like relief. The line item is still there.\n\n"
            "Palm's pitch is not that AI is impressive. It is that this line item can go toward zero while a human still approves the packet.\n\n"
            "If you did that math last month, what number did you get?"
        ),
        "threads": (
            "3 assessments a week times 2 hours of paperwork is 312 hours a year.\n\n"
            "Nobody budgets for it. It still shows up in burnout.\n\n"
            "If you ran that math on your team, what number did you get?"
        ),
    },
    {
        "id": "e16",
        "topic": "Multi office",
        "pillar": "Build together",
        "linkedin": (
            "Multi-location agencies do not need another pitch deck from me.\n\n"
            "They need one workflow every coordinator can trust, with the same review rules in every office. "
            "Same expectations for what gets drafted from a visit. Same rule that nothing reaches a family before a human clears it.\n\n"
            "When documentation is tribal knowledge, each location invents its own night shift. "
            "That is how quality drifts and how good people burn out at different speeds under the same logo.\n\n"
            "Our demo is built for that conversation. Live assessment to reviewable packet. State rules. Permissions. Rollout questions. No theater.\n\n"
            "If you run more than one office, what breaks first when you try to standardize documentation?"
        ),
        "threads": (
            "Multi-office home care does not need another deck.\n\n"
            "It needs one documentation workflow and one review rule every coordinator can trust.\n\n"
            "What breaks first when you try to standardize across locations?"
        ),
    },
    {
        "id": "e17",
        "topic": "Never auto-send list",
        "pillar": "Trust and safety",
        "linkedin": (
            "I keep a public never-auto-send list for home care AI on purpose.\n\n"
            "Care plans. Contracts. Anything with hours and rates. Anything a family will sign. "
            "Anything that could move money or create a care obligation without a human checkpoint.\n\n"
            "If a vendor cannot tell you what is on their never-auto-send list, they are asking you to discover it the hard way.\n\n"
            "Palm drafts fast. The review queue is the product. Edit. Reject. Send only when it matches the visit.\n\n"
            "What else belongs on your never-auto-send list, and who owns the final click?"
        ),
        "threads": (
            "My never-auto-send list: care plans, contracts, hours, rates, anything a family signs.\n\n"
            "If a vendor has no list, you will find out the hard way.\n\n"
            "What else belongs on yours, and who owns the final click?"
        ),
    },
    {
        "id": "e18",
        "topic": "Find the packet",
        "pillar": "Ops reality",
        "linkedin": (
            "When someone asks for the packet, you should not dig through email, Drive, and a text thread from Tuesday.\n\n"
            "Transcript. Care plan. Billables. Agreement. One client. One place. Ready when compliance asks, "
            "or when a family asks, or when a new coordinator inherits the case.\n\n"
            "The hunt for documents is not a small annoyance. It is how hours disappear on days that already felt full.\n\n"
            "Palm organizes the packet from the recording so the review step and the archive step are the same workflow.\n\n"
            "How long does it take your team to pull a complete assessment packet today?"
        ),
        "threads": (
            "When someone asks for the packet, you should not dig through email, Drive, and a text thread.\n\n"
            "How long does that hunt take on your team today?"
        ),
    },
    {
        "id": "e19",
        "topic": "Phone assessments",
        "pillar": "How the work happens",
        "linkedin": (
            "Not every assessment happens on a couch.\n\n"
            "Phone intakes and reassessments are real. The paperwork pile after them is the same mess, "
            "sometimes worse, because the conversation was thinner and the memory is thinner too.\n\n"
            "Palm treats those visits the same way. Record the call. Draft the packet from what was said. "
            "Keep a human in the loop before anything goes out.\n\n"
            "If your tools only work for living-room assessments, they were not built for how home care actually runs.\n\n"
            "What share of your assessments are phone versus in the home?"
        ),
        "threads": (
            "Not every assessment is on a couch. Phone intakes count, and the paperwork after them is still real.\n\n"
            "What share of your assessments are phone versus in-home?"
        ),
    },
    {
        "id": "e20",
        "topic": "Friday leave",
        "pillar": "Time and relief",
        "linkedin": (
            "Friday clock-out is a culture test.\n\n"
            "If the packet is unfinished, the weekend is unfinished. If review happened during the week while the visit was fresh, "
            "people leave on time and the family still gets a clean agreement.\n\n"
            "I care about that more than I care about looking busy on LinkedIn. "
            "Palm is built so the draft exists before the weekend starts, and so a coordinator still has to clear it.\n\n"
            "Did your team's paperwork leave when they did last Friday, or did it follow them home?"
        ),
        "threads": (
            "Friday clock-out is a test.\n\n"
            "If the packet is unfinished, the weekend is unfinished.\n\n"
            "Did paperwork leave when your team did last Friday, or follow them home?"
        ),
    },
]


def by_id(eid: str) -> dict[str, str] | None:
    for row in ENGAGEMENT:
        if row["id"] == eid:
            return row
    return None
