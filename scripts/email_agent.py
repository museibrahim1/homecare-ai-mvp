#!/usr/bin/env python3
"""
Email Agent — Fetches leads from the PalmCare API, drafts personalized outreach
emails using Claude, and saves them for review before sending.

Usage:
    from email_agent import EmailAgent
    agent = EmailAgent()
    agent.draft_investor_emails()   # Draft emails for new investors
    agent.draft_agency_emails()     # Draft emails for new agencies
    agent.list_drafts()             # Show all pending drafts
    agent.approve_and_send("id")    # Send a single draft
    agent.approve_all()             # Send all pending drafts

CLI:
    python3 scripts/email_agent.py --draft-investors
    python3 scripts/email_agent.py --draft-agencies
    python3 scripts/email_agent.py --list-drafts
    python3 scripts/email_agent.py --approve-all
    python3 scripts/email_agent.py --approve <draft_id>
"""

import os
import sys
import json
import uuid
import logging
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger("email_agent")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DRAFTS_DIR = Path.home() / ".palmcare" / "email-drafts"

SENDER_EMAIL = "PalmCare AI <onboarding@resend.dev>"
SIGNATURE = """
Muse Ibrahim
President & CEO, Palm Technologies, INC.
palmcareai.com | (402) 500-8028
""".strip()


class EmailAgent:
    def __init__(self):
        self.api_base = os.getenv("API_BASE_URL", "https://api-production-a0a2.up.railway.app")
        self.admin_email = os.getenv("ADMIN_EMAIL", "admin@palmcare.ai")
        self.admin_password = os.getenv("ADMIN_PASSWORD", "")
        self.resend_key = os.getenv("RESEND_API_KEY", "")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        self._token: Optional[str] = None
        DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

    def _authenticate(self) -> bool:
        """Authenticate with the API and get a JWT token."""
        if self._token:
            return True

        if not self.admin_password:
            logger.error("ADMIN_PASSWORD not set. Cannot authenticate.")
            return False

        try:
            resp = requests.post(
                f"{self.api_base}/auth/login",
                json={"email": self.admin_email, "password": self.admin_password},
                timeout=15,
            )
            if resp.status_code == 200:
                self._token = resp.json().get("access_token")
                return True
            logger.error(f"Auth failed: {resp.status_code} {resp.text[:200]}")
            return False
        except Exception as e:
            logger.error(f"Auth error: {e}")
            return False

    def _api_get(self, path: str, params: Optional[dict] = None) -> Optional[dict]:
        if not self._authenticate():
            return None
        try:
            resp = requests.get(
                f"{self.api_base}{path}",
                headers={"Authorization": f"Bearer {self._token}"},
                params=params,
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"API GET {path} failed: {resp.status_code}")
            return None
        except Exception as e:
            logger.error(f"API error: {e}")
            return None

    def _api_patch(self, path: str, data: dict) -> bool:
        if not self._authenticate():
            return False
        try:
            resp = requests.patch(
                f"{self.api_base}{path}",
                headers={"Authorization": f"Bearer {self._token}"},
                json=data,
                timeout=15,
            )
            return resp.status_code in (200, 204)
        except Exception:
            return False

    # -------------------------------------------------------------------------
    # Lead fetching
    # -------------------------------------------------------------------------

    def fetch_investor_leads(self, status: str = "new", limit: int = 50) -> list:
        """Fetch investors with contact emails that match the given status."""
        data = self._api_get("/platform/investors", params={
            "has_email": "true",
            "status": status,
            "limit": limit,
        })
        if not data:
            return []
        leads = data if isinstance(data, list) else data.get("items", data.get("investors", []))
        logger.info(f"Fetched {len(leads)} investor leads (status={status})")
        return leads

    def fetch_agency_leads(self, status: str = "new", limit: int = 50) -> list:
        """Fetch agency leads with contact emails that match the given status."""
        data = self._api_get("/platform/sales/leads", params={
            "has_email": "true",
            "status": status,
            "limit": limit,
        })
        if not data:
            return []
        leads = data if isinstance(data, list) else data.get("items", data.get("leads", []))
        logger.info(f"Fetched {len(leads)} agency leads (status={status})")
        return leads

    # -------------------------------------------------------------------------
    # Email drafting via Claude
    # -------------------------------------------------------------------------

    def _draft_with_claude(self, lead_type: str, lead_data: dict) -> dict:
        """Use Claude to generate a personalized email draft for a lead."""
        if not self.anthropic_key:
            return self._draft_from_template(lead_type, lead_data)

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.anthropic_key)

            if lead_type == "investor":
                prompt = f"""Draft a concise, personalized cold outreach email to this investor about PalmCare AI.

INVESTOR DATA:
- Fund: {lead_data.get('fund_name', 'N/A')}
- Contact: {lead_data.get('contact_name', 'N/A')}
- Email: {lead_data.get('contact_email', 'N/A')}
- Type: {lead_data.get('investor_type', 'N/A')}
- Focus Sectors: {lead_data.get('focus_sectors', 'N/A')}
- Focus Stages: {lead_data.get('focus_stages', 'N/A')}
- Location: {lead_data.get('location', 'N/A')}
- Check Size: {lead_data.get('check_size_display', 'N/A')}
- Relevance: {lead_data.get('relevance_reason', 'N/A')}

ABOUT PALMCARE AI:
- AI-powered home care assessment platform
- Record assessments via voice, auto-generates contracts and clinical notes
- $450K SAFE round, $2.25M post-money valuation
- $92K ARR, cost per assessment ~$0.37
- 50-state compliance knowledge base
- Founder: Muse Ibrahim

INSTRUCTIONS:
- Subject line should reference their fund name
- Opening should reference why they're relevant (their focus/portfolio)
- Keep it under 150 words
- Professional but warm tone
- End with a clear CTA (15-min call)
- Do NOT include a signature (it's added automatically)

Respond in JSON format:
{{"subject": "...", "body_text": "...", "body_html": "..."}}"""
            else:
                services = []
                for svc in ["nursing", "pt", "ot", "st", "aide", "social_work"]:
                    if lead_data.get(f"offers_{svc}"):
                        services.append(svc.upper().replace("_", " "))

                prompt = f"""Draft a concise, personalized cold outreach email to this home care agency about PalmCare AI.

AGENCY DATA:
- Agency: {lead_data.get('provider_name', 'N/A')}
- Contact: {lead_data.get('contact_name', 'N/A')}
- Email: {lead_data.get('contact_email', 'N/A')}
- City: {lead_data.get('city', 'N/A')}
- State: {lead_data.get('state', 'N/A')}
- Services: {', '.join(services) if services else 'N/A'}
- Ownership: {lead_data.get('ownership_type', 'N/A')}
- Star Rating: {lead_data.get('star_rating', 'N/A')}
- Years Operating: {lead_data.get('years_in_operation', 'N/A')}

ABOUT PALMCARE AI:
- AI-powered assessment tool for home care agencies
- Record client assessments via voice, AI auto-generates service contracts and clinical notes
- Reduces assessment time by 80%, eliminates paperwork errors
- 50-state Medicaid/Medicare compliance built-in
- Mobile app for field visits

INSTRUCTIONS:
- Subject line should reference their agency name
- Opening should reference their location or services
- Focus on pain points: paperwork burden, compliance risk, time spent on documentation
- Keep it under 150 words
- Professional but warm tone
- End with a clear CTA (quick demo or 15-min call)
- Do NOT include a signature (it's added automatically)

Respond in JSON format:
{{"subject": "...", "body_text": "...", "body_html": "..."}}"""

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            import re
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
            return {"subject": "PalmCare AI", "body_text": text, "body_html": f"<p>{text}</p>"}

        except Exception as e:
            logger.warning(f"Claude drafting failed: {e}. Falling back to template.")
            return self._draft_from_template(lead_type, lead_data)

    def _draft_from_template(self, lead_type: str, lead_data: dict) -> dict:
        """Fallback template-based email drafting when Claude is unavailable."""
        if lead_type == "investor":
            name = lead_data.get("fund_name", "there")
            contact = lead_data.get("contact_name", "")
            greeting = f"Hi {contact.split()[0]}," if contact else f"Hi,"

            subject = f"{name} x PalmCare AI — AI for Home Care Assessments"
            body = f"""{greeting}

I'm Muse Ibrahim, founder of PalmCare AI. We're building AI-powered assessment tools for home care agencies — voice-recorded assessments that auto-generate contracts and clinical notes in seconds.

We're raising a $450K SAFE at a $2.25M post-money valuation, with $92K ARR and growing. Given {name}'s focus in healthcare and technology, I'd love to share more.

Would you have 15 minutes this week for a quick call?"""
        else:
            name = lead_data.get("provider_name", "there")
            contact = lead_data.get("contact_name", "")
            city = lead_data.get("city", "")
            state = lead_data.get("state", "")
            greeting = f"Hi {contact.split()[0]}," if contact else f"Hi,"
            location = f" in {city}, {state}" if city and state else ""

            subject = f"{name} — quick question about your assessments"
            body = f"""{greeting}

I noticed {name}{location} and wanted to reach out. We built PalmCare AI specifically for agencies like yours — it lets your caregivers record client assessments by voice and automatically generates service contracts and clinical notes.

Agencies using PalmCare cut assessment time by 80% and eliminate compliance paperwork errors. It works on mobile so your team can use it during home visits.

Would you be open to a quick 15-minute demo?"""

        body_html = body.replace("\n\n", "</p><p>").replace("\n", "<br>")
        body_html = f"<p>{body_html}</p>"

        return {"subject": subject, "body_text": body, "body_html": body_html}

    # -------------------------------------------------------------------------
    # Draft management
    # -------------------------------------------------------------------------

    def _save_draft(self, lead_type: str, lead: dict, email_content: dict) -> dict:
        """Save a single email draft."""
        lead_id = lead.get("id", str(uuid.uuid4()))
        draft_id = f"{lead_type}_{lead_id}"

        draft = {
            "id": draft_id,
            "lead_type": lead_type,
            "lead_id": lead_id,
            "lead_name": lead.get("fund_name") or lead.get("provider_name", "Unknown"),
            "to_email": lead.get("contact_email", ""),
            "to_name": lead.get("contact_name", ""),
            "subject": email_content.get("subject", ""),
            "body_text": email_content.get("body_text", ""),
            "body_html": email_content.get("body_html", ""),
            "status": "pending_review",
            "created_at": datetime.now().isoformat(),
            "approved_at": None,
            "sent_at": None,
        }

        filepath = DRAFTS_DIR / f"{draft_id}.json"
        filepath.write_text(json.dumps(draft, indent=2))
        return draft

    def draft_investor_emails(self, status: str = "new", limit: int = 50) -> list:
        """Fetch investor leads and draft personalized emails for each."""
        leads = self.fetch_investor_leads(status=status, limit=limit)
        if not leads:
            logger.info("No investor leads found.")
            return []

        drafts = []
        for lead in leads:
            if not lead.get("contact_email"):
                continue
            existing = DRAFTS_DIR / f"investor_{lead.get('id', '')}.json"
            if existing.exists():
                logger.info(f"Draft already exists for {lead.get('fund_name')}. Skipping.")
                continue

            email_content = self._draft_with_claude("investor", lead)
            draft = self._save_draft("investor", lead, email_content)
            drafts.append(draft)
            logger.info(f"Drafted email for investor: {lead.get('fund_name')} -> {lead.get('contact_email')}")

        if drafts:
            self._send_summary_notification(drafts)

        return drafts

    def draft_agency_emails(self, status: str = "new", limit: int = 50) -> list:
        """Fetch agency leads and draft personalized emails for each."""
        leads = self.fetch_agency_leads(status=status, limit=limit)
        if not leads:
            logger.info("No agency leads found.")
            return []

        drafts = []
        for lead in leads:
            if not lead.get("contact_email"):
                continue
            existing = DRAFTS_DIR / f"agency_{lead.get('id', '')}.json"
            if existing.exists():
                logger.info(f"Draft already exists for {lead.get('provider_name')}. Skipping.")
                continue

            email_content = self._draft_with_claude("agency", lead)
            draft = self._save_draft("agency", lead, email_content)
            drafts.append(draft)
            logger.info(f"Drafted email for agency: {lead.get('provider_name')} -> {lead.get('contact_email')}")

        if drafts:
            self._send_summary_notification(drafts)

        return drafts

    def list_drafts(self, status: Optional[str] = None) -> list:
        """List all email drafts, optionally filtered by status."""
        drafts = []
        for f in sorted(DRAFTS_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                if status and data.get("status") != status:
                    continue
                drafts.append(data)
            except Exception:
                pass
        return drafts

    def approve_and_send(self, draft_id: str) -> dict:
        """Approve and send a single draft email."""
        filepath = DRAFTS_DIR / f"{draft_id}.json"
        if not filepath.exists():
            return {"error": f"Draft not found: {draft_id}"}

        draft = json.loads(filepath.read_text())
        if draft.get("status") == "sent":
            return {"error": "Draft already sent"}

        result = self._send_via_resend(draft)

        if result.get("status") == "sent":
            draft["status"] = "sent"
            draft["approved_at"] = datetime.now().isoformat()
            draft["sent_at"] = datetime.now().isoformat()
            draft["resend_id"] = result.get("id")
            filepath.write_text(json.dumps(draft, indent=2))

            lead_path = f"/platform/investors/{draft['lead_id']}" if draft["lead_type"] == "investor" else f"/platform/sales/leads/{draft['lead_id']}"
            self._api_patch(lead_path, {"status": "email_sent"})

        return result

    def approve_all(self) -> list:
        """Approve and send all pending drafts."""
        pending = self.list_drafts(status="pending_review")
        results = []
        for draft in pending:
            result = self.approve_and_send(draft["id"])
            results.append({"draft_id": draft["id"], "to": draft["to_email"], **result})
        return results

    def _send_via_resend(self, draft: dict) -> dict:
        """Send an email via Resend API."""
        if not self.resend_key:
            return {"status": "failed", "error": "RESEND_API_KEY not set"}

        body_html = draft.get("body_html", "")
        if SIGNATURE not in body_html:
            sig_html = SIGNATURE.replace("\n", "<br>")
            body_html += f"<br><br>—<br>{sig_html}"

        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {self.resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": SENDER_EMAIL,
                    "to": [draft["to_email"]],
                    "subject": draft["subject"],
                    "html": body_html,
                },
                timeout=15,
            )
            if resp.status_code in (200, 201):
                return {"status": "sent", "id": resp.json().get("id")}
            return {"status": "failed", "error": resp.text[:200]}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    def _send_summary_notification(self, drafts: list):
        """Send a summary email of new drafts to support@palmtai.com."""
        if not self.resend_key:
            logger.warning("Cannot send summary: RESEND_API_KEY not set")
            return

        rows = ""
        for d in drafts:
            rows += f"""<tr>
                <td style="padding:8px;border:1px solid #ddd">{d['lead_type'].title()}</td>
                <td style="padding:8px;border:1px solid #ddd">{d['lead_name']}</td>
                <td style="padding:8px;border:1px solid #ddd">{d['to_email']}</td>
                <td style="padding:8px;border:1px solid #ddd">{d['subject']}</td>
            </tr>"""

        html = f"""<h2>New Email Drafts Ready for Review</h2>
<p>{len(drafts)} new email draft(s) have been generated and are waiting for your approval.</p>
<table style="border-collapse:collapse;width:100%">
    <tr style="background:#0d9488;color:white">
        <th style="padding:8px;border:1px solid #ddd">Type</th>
        <th style="padding:8px;border:1px solid #ddd">Lead</th>
        <th style="padding:8px;border:1px solid #ddd">Email</th>
        <th style="padding:8px;border:1px solid #ddd">Subject</th>
    </tr>
    {rows}
</table>
<br>
<p>To review and approve:</p>
<pre>
aitask --list-drafts           # View all pending drafts
aitask --approve-emails        # Approve and send all
</pre>
<p>Or approve individually: <code>python3 scripts/email_agent.py --approve &lt;draft_id&gt;</code></p>
"""

        try:
            requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {self.resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": SENDER_EMAIL,
                    "to": ["support@palmtai.com"],
                    "subject": f"[Email Agent] {len(drafts)} new draft(s) ready for review",
                    "html": html,
                },
                timeout=15,
            )
        except Exception as e:
            logger.error(f"Failed to send summary notification: {e}")

    # -------------------------------------------------------------------------
    # Display helpers
    # -------------------------------------------------------------------------

    def print_drafts(self, status: Optional[str] = None):
        """Pretty-print all drafts to stdout."""
        drafts = self.list_drafts(status=status)
        if not drafts:
            print("No email drafts found.")
            return

        pending = [d for d in drafts if d["status"] == "pending_review"]
        sent = [d for d in drafts if d["status"] == "sent"]

        if pending:
            print(f"\n{'='*60}")
            print(f"  PENDING REVIEW ({len(pending)} drafts)")
            print(f"{'='*60}")
            for d in pending:
                print(f"\n  ID: {d['id']}")
                print(f"  To: {d['to_name']} <{d['to_email']}>")
                print(f"  Lead: {d['lead_name']} ({d['lead_type']})")
                print(f"  Subject: {d['subject']}")
                print(f"  Created: {d['created_at']}")
                print(f"  ---")
                preview = d.get("body_text", "")[:200]
                print(f"  {preview}...")

        if sent:
            print(f"\n{'='*60}")
            print(f"  SENT ({len(sent)} emails)")
            print(f"{'='*60}")
            for d in sent:
                print(f"  [{d['sent_at'][:10]}] {d['lead_name']} -> {d['to_email']}")

        print(f"\nTotal: {len(pending)} pending, {len(sent)} sent")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    agent = EmailAgent()

    if "--draft-investors" in sys.argv:
        drafts = agent.draft_investor_emails()
        print(f"\nDrafted {len(drafts)} investor email(s).")
        agent.print_drafts(status="pending_review")

    elif "--draft-agencies" in sys.argv:
        drafts = agent.draft_agency_emails()
        print(f"\nDrafted {len(drafts)} agency email(s).")
        agent.print_drafts(status="pending_review")

    elif "--list-drafts" in sys.argv or "--list" in sys.argv:
        agent.print_drafts()

    elif "--approve-all" in sys.argv or "--approve-emails" in sys.argv:
        results = agent.approve_all()
        for r in results:
            status = r.get("status", "unknown")
            print(f"  [{status.upper()}] {r.get('draft_id')} -> {r.get('to')}")
        print(f"\nProcessed {len(results)} draft(s).")

    elif "--approve" in sys.argv:
        idx = sys.argv.index("--approve")
        if idx + 1 < len(sys.argv):
            draft_id = sys.argv[idx + 1]
            result = agent.approve_and_send(draft_id)
            print(f"Result: {json.dumps(result, indent=2)}")
        else:
            print("Usage: --approve <draft_id>")

    else:
        print("Email Agent — Draft and send outreach emails from lead lists")
        print()
        print("Usage:")
        print("  python3 scripts/email_agent.py --draft-investors     Draft emails for new investors")
        print("  python3 scripts/email_agent.py --draft-agencies      Draft emails for new agencies")
        print("  python3 scripts/email_agent.py --list-drafts         List all drafts")
        print("  python3 scripts/email_agent.py --approve-all         Approve and send all pending")
        print("  python3 scripts/email_agent.py --approve <id>        Approve and send one draft")
