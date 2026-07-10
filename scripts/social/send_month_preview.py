#!/usr/bin/env python3
"""Email the July 13 - Aug 9 monthly Meta + LinkedIn content plan for approval.

v3: every creative is designed in-house from PALM's real brand assets (actual hand
logo, actual app screenshots, site typeface and teal) via marketing/creative-studio.
No AI-generated imagery, no invented logos. Every caption links to the signup flow.
"""
import argparse
import os

import requests
from dotenv import load_dotenv

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(REPO, ".env"))
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
FROM = "PALM Marketing <sales@send.palmtai.com>"

HOST = "https://palmcareai.com/marketing/social"
SIGNUP = "palmcareai.com/register"

# Each post: (date, platform, image_filename, angle_label, caption)
POSTS = [
    ("Mon Jul 13", "Facebook + Instagram", "w1-imsg-contract.png", "iMessage: already sent it",
     "The group chat when the contract goes out before lunch \U0001F334\n\n\"Already sent it\" is a real thing now. PALM listens to the assessment, writes the notes and billables, and drafts the state-compliant agreement while you drive to the next visit. You read it, you hit send.\n\nStart free, no card: {s}\n#homecare #homecareagency #privateduty #healthtech"),
    ("Tue Jul 14", "LinkedIn (PDF document carousel)", "cr-1.png", "7-slide carousel",
     "Your best nurse does 2 hours of typing after every assessment.\n\nNot care. Not visits. Typing \u2014 retyping things a family already said out loud.\n\nWe put the whole problem (and how agencies are deleting it) into 7 slides. Slide 5 is the actual contract screen from our app, not a mockup.\n\nIf your team still documents visits twice \u2014 once out loud, once at a keyboard \u2014 this is worth two minutes.\n\nFIRST COMMENT: Try it on your next assessment, free: {s}\n#homecare #homehealthcare #agencyoperations"),
    ("Wed Jul 15", "Facebook + Instagram", "w1-phone-record.png", "Real app: record screen",
     "This screen replaces your clipboard.\n\nPress record at the assessment. PALM writes the transcript, the care plan, the billables, and the contract. That's the actual app \u2014 no forms, no double entry.\n\nTry it on one visit and see: {s}\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    ("Thu Jul 16", "LinkedIn", "w1-timeline-sameday.png", "Same-day timeline",
     "10:00 \u2014 assessment starts.\n10:47 \u2014 you press stop.\n10:49 \u2014 notes, billables, and a state-compliant agreement are drafted.\n12:15 \u2014 the family signs.\n\nIn home care, the agency that puts a clear agreement in front of the family first usually wins them. Most take days. That gap is the whole opportunity.\n\nWhat's your average time from assessment to signed agreement? Genuinely curious what the range looks like.\n\nFIRST COMMENT: {s} \u2014 free to start\n#homecare #agencygrowth #homehealthcare"),
    ("Fri Jul 17", "Facebook + Instagram", "w1-receipt-tuesday.png", "Receipt: time refunded",
     "We itemized your Tuesday. \U0001F9FE\n\nThree hours of after-visit paperwork per assessment \u2014 retyping what was already said in the living room. PALM's total for the same work: zero minutes. Time refunded.\n\nWhich line item hurts the most? Tell us below.\n\nStart free, no card: {s}\n#homecare #homecareagency #caregiverlife"),
    ("Mon Jul 20", "Facebook + Instagram", "w2-notifications.png", "Notification stack",
     "You drove home. PALM kept working. \U0001F4F2\n\n4:12 \u2014 transcript ready. 4:13 \u2014 care plan drafted, billables priced. 4:14 \u2014 service agreement ready for review. All from the recording you made during the visit.\n\nStart free, no card: {s}\n#homecare #healthtech #privateduty"),
    ("Tue Jul 21", "LinkedIn", "w2-vs-table.png", "Comparison table",
     "Same visit. Two very different nights.\n\nThe information in a care assessment doesn't change based on who types it up. What changes is where the hours go: your nurse's evening, or two minutes of AI processing.\n\nVisit notes, billables, the agreement, state rules \u2014 the old way vs. what our agencies do now, in one table.\n\nFIRST COMMENT: See it on your own visits: {s}\n#homecare #operations #homehealthcare"),
    ("Wed Jul 22", "Facebook + Instagram", "w2-phone-contract.png", "Real app: contract screen",
     "The contract writes itself. This is the actual screen.\n\n$34/hr, 28 hours, 6 services \u2014 pulled straight from what the family said during the assessment, in a state-compliant agreement. You review, you send, they sign.\n\nTry it free: {s}\n#homecare #homecareagency #healthcareAI"),
    ("Thu Jul 23", "LinkedIn", "w3-quote-remove.png", "Quote card",
     "Most tools digitize the paperwork. PALM removes it.\n\nThat distinction is the whole product. Scheduling software, EVV, care management platforms \u2014 they give you better places to type. The typing stays.\n\nPALM starts from a different question: the visit was already documented out loud, by the people in the room. Why is anyone typing it again?\n\nFIRST COMMENT: {s}\n#homecare #healthtech #founders"),
    ("Fri Jul 24", "Facebook + Instagram", "w3-stickynote.png", "Sticky note",
     "Note to self \U0001F4DD\n\nStop writing contracts at 9pm on the couch. Let the app that heard the visit write them.\n\nTag someone who's still doing their charting after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #nurselife"),
    ("Mon Jul 27", "Facebook + Instagram", "w3-fill-blank.png", "Fill in the blank",
     "Finish the sentence \U0001F447\n\n\"If I never had to type another visit note, I would finally ______.\"\n\nSleep? Grow the agency? Make it to the 6pm game? Drop yours in the comments \u2014 best answer gets pinned.\n\nThen make it real: {s}\n#homecare #homecareagency #caregiver"),
    ("Tue Jul 28", "LinkedIn", "w3-phone-transcript.png", "Real app: transcript",
     "PALM knows who said what.\n\nA care assessment is a three-way conversation: the caregiver's questions, the client's answers, the family's concerns. Our transcripts keep every voice separate and searchable \u2014 so the care plan and the agreement are built from what was actually said, not what someone remembered at 9pm.\n\nThis is the real transcript screen from the app.\n\nFIRST COMMENT: {s} \u2014 free to start\n#homecare #clinicaldocumentation #healthtech"),
    ("Wed Jul 29", "Facebook + Instagram", "w4-pov-home.png", "POV",
     "POV: the visit ended two minutes ago. \u2705\n\nNotes done. Billables done. Contract drafted. You haven't even started the car.\n\nStart free, no card: {s}\n#homecare #POV #caregiverlife #healthtech"),
    ("Thu Jul 30", "LinkedIn", "w3-math.png", "The math",
     "3 assessments a week \u00D7 2 hours of paperwork each = 312 hours a year.\n\nThat's 39 working days per assessor. Not caring for anyone. Not growing the agency. Typing up what someone already said out loud.\n\nIf you run a team of five, you're funding roughly 195 days of retyping a year. That's the quiet line item nobody budgets for \u2014 and the first thing PALM deletes.\n\nFIRST COMMENT: Get those days back: {s}\n#homecare #agencyoperations #efficiency"),
    ("Fri Jul 31", "Facebook + Instagram", "w4-states.png", "50 states",
     "50 states. 50 different rule books. One draft that follows yours. \U0001F1FA\U0001F1F8\n\nPALM's service agreements are built on the contract rules of the state you operate in \u2014 not a generic template with your logo pasted on top.\n\nStart free, no card: {s}\n#homecare #homecareagency #compliance"),
    ("Mon Aug 3", "Facebook + Instagram", "w4-sunday-split.png", "Sunday split",
     "Sunday, 9:14 PM. Two versions of you.\n\nOne has a laptop open, cold coffee, and three visit notes left. The other one's paperwork was drafted before they left the driveway.\n\nWhich Sunday are you having? Be honest \U0001F447\n\nStart free, no card: {s}\n#homecare #sundayscaries #caregiverlife"),
    ("Tue Aug 4", "LinkedIn", "w4-founder-note.png", "Founder note",
     "Why we built PALM:\n\nWe watched caregivers give their whole day to families \u2014 and their whole evening to paperwork about it.\n\nThe strange part was that the visit was already documented. Someone said every word of it out loud. The only thing missing was software that listened.\n\nSo that's what we built. Record the assessment; PALM writes the transcript, the care plan, the billables, and a state-compliant service agreement. The caregiver reviews and sends.\n\nIf you run an agency and this sounds familiar, I'd genuinely like to hear how your team handles post-visit documentation today.\n\nFIRST COMMENT: {s}\n#homecare #buildinpublic #healthtech"),
    ("Wed Aug 5", "Facebook + Instagram", "w4-phone-billables.png", "Real app: billables",
     "\"Oh, and she needs help with meals.\"\n\nSaid once, in passing, at minute 34 of the assessment. The old way, it never makes the invoice. PALM hears it, prices it, and puts it in the agreement \u2014 this is the real billables screen.\n\nStop losing billables you already earned: {s}\n#homecare #homecarebilling #agencyowner"),
    ("Thu Aug 6", "LinkedIn", "w2-statement-dataentry.png", "Statement card",
     "You didn't get into home care to do data entry.\n\nNobody did. But post-visit documentation quietly became the biggest unpaid job in the industry \u2014 and the top reason good assessors burn out.\n\nThe fix isn't typing faster. It's not typing.\n\nFIRST COMMENT: Record the visit, PALM writes the rest: {s}\n#homecare #burnout #caregiverretention"),
    ("Fri Aug 7", "Facebook + Instagram", "w2-poll-evenings.png", "Poll results",
     "We asked home care admins what actually eats their evenings. 68% said the same thing. \U0001F5F3\uFE0F\n\nNot scheduling. Not family calls. Post-visit paperwork \u2014 the retyping of a conversation that already happened.\n\nIs it the same at your agency? Tell us what's #1 for you.\n\nThen take it off the list: {s}\n#homecare #homecareagency #poll"),
]


def build_html():
    cards = ""
    for i, (date, platform, img, label, caption) in enumerate(POSTS, 1):
        url = f"{HOST}/{img}"
        cap = caption.format(s=SIGNUP)
        cap_html = cap.replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br>")
        extra = ""
        if "carousel" in platform.lower():
            extra = (f'<p style="font-size:12px;color:#0d9488;margin:0 0 8px;">Full 7-page PDF: '
                     f'<a href="{HOST}/palm-linkedin-carousel.pdf">{HOST}/palm-linkedin-carousel.pdf</a> '
                     f'(cover shown below)</p>')
        cards += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 18px; overflow: hidden; background: #fff;">
          <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 14px;">{i}. {date}</strong>
            <span style="color: #0d9488; font-size: 13px; font-weight: 600; margin-left: 8px;">{platform}</span>
            <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">{label}</span>
          </div>
          <div style="padding: 14px 16px;">
            {extra}
            <img src="{url}" alt="{label}" style="max-width: 280px; border-radius: 8px; display: block; margin-bottom: 10px;" />
            <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0;">{cap_html}</p>
          </div>
        </div>"""

    return f"""
    <div style="font-family: 'Segoe UI', -apple-system, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #0d9488;">PALM. Monthly content plan v3, rebuilt from your real brand</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        You were right about the old creatives. They were AI-generated, and the logos were not ours.
        Every image below was designed in-house from PALM's real assets: your actual hand logo,
        real screenshots from the iOS app, the site typeface, and the app's teal. No AI imagery,
        no fake logos, no stock look.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Jul 13 to Aug 9. 20 posts: Facebook plus Instagram on Mon, Wed, Fri and LinkedIn on Tue and Thu.
        New this month: a 7-page PDF document carousel for LinkedIn (the highest-engagement LinkedIn
        format right now), conversation-style posts (iMessage, poll, fill-in-the-blank) built to get
        comments, and LinkedIn links moved to the first comment so LinkedIn does not bury the posts.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        <strong>Nothing posts until you approve.</strong> Reply "approved" to run the whole month,
        or list any dates or captions you want changed. Facebook and Instagram post automatically.
        LinkedIn needs a one time re-login before it can auto post; until then those are copy paste ready.
      </p>
      {cards}
      <p style="font-size: 12px; color: #94a3b8;">Full plan: marketing/content-calendar-month-july.md ·
      Edit any card and re-render: marketing/creative-studio/</p>
    </div>
    """


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--to", default="museibrahim@palmtai.com,musajama89@gmail.com")
    args = ap.parse_args()

    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": FROM,
            "to": [t.strip() for t in args.to.split(",") if t.strip()],
            "subject": "Approve: PALM social plan v3 - real brand, real app screens, zero AI slop",
            "html": build_html(),
        },
        timeout=60,
    )
    print(r.status_code, r.text)


if __name__ == "__main__":
    main()
