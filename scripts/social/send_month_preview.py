#!/usr/bin/env python3
"""Email the July 13 - Aug 9 monthly Meta + LinkedIn content plan for approval."""
import argparse
import os

import requests
from dotenv import load_dotenv

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(REPO, ".env"))
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
FROM = "PALM Marketing <sales@send.palmtai.com>"

HOST = "https://palmcareai.com/marketing/social"

CREATIVES = {
    "A": (f"{HOST}/ad-same-day-contract-1x1.png", "Assessment at 10am. Signed contract by lunch"),
    "B": (f"{HOST}/ad-evenings-back-9x16.png", "The charting is done. You just left the visit"),
    "C": (f"{HOST}/ad-win-clients-16x9.png", "The agency that sends the contract first wins"),
    "D": (f"{HOST}/ad-one-recording-1x1.png", "One recording. Four finished documents"),
    "E": (f"{HOST}/ad-minutes-not-days-9x16.png", "Stop losing clients to paperwork"),
    "F": (f"{HOST}/ad-wed-visit-over-9x16.png", "The visit's over. So is your paperwork"),
    "G": (f"{HOST}/ad-thu-talk-dont-type-9x16.png", "Talk. Don't type"),
    "H": (f"{HOST}/ad-fri-assessment-1x1.png", "What one assessment captures"),
    "I": (f"{HOST}/ad-square-how-it-works.png", "Record, Extract, Contract"),
    "J": (f"{HOST}/ad-video-pipeline-frame.png", "Pipeline demo video (9:16)"),
}

# (date, platform, creative key, caption)
POSTS = [
    ("Mon Jul 13", "Facebook + Instagram", "A",
     "Assessment at 10am. Signed contract by lunch. \U0001F590\nThat's the whole pitch. PALM records the visit, writes the notes and billables, and drafts a state compliant service agreement while you drive to the next client.\nThe family says yes while they're still sure. 14 day free trial, no card. Link in bio.\n#homecare #homecareagency #healthtech #privateduty"),
    ("Tue Jul 14", "LinkedIn", "C",
     "In home care, speed wins clients.\n\nA family calling you is calling two other agencies the same afternoon. The agency that puts a clear, professional service agreement in front of them first usually signs them.\n\nMost agencies take two to five days to turn an assessment into a contract. PALM does it before the assessor is back in the car: record the visit, and the transcript, billable services, clinical notes, and a state compliant agreement are written automatically.\n\nSame conversation. Same client. Signed days earlier.\n\n14 day free trial at palmcareai.com.\n#homecare #homehealthcare #healthtech #agencygrowth"),
    ("Wed Jul 15", "Facebook + Instagram (Reels)", "J",
     "Watch a recorded visit become a contract. \u25B6\uFE0F\nTranscript, billable services, clinical notes, and a ready to sign agreement, all from one recording. No forms, no double entry.\nFree for 14 days, no card. Link in bio.\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    ("Thu Jul 16", "LinkedIn", "D",
     "One recorded assessment produces four finished documents:\n\n1. A full transcript with speakers identified\n2. Billable services with units and rates\n3. Structured clinical notes\n4. A service agreement that follows your state's home care rules\n\nThat's hours of admin per client, gone. Your assessors do the visit; the documentation writes itself.\n\nIf your team is still typing up assessments at 9pm, there's a better way. 14 day free trial at palmcareai.com.\n#homecare #efficiency #healthtech"),
    ("Fri Jul 17", "Facebook + Instagram", "B",
     "The charting is done. You just left the visit. \U0001F319\nPALM writes the notes, billing, and contract from the recorded assessment, so your evenings belong to you again.\nTry it free for 14 days. Link in bio.\n#caregiver #homecare #worklifebalance #homehealth"),
    ("Mon Jul 20", "Facebook + Instagram", "E",
     "The old way: days of paperwork between \"we'd love your help\" and a signed agreement.\nWith PALM: minutes. \u23F1\uFE0F\nFamilies don't wait. Neither should your contracts.\n14 day free trial, no card. Link in bio.\n#homecareagency #seniorcare #healthtech #smallbusiness"),
    ("Tue Jul 21", "LinkedIn", "A",
     "A question for agency owners: how long does it take your team to get a service agreement to a new client after the assessment?\n\nIf the answer is more than a day, you're losing clients you already won in the living room. The family liked you. Then three days of paperwork gave them time to keep shopping.\n\nPALM closes that gap. The assessment recording becomes the transcript, care notes, billables, and a signed ready agreement the same day.\n\nFaster contracts, fuller schedules. palmcareai.com\n#homecare #salesvelocity #agencyowners #healthtech"),
    ("Wed Jul 22", "Facebook + Instagram", "G",
     "Talk. Don't type. \U0001F399\uFE0F\nYour assessment is already the data. PALM turns the conversation into notes, billing items, and a contract, so nobody enters anything twice.\nFree 14 day trial. Link in bio.\n#homecare #caregiving #AItools #privateduty"),
    ("Thu Jul 23", "LinkedIn", "I",
     "How PALM works, in three steps:\n\nRecord. Open the app and record the client assessment like a normal conversation.\n\nReview. PALM writes the transcript, pulls out billable services with rates, and drafts clinical notes.\n\nSend. A service agreement aligned with your state's home care rules is ready to review and email for signature.\n\nNo new forms to learn. No data entry. Built only for US home care, all 50 states.\n\n14 day free trial at palmcareai.com.\n#homecare #homehealthcare #productivity"),
    ("Fri Jul 24", "Facebook + Instagram", "H",
     "What does a complete assessment capture? Care needs, ADLs, medications, safety risks, schedule, and rate. Everything your care plan AND your contract need. \U0001F4CB\nPALM pulls all of it from one recorded conversation.\nSave this for your next intake. Free trial. Link in bio.\n#homecare #caregiver #aginginplace #homecarebusiness"),
    ("Mon Jul 27", "Facebook + Instagram", "D",
     "One recording. Four finished documents. \u2705\nTranscript. Billable services. Clinical notes. Service agreement.\nThat's what happens every time your team records a visit with PALM.\n14 days free, no card. Link in bio.\n#homecare #healthtech #efficiency #seniorcare"),
    ("Tue Jul 28", "LinkedIn", "B",
     "Caregiver burnout doesn't start in the client's home. It starts at the kitchen table at 9pm, typing up the day.\n\nAgencies lose good nurses and caregivers to documentation, not to care work. Every hour of after hours charting is an hour closer to a resignation letter.\n\nPALM removes that hour. The visit is recorded once, and the notes, billing, and agreements are written automatically.\n\nKeeping your best people is a growth strategy. palmcareai.com\n#caregiverburnout #homecare #retention #healthtech"),
    ("Wed Jul 29", "Facebook + Instagram (Reels)", "J",
     "It's 9pm. Why are you still charting? \U0001F62E\u200D\U0001F4A8\nThe visit ended at 4. PALM would have finished the documentation before you got to the car.\nGet your evenings back. Free 14 day trial. Link in bio.\n#homecare #caregiver #burnout #homehealth"),
    ("Thu Jul 30", "LinkedIn", "E",
     "The hidden cost of slow paperwork isn't admin hours. It's the client who signed with someone else while your contract sat in a to do pile.\n\nHome care is a trust business, and trust has a clock on it. The family is most ready to sign right after the assessment, when they've just met you and felt understood.\n\nPALM makes sure your agreement shows up in that window, not three days later.\n\nSecure the contract while the trust is fresh. palmcareai.com\n#homecare #agencygrowth #sales #healthtech"),
    ("Fri Jul 31", "Facebook + Instagram", "F",
     "The visit's over. So is your paperwork. \U0001F590\nThat's the deal with PALM. Record the assessment, and the documentation is done when you are.\nTry it free for 14 days. Link in bio.\n#homecare #caregiving #healthcareAI #privateduty"),
    ("Mon Aug 3", "Facebook + Instagram", "A",
     "Morning assessment. Afternoon signature. \U0001F58A\uFE0F\nWhile other agencies are \"getting the paperwork together,\" yours already sent the agreement.\nPALM: record the visit, get the contract. 14 days free. Link in bio.\n#homecareagency #homecare #healthtech #seniorcare"),
    ("Tue Aug 4", "LinkedIn", "G",
     "Your assessors already collect everything you need. They just collect it out loud.\n\nCare needs, medications, schedule, rate. It's all said in the conversation, and then someone types it into three different documents.\n\nPALM ends the retyping. The recorded conversation becomes the transcript, the clinical note, the billing entries, and the service agreement. One source of truth, zero double entry.\n\nEfficiency isn't doing paperwork faster. It's not doing it at all. palmcareai.com\n#homecare #operations #efficiency #healthtech"),
    ("Wed Aug 5", "Facebook + Instagram", "I",
     "Record, Review, Send. That's the whole workflow.\nNo forms to learn. No double entry. Just talk, review, send. \u2705\nBuilt only for US home care, all 50 states.\nFree 14 day trial. Link in bio.\n#homecare #homecarebusiness #AItools #aginginplace"),
    ("Thu Aug 6", "LinkedIn", "C",
     "We built PALM around one observation: in home care, the paperwork is the bottleneck between winning a family's trust and winning their signature.\n\nEverything else in the sales process is human: the referral, the call, the assessment. Then it stalls in documents.\n\nSo we automated exactly that part. The assessment recording becomes the notes, the billables, and a state compliant service agreement, ready the same day.\n\nWin the trust, and let the paperwork keep up. 14 day free trial at palmcareai.com.\n#homecare #homehealthcare #agencyowners #healthtech"),
    ("Fri Aug 7", "Facebook + Instagram", "B",
     "One recorded visit = your notes, your billing, and a signed ready contract. \U0001F590\nSpend next week with clients, not paperwork.\nStart free. Link in bio.\n#homecare #caregiving #homecareagency #healthtech"),
]


def build_html():
    cards = ""
    for date, platform, key, caption in POSTS:
        url, label = CREATIVES[key]
        cap_html = caption.replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br>")
        cards += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 18px; overflow: hidden; background: #fff;">
          <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 14px;">{date}</strong>
            <span style="color: #0d9488; font-size: 13px; font-weight: 600; margin-left: 8px;">{platform}</span>
            <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">Creative {key}: {label}</span>
          </div>
          <div style="padding: 14px 16px;">
            <img src="{url}" alt="Creative {key}" style="max-width: 260px; max-height: 300px; border-radius: 8px; display: block; margin-bottom: 10px;" />
            <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0; white-space: normal;">{cap_html}</p>
          </div>
        </div>"""

    return f"""
    <div style="font-family: 'Segoe UI', -apple-system, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #0d9488;">PALM. Monthly content plan for approval</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Jul 13 to Aug 9. 20 posts: Facebook plus Instagram on Mon, Wed, Fri and LinkedIn on Tue and Thu.
        Messaging focus: time saving, efficiency, and securing contracts faster.
        Five brand new creatives were made for this month, plus the strongest existing ones in rotation.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        <strong>Nothing posts until you approve.</strong> Reply with "approved" to run the whole month,
        or list any dates or captions you want changed. Facebook and Instagram post automatically.
        LinkedIn needs a one time re-login before it can auto post; until then those captions are copy paste ready.
      </p>
      {cards}
      <p style="font-size: 12px; color: #94a3b8;">Full plan saved in the repo: marketing/content-calendar-month-july.md</p>
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
            "subject": "Approve: PALM social plan Jul 13 to Aug 9 (Meta + LinkedIn, 20 posts)",
            "html": build_html(),
        },
        timeout=60,
    )
    print(r.status_code, r.text)


if __name__ == "__main__":
    main()
