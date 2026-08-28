#!/usr/bin/env python3
"""Draft 'one platform' info emails for agency contacts.

Sends review copies to Muse only. Does NOT email the agencies until --send-to-agencies.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
load_dotenv(PROJECT_ROOT / ".env")

from lib.utm import app_link, site  # noqa: E402

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "sales@palmtai.com"
REVIEW_TO = ["museibrahim@palmtai.com"]

IMG = "https://palmcareai.com/screenshots/email"
_S = "border-radius:10px;border:1px solid #e2e8f0;display:block;width:100%;"

TRACK_LOG = PROJECT_ROOT / "scripts" / "email" / ".platform_info_sends.json"
ALERT_TO = ["museibrahim@palmtai.com"]

# Images used in every send (hosted on palmcareai.com)
IMAGES = {
    "home": f"{IMG}/home_dashboard.png",
    "recording": f"{IMG}/recording_screen.png",
    "crm_dashboard": f"{IMG}/crm_dashboard.png",
    "crm_pipeline": f"{IMG}/crm_pipeline.png",
    "crm_clients": f"{IMG}/crm_clients.png",
    "crm_contract": f"{IMG}/crm_contract.png",
}

RECIPIENTS = [
    {
        "to_name": "Nurdennis",
        "to_email": "Familylovebehavioral@gmail.com",
        "agency": "Family Love Behavioral Health Care LLC",
        "city": "Miami",
        "slug": "nurdennis_family_love",
        "subject": "One platform for Family Love: app + CRM",
        "note": (
            "Follow-up for Nurdennis Pena / Family Love Behavioral (Miami). "
            "Prior launch email already went out. Angle: app + CRM as one home-care platform."
        ),
        "opener": (
            "I wanted to follow up with a clearer picture of what PALM actually is for "
            "Family Love Behavioral Health Care in Miami."
        ),
    },
    {
        "to_name": "Wanda",
        "to_email": "Info@ednascarehhc.com",
        "agency": "Edna's Care",
        "city": None,
        "slug": "wanda_ednas_care",
        "subject": "One platform for Edna's Care: app + CRM",
        "note": (
            "Info email for Wanda at Edna's Care (Info@ednascarehhc.com). "
            "Angle: app + CRM as one home-care platform."
        ),
        "opener": (
            "I wanted to share how PALM works for agencies like Edna's Care: "
            "the mobile app and the agency CRM in one home-care platform."
        ),
    },
]


def _links_for(r: dict) -> dict[str, str]:
    slug = r["slug"]
    return {
        "site": site("/", source="email", medium="email", campaign="platform_info", content=f"footer_{slug}"),
        "demo": site("/book-demo", source="email", medium="email", campaign="platform_info", content=f"cta_demo_{slug}"),
        "app": app_link(source="email", medium="email", campaign="platform_info", content=f"cta_app_{slug}"),
        "register": site("/register", source="email", medium="email", campaign="platform_info", content=f"cta_register_{slug}"),
    }


def build_html(r: dict) -> str:
    name = r["to_name"]
    agency = r["agency"]
    opener = r["opener"]
    links = _links_for(r)
    SITE = links["site"]
    DEMO = links["demo"]
    APP = links["app"]
    REGISTER = links["register"]

    return f"""\
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <img src="{IMAGES['crm_dashboard']}" alt="PALM agency dashboard"
         style="width:100%;display:block;border-bottom:1px solid #e2e8f0;" />

    <div style="padding:28px 28px 8px;">
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">Hi {name},</p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">{opener}</p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        Most home care agencies juggle a recording app, a client list, a pipeline board,
        and separate tools for notes and contracts. PALM puts those pieces in one place,
        built for agencies like {agency}.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">On the phone: Palm It</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        Your team records the assessment on iPhone. PALM turns that visit into the transcript,
        care notes, billables, and a state-specific service contract. Four documents from one recording.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="padding:0 20px 8px;">
      <tr>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['home']}" alt="PALM home screen on iPhone" style="{_S}" />
        </td>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['recording']}" alt="Live transcript during a visit" style="{_S}" />
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 8px 12px;font-size:12px;color:#64748b;text-align:center;">
          Home screen with Palm It · Live transcript during the visit
        </td>
      </tr>
    </table>

    <div style="padding:8px 28px 8px;">
      <h2 style="font-size:16px;color:#0f172a;margin:0 0 8px;">In the office: the agency CRM</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        The same account opens on the web for owners and office staff. Clients, deals pipeline,
        assessments, care tracker, ADL logging, proposals, contracts, documents, schedule,
        and team chat live in one dashboard. No hopping between systems.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="padding:0 20px 8px;">
      <tr>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['crm_clients']}" alt="Clients CRM" style="{_S}" />
        </td>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['crm_pipeline']}" alt="Deals pipeline" style="{_S}" />
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 8px 12px;font-size:12px;color:#64748b;text-align:center;">
          Client list · Deals pipeline from intake to active
        </td>
      </tr>
    </table>

    <div style="padding:8px 28px 8px;">
      <img src="{IMAGES['crm_contract']}" alt="Generated service contract" style="{_S}" />
      <p style="font-size:12px;color:#64748b;text-align:center;margin:8px 0 0;">
        Service contract generated from the visit, ready to edit, email, or print
      </p>
    </div>

    <div style="padding:20px 28px 28px;">
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        In short: field staff Palm It on the visit. The office reviews clients, pipeline,
        and paperwork in the CRM. One login. Built for home care.
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 20px;">
        If useful, I can walk you through a 15-minute demo for {agency}, or you can
        download the app and start a free trial.
      </p>

      <div style="text-align:center;margin:0 0 18px;">
        <a href="{DEMO}"
           style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          Book a 15-minute demo
        </a>
      </div>
      <p style="text-align:center;font-size:14px;color:#64748b;margin:0 0 8px;">
        Or <a href="{APP}" style="color:#0d9488;font-weight:600;">download PALM on the App Store</a>
      </p>
      <p style="text-align:center;font-size:14px;color:#64748b;margin:0 0 20px;">
        Prefer the web? <a href="{REGISTER}" style="color:#0d9488;font-weight:600;">Start a free trial at palmcareai.com/register</a>
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Muse Ibrahim</p>
      <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0;">
        Founder, PALM by Palm Technologies<br/>
        <a href="{SITE}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a>
        · <a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a>
      </p>
    </div>
  </div>

  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:14px 0 0;">
    PALM is HIPAA and SOC 2 compliant. Available for iPhone and web.
  </p>
</div>
</body>
</html>"""


def send_email(
    to: list[str],
    subject: str,
    html: str,
    *,
    tags: dict[str, str] | None = None,
) -> tuple[bool, str]:
    payload: dict = {
        "from": FROM,
        "to": to,
        "reply_to": REPLY_TO,
        "subject": subject,
        "html": html,
    }
    if tags:
        # Resend tags: list of {name, value}
        payload["tags"] = [{"name": k, "value": v} for k, v in tags.items()]
    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    if r.status_code in (200, 201):
        return True, r.json().get("id", "?")
    return False, f"{r.status_code} {r.text[:240]}"


def _append_track_log(entry: dict) -> None:
    import json
    from datetime import datetime, timezone

    rows = []
    if TRACK_LOG.exists():
        try:
            rows = json.loads(TRACK_LOG.read_text(encoding="utf-8"))
        except Exception:
            rows = []
    entry["logged_at"] = datetime.now(timezone.utc).isoformat()
    rows.append(entry)
    TRACK_LOG.write_text(json.dumps(rows, indent=2), encoding="utf-8")


def wrap_review(r: dict, html: str) -> str:
    imgs = "".join(
        f'<li style="margin:4px 0;"><code>{k}</code>: {v}</li>'
        for k, v in IMAGES.items()
    )
    return f"""\
<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:16px;margin:0 0 20px;font-family:sans-serif;">
  <p style="margin:0 0 8px;font-weight:700;color:#92400e;font-size:16px;">DRAFT FOR REVIEW — not sent to the agency yet</p>
  <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>To:</strong> {r['to_name']} &lt;{r['to_email']}&gt;</p>
  <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>Agency:</strong> {r['agency']}</p>
  <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>Subject:</strong> {r['subject']}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#92400e;"><em>{r['note']}</em></p>
  <p style="margin:0 0 4px;font-size:13px;color:#78350f;"><strong>Images in this email:</strong></p>
  <ul style="margin:0;padding-left:18px;font-size:12px;color:#78350f;">{imgs}</ul>
</div>
{html}"""


def write_local_previews() -> Path:
    out = PROJECT_ROOT / "marketing" / "email-campaigns" / "platform-info-drafts"
    out.mkdir(parents=True, exist_ok=True)
    for r in RECIPIENTS:
        slug = r["agency"].lower().replace(" ", "-").replace("'", "")
        path = out / f"{slug}.html"
        path.write_text(build_html(r), encoding="utf-8")
    index = out / "index.html"
    links = "".join(
        f'<li><a href="{r["agency"].lower().replace(" ", "-").replace(chr(39), "")}.html">'
        f'{r["to_name"]} @ {r["agency"]}</a> — {r["to_email"]}</li>\n'
        for r in RECIPIENTS
    )
    index.write_text(
        f"""<!doctype html><html><body style="font-family:sans-serif;padding:24px;">
<h1>Platform info email drafts</h1>
<p>Open each file to preview with live images from palmcareai.com.</p>
<ul>{links}</ul>
<h2>Images used</h2>
<ul>
{''.join(f'<li><a href="{v}">{k}</a></li>' for k, v in IMAGES.items())}
</ul>
</body></html>""",
        encoding="utf-8",
    )
    return out


def main() -> None:
    send_to_agencies = "--send-to-agencies" in sys.argv
    dry = "--dry-run" in sys.argv

    out = write_local_previews()
    print(f"Local HTML previews: {out}")
    print("Images:")
    for k, v in IMAGES.items():
        print(f"  - {k}: {v}")

    if dry:
        for r in RECIPIENTS:
            print(f"[dry run] {r['to_name']} <{r['to_email']}> — {r['subject']}")
        return

    if not RESEND_API_KEY:
        print("Missing RESEND_API_KEY")
        sys.exit(1)

    for r in RECIPIENTS:
        html = build_html(r)
        tags = {
            "campaign": "platform_info",
            "contact": r["slug"],
            "agency": r["slug"][:48],
        }
        if send_to_agencies:
            ok, result = send_email([r["to_email"]], r["subject"], html, tags=tags)
            label = f"AGENCY {r['to_email']}"
            if ok:
                _append_track_log({
                    "resend_email_id": result,
                    "to_email": r["to_email"],
                    "to_name": r["to_name"],
                    "agency": r["agency"],
                    "slug": r["slug"],
                    "subject": r["subject"],
                    "campaign": "platform_info",
                    "last_event": "sent",
                    "alerted_events": [],
                })
        else:
            ok, result = send_email(
                REVIEW_TO,
                f"[DRAFT FOR REVIEW] {r['subject']}",
                wrap_review(r, html),
            )
            label = f"REVIEW {', '.join(REVIEW_TO)}"
        print(f"{'OK' if ok else 'FAIL'} → {label} ({r['to_name']}) {result}")

    if send_to_agencies and TRACK_LOG.exists():
        print(f"Track log: {TRACK_LOG}")


if __name__ == "__main__":
    main()
