#!/usr/bin/env python3
"""Email the July 13 - Aug 9 monthly Meta + LinkedIn content plan for approval.

Every post has a UNIQUE creative and a UNIQUE message. Every caption links to the
signup flow at palmcareai.com/register.
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
    ("Mon Jul 13", "Facebook + Instagram", "ad-same-day-contract-1x1.png", "Same day contract",
     "Assessment at 10am. Signed contract by lunch. \U0001F590\nPALM records the visit, writes the notes and billables, and drafts a state compliant service agreement while you drive to the next client. The family says yes while they're still sure.\nStart free, no card: {s}\n#homecare #homecareagency #healthtech #privateduty"),
    ("Tue Jul 14", "LinkedIn", "ad-win-clients-16x9.png", "Win the client",
     "In home care, speed wins clients.\n\nA family calling you is calling two other agencies the same afternoon. The one that puts a clear service agreement in front of them first usually signs them.\n\nMost agencies take two to five days to turn an assessment into a contract. PALM does it before the assessor is back in the car: record the visit, and the transcript, billable services, clinical notes, and a state compliant agreement are written automatically.\n\nSame conversation. Same client. Signed days earlier.\n\nStart a free trial: {s}\n#homecare #homehealthcare #agencygrowth"),
    ("Wed Jul 15", "Facebook + Instagram (Reels)", "ad-video-pipeline-frame.png", "Pipeline video",
     "Watch a recorded visit become a contract. \u25B6\uFE0F\nTranscript, billable services, clinical notes, and a ready to sign agreement, all from one recording. No forms, no double entry.\nTry it free: {s}\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    ("Thu Jul 16", "LinkedIn", "ad-one-recording-1x1.png", "Four documents",
     "One recorded assessment produces four finished documents:\n\nA full transcript with speakers identified. Billable services with units and rates. Structured clinical notes. And a service agreement that follows your state's home care rules.\n\nThat's hours of admin per client, gone. Your assessors do the visit; the documentation writes itself.\n\nSee it on your own visits: {s}\n#homecare #efficiency #healthtech"),
    ("Fri Jul 17", "Facebook + Instagram", "ad-evenings-back-9x16.png", "Evenings back",
     "The charting is done. You just left the visit. \U0001F319\nPALM writes the notes, billing, and contract from the recorded assessment, so your evenings belong to you again.\nStart free: {s}\n#caregiver #homecare #worklifebalance #homehealth"),
    ("Mon Jul 20", "Facebook + Instagram", "ad-minutes-not-days-9x16.png", "Days vs minutes",
     "The old way: days of paperwork between \"we'd love your help\" and a signed agreement.\nWith PALM: minutes. \u23F1\uFE0F Families don't wait. Neither should your contracts.\nStart free, no card: {s}\n#homecareagency #seniorcare #healthtech #smallbusiness"),
    ("Tue Jul 21", "LinkedIn", "ad-15-hours-back-1x1.png", "15 hours a week",
     "Ask your team how many hours a week they spend on documentation. For most agencies it lands somewhere around fifteen.\n\nThat's not care work. It's transcribing visits, filling in care plans, and rewriting the same information into a contract. Almost all of it happens after the last visit of the day.\n\nPALM gives those hours back. The visit is recorded once, and the notes, billing, and agreement are written from it automatically.\n\nFewer admin hours, faster contracts, happier staff. {s}\n#homecare #operations #efficiency #healthtech"),
    ("Wed Jul 22", "Facebook + Instagram", "ad-thu-talk-dont-type-9x16.png", "Talk don't type",
     "Talk. Don't type. \U0001F399\uFE0F\nYour assessment is already the data. PALM turns the conversation into notes, billing items, and a contract, so nobody enters anything twice.\nTry it free: {s}\n#homecare #caregiving #AItools #privateduty"),
    ("Thu Jul 23", "LinkedIn", "ad-square-how-it-works.png", "Record, Extract, Contract",
     "How PALM works, in three steps.\n\nRecord the client assessment like a normal conversation. PALM writes the transcript, pulls out billable services with rates, and drafts clinical notes. Then a service agreement aligned with your state's rules is ready to review and send for signature.\n\nNo new forms to learn. No data entry. Built only for US home care, all 50 states.\n\nStart free: {s}\n#homecare #homehealthcare #productivity"),
    ("Fri Jul 24", "Facebook + Instagram", "ad-fri-assessment-1x1.png", "What an assessment captures",
     "What does a complete assessment capture? Care needs, ADLs, medications, safety risks, schedule, and rate. Everything your care plan AND your contract need. \U0001F4CB\nPALM pulls all of it from one recorded conversation.\nStart free: {s}\n#homecare #caregiver #aginginplace #homecarebusiness"),
    ("Mon Jul 27", "Facebook + Instagram", "ad-50-states-1x1.png", "All 50 states",
     "One workflow. All 50 states. \U0001F5FA\uFE0F\nEvery PALM service agreement follows your state's home care rules automatically. No templates to chase, no rewrites when you take a client across the state line.\nStart free: {s}\n#homecare #compliance #homecareagency #healthtech"),
    ("Tue Jul 28", "LinkedIn", "ad-retention-1x1.png", "Retention",
     "Caregiver burnout doesn't start in the client's home. It starts at the kitchen table at 9pm, typing up the day.\n\nAgencies lose good nurses and caregivers to documentation, not to care work. Every hour of after hours charting is an hour closer to a resignation letter.\n\nPALM removes that hour. The visit is recorded once, and the notes, billing, and agreements are written automatically.\n\nKeeping your best people is a growth strategy. {s}\n#caregiverburnout #homecare #retention"),
    ("Wed Jul 29", "Facebook + Instagram (Reels)", "ad-wed-visit-over-9x16.png", "Visit's over",
     "The visit's over. So is your paperwork. \U0001F590\nRecord the assessment, and the documentation is done when you are. No 9pm charting.\nTry it free: {s}\n#homecare #caregiver #burnout #homehealth"),
    ("Thu Jul 30", "LinkedIn", "ad-lost-client-1x1.png", "The lost client",
     "The client you lost last month probably wasn't a bad lead. It was slow paperwork.\n\nHome care is a trust business, and trust has a clock on it. Families are most ready to sign right after the assessment, when they've just met you and felt understood. Three days later they've talked to two other agencies.\n\nPALM makes sure your agreement shows up in that window, not after it closes.\n\nSecure the contract while the trust is fresh. {s}\n#homecare #agencygrowth #sales"),
    ("Fri Jul 31", "Facebook + Instagram", "ad-no-double-entry-1x1.png", "No double entry",
     "Stop typing the same visit into four systems. \U0001F501\nEHR, billing, care plan, contract. PALM fills them all from one recording, so your team enters a visit once and moves on.\nStart free: {s}\n#homecare #homecarebusiness #efficiency #healthtech"),
    ("Mon Aug 3", "Facebook + Instagram", "ad-before-lunch-1x1.png", "Before lunch",
     "New client at 9. Onboarded before lunch. \U0001F55B\nAssessment, care plan, and a signed ready agreement, all before noon. While other agencies are still \"getting the paperwork together,\" yours already sent it.\nStart free: {s}\n#homecareagency #homecare #healthtech #seniorcare"),
    ("Tue Aug 4", "LinkedIn", "ad-out-loud-1x1.png", "Out loud",
     "Your assessors already collect everything you need. They just collect it out loud.\n\nCare needs, medications, schedule, rate. It's all said in the conversation, and then someone types it into three different documents.\n\nPALM ends the retyping. The recorded conversation becomes the transcript, the clinical note, the billing entries, and the service agreement. One source of truth, zero double entry.\n\nEfficiency isn't doing paperwork faster. It's not doing it at all. {s}\n#homecare #operations #healthtech"),
    ("Wed Aug 5", "Facebook + Instagram", "ad-security-1x1.png", "Security",
     "Fast paperwork. Serious security. \U0001F512\nPALM protects every recording and record while it turns visits into documents. HIPAA aligned, 256-bit encryption, built only for home care.\nStart free: {s}\n#homecare #hipaa #healthtech #seniorcare"),
    ("Thu Aug 6", "LinkedIn", "ad-why-we-built-16x9.png", "Why we built it",
     "We built PALM around one observation: in home care, the paperwork is the bottleneck between winning a family's trust and winning their signature.\n\nEverything else in the sales process is human. The referral, the call, the assessment. Then it stalls in documents for days.\n\nSo we automated exactly that part. The assessment recording becomes the notes, the billables, and a state compliant service agreement, ready the same day.\n\nWin the trust, and let the paperwork keep up. {s}\n#homecare #homehealthcare #agencyowners"),
    ("Fri Aug 7", "Facebook + Instagram", "ad-week-with-clients-9x16.png", "Week with clients",
     "Spend the week with clients. Not paperwork. \U0001F590\nOne recorded visit becomes your notes, your billing, and a signed ready contract. Start Monday with people, not forms.\nStart free: {s}\n#homecare #caregiving #homecareagency #healthtech"),
]


def build_html():
    cards = ""
    for i, (date, platform, img, label, caption) in enumerate(POSTS, 1):
        url = f"{HOST}/{img}"
        cap = caption.format(s=SIGNUP)
        cap_html = cap.replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br>")
        cards += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 18px; overflow: hidden; background: #fff;">
          <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 14px;">{i}. {date}</strong>
            <span style="color: #0d9488; font-size: 13px; font-weight: 600; margin-left: 8px;">{platform}</span>
            <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">{label}</span>
          </div>
          <div style="padding: 14px 16px;">
            <img src="{url}" alt="{label}" style="max-width: 260px; max-height: 300px; border-radius: 8px; display: block; margin-bottom: 10px;" />
            <p style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0;">{cap_html}</p>
          </div>
        </div>"""

    return f"""
    <div style="font-family: 'Segoe UI', -apple-system, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #0d9488;">PALM. Monthly content plan for approval</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Jul 13 to Aug 9. 20 posts: Facebook plus Instagram on Mon, Wed, Fri and LinkedIn on Tue and Thu.
        <strong>Every post has its own creative and its own message. Nothing repeats.</strong>
        Ten brand new creatives were made for this month, and every caption links to the signup flow
        at palmcareai.com/register.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        <strong>Nothing posts until you approve.</strong> Reply "approved" to run the whole month,
        or list any dates or captions you want changed. Facebook and Instagram post automatically.
        LinkedIn needs a one time re-login before it can auto post; until then those captions are copy paste ready.
      </p>
      {cards}
      <p style="font-size: 12px; color: #94a3b8;">Full plan in the repo: marketing/content-calendar-month-july.md</p>
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
            "subject": "Approve: PALM social plan Jul 13 to Aug 9 (20 posts, all unique)",
            "html": build_html(),
        },
        timeout=60,
    )
    print(r.status_code, r.text)


if __name__ == "__main__":
    main()
