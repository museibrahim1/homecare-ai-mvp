#!/usr/bin/env python3
"""Generate the Just PALM IT / Download Today creative library.

Renders on-brand social graphics with headless Chrome (no PIL). Produces a 1:1
and a 9:16 for every spec. Some creatives embed the App Store QR code.

Output: alongside this file, and copied into the scheduler's public asset dir
and the Desktop "PALM SOCIAL CREATIVES" folder by the caller.

Usage: python3 generate_palm_it_creatives.py
"""
from __future__ import annotations

import base64
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHROME = "/Users/musaibrahim/.cache/puppeteer/chrome-headless-shell/mac_arm-149.0.7827.22/chrome-headless-shell-mac-arm64/chrome-headless-shell"
QR_PATH = HERE / "palm-appstore-qr.png"

TEAL = "#0d9488"
TEAL_DARK = "#0f766e"
DARK = "#0f172a"
MINT = "#5eead4"

APP_SVG = (
    '<svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79'
    '-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51'
    '1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02'
    '2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19'
    '-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>'
)


def _qr_data_uri() -> str:
    b64 = base64.b64encode(QR_PATH.read_bytes()).decode()
    return f"data:image/png;base64,{b64}"


QR_URI = _qr_data_uri()


def _badge() -> str:
    return (
        '<div class="badge">' + APP_SVG +
        '<div><div class="s">Download on the</div><div class="b">App Store</div></div></div>'
    )


def _qr_block() -> str:
    return (
        '<div class="qr-wrap">'
        f'<div class="qr-box"><img src="{QR_URI}" alt="QR"></div>'
        '<p class="qr-cap">Point your iPhone camera here</p>'
        '</div>'
    )


# Background themes
BG = {
    "dark": f"background: {DARK};",
    "gradient": f"background: linear-gradient(150deg, #042f2e 0%, {TEAL_DARK} 55%, {TEAL} 100%);",
    "teal": f"background: linear-gradient(145deg, {TEAL}, {TEAL_DARK});",
    "light": "background: #f8fafc;",
}
TEXT = {"dark": "#ffffff", "gradient": "#ffffff", "teal": "#ffffff", "light": DARK}
SUBC = {"dark": "#94a3b8", "gradient": "rgba(255,255,255,0.85)", "teal": "rgba(255,255,255,0.9)", "light": "#475569"}


def html_doc(spec: dict, w: int, h: int) -> str:
    bg = spec["bg"]
    text = TEXT[bg]
    sub = SUBC[bg]
    hl = MINT if bg != "light" else TEAL
    story = h > w
    pad = "130px 100px" if story else "90px"
    body = []
    body.append(f'<div class="kicker">{spec.get("kicker", "PALM")}</div>')
    body.append(f'<h1>{spec["headline"]}</h1>')
    if spec.get("sub"):
        body.append(f'<p class="sub">{spec["sub"]}</p>')
    if spec.get("stat"):
        num, lab = spec["stat"]
        body.insert(1, f'<div class="stat"><span class="num">{num}</span><span class="lab">{lab}</span></div>')
    if spec.get("rows"):
        rows = "".join(f'<div class="row"><span class="dot"></span>{r}</div>' for r in spec["rows"])
        body.append(f'<div class="rows">{rows}</div>')
    if spec.get("cta"):
        body.append(f'<div class="cta">{spec["cta"]}</div>')
    if spec.get("qr"):
        body.append(_qr_block())
    if spec.get("badge"):
        body.append(_badge())
    body.append('<p class="url">palmcareai.com/app</p>')
    inner = "\n".join(body)

    hsize = 104 if not story else 116
    if len(spec["headline"]) > 60:
        hsize = 74 if not story else 84
    elif len(spec["headline"]) > 34:
        hsize = 86 if not story else 96

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    html,body {{ width:{w}px; height:{h}px; overflow:hidden; }}
    body {{ font-family:-apple-system,'SF Pro Display','Segoe UI',sans-serif; {BG[bg]}
      color:{text}; display:flex; flex-direction:column; align-items:center;
      justify-content:center; text-align:center; padding:{pad}; }}
    .kicker {{ font-size:26px; font-weight:700; letter-spacing:0.14em; color:{hl}; margin-bottom:28px; }}
    h1 {{ font-size:{hsize}px; font-weight:900; line-height:1.02; letter-spacing:-2px; margin-bottom:30px; }}
    h1 em {{ font-style:normal; color:{hl}; }}
    .sub {{ font-size:33px; line-height:1.42; color:{sub}; max-width:840px; margin-bottom:44px; }}
    .stat {{ display:flex; flex-direction:column; margin-bottom:20px; }}
    .stat .num {{ font-size:220px; font-weight:900; line-height:1; color:{hl}; letter-spacing:-4px; }}
    .stat .lab {{ font-size:30px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:{sub}; margin-top:8px; }}
    .rows {{ text-align:left; margin-bottom:44px; }}
    .row {{ font-size:34px; font-weight:600; line-height:1.9; display:flex; align-items:center; }}
    .dot {{ width:16px; height:16px; border-radius:50%; background:{hl}; margin-right:20px; flex-shrink:0; }}
    .cta {{ display:inline-block; background:{'#ffffff' if bg!='light' else TEAL};
      color:{TEAL_DARK if bg!='light' else '#ffffff'}; font-size:32px; font-weight:800;
      padding:22px 54px; border-radius:16px; margin-bottom:14px; }}
    .qr-wrap {{ margin:16px 0 8px; }}
    .qr-box {{ background:#fff; border-radius:24px; padding:18px; display:inline-block; box-shadow:0 24px 60px rgba(0,0,0,0.35); }}
    .qr-box img {{ width:220px; height:220px; display:block; }}
    .qr-cap {{ font-size:26px; font-weight:600; color:{sub}; margin-top:18px; }}
    .badge {{ display:inline-flex; align-items:center; gap:14px; margin:8px 0 14px;
      background:#000; border:1.5px solid rgba(255,255,255,0.35); border-radius:16px; padding:14px 26px; }}
    .badge svg {{ width:36px; height:36px; fill:#fff; }}
    .badge .s {{ font-size:15px; color:#cbd5e1; text-align:left; }}
    .badge .b {{ font-size:26px; font-weight:700; text-align:left; }}
    .url {{ font-size:29px; font-weight:700; color:{hl}; margin-top:22px; }}
    </style></head><body>{inner}</body></html>"""


# ── Creative specs: 28 unique, ~1/3 carry the QR ───────────────────────────
SPECS = [
    {"slug": "just-palm-it", "bg": "dark", "kicker": "PALM",
     "headline": "Just<br><em>PALM IT.</em>",
     "sub": "Record the assessment. Get the care plan, the billables, and the contract.", "cta": "Download Today"},
    {"slug": "download-today-qr", "bg": "gradient", "kicker": "ON THE APP STORE",
     "headline": "Download<br>PALM Today",
     "sub": "It sits in on the assessment and writes the documentation. Free for 14 days.", "qr": True},
    {"slug": "four-documents", "bg": "dark", "kicker": "ONE RECORDING",
     "headline": "Four documents,<br><em>zero typing.</em>",
     "rows": ["Transcript", "Care plan", "Billable items", "State specific contract"], "cta": "Download Today"},
    {"slug": "stat-four", "bg": "gradient", "kicker": "FROM ONE VISIT",
     "headline": "documents drafted", "stat": ("4", "from a single recording"),
     "sub": "Record the assessment. PALM writes the rest.", "cta": "Just PALM IT"},
    {"slug": "visit-ends-qr", "bg": "dark", "kicker": "NOW ON THE APP STORE",
     "headline": "The visit ends.<br>The contract is<br><em>already written.</em>",
     "qr": True, "badge": True},
    {"slug": "evenings-back", "bg": "teal", "kicker": "GET YOUR TIME BACK",
     "headline": "Your evenings,<br><em>returned.</em>",
     "sub": "The visit was documented out loud. PALM writes it up so your team does not have to.", "cta": "Download Today"},
    {"slug": "same-day-contract", "bg": "gradient", "kicker": "SAME DAY",
     "headline": "The family signed<br><em>before dinner.</em>",
     "sub": "PALM drafts the service agreement before the assessor leaves the driveway.", "cta": "Just PALM IT"},
    {"slug": "one-recording-qr", "bg": "dark", "kicker": "ONE RECORDING",
     "headline": "One recording.<br>The whole<br><em>assessment, done.</em>",
     "qr": True},
    {"slug": "fifty-states", "bg": "gradient", "kicker": "50 STATES",
     "headline": "50 states.<br>One draft that<br><em>follows yours.</em>",
     "sub": "Service agreements built on the rules of the state you operate in.", "cta": "Download Today"},
    {"slug": "scan-hero", "bg": "dark", "kicker": "DOWNLOAD PALM",
     "headline": "Point your<br>camera here.", "qr": True, "badge": True},
    {"slug": "stop-9pm", "bg": "dark", "kicker": "PALM",
     "headline": "Stop writing<br>contracts at <em>9pm.</em>",
     "sub": "Let the app that heard the visit write them. On the App Store now.", "cta": "Download Today"},
    {"slug": "record-review-sign", "bg": "teal", "kicker": "THE WHOLE PRODUCT",
     "headline": "Record.<br>Review.<br><em>Sign.</em>",
     "sub": "That is the entire workflow. PALM does the drafting in between.", "cta": "Just PALM IT"},
    {"slug": "14-days-free-qr", "bg": "gradient", "kicker": "TRY IT FREE",
     "headline": "14 days.<br>No card.<br><em>One visit to judge.</em>", "qr": True},
    {"slug": "app-that-listens", "bg": "dark", "kicker": "PALM",
     "headline": "The app that<br><em>finally listens.</em>",
     "sub": "Care plan, billables, and a contract, drafted from what was actually said.", "cta": "Download Today"},
    {"slug": "conversation-to-contract", "bg": "gradient", "kicker": "PALM",
     "headline": "From conversation<br>to contract.",
     "sub": "In minutes, not days. A staff member reviews before anything is final.", "cta": "Just PALM IT"},
    {"slug": "billables-qr", "bg": "dark", "kicker": "STOP LOSING BILLABLES",
     "headline": "The billables<br>you already<br><em>earned.</em>",
     "sub": "Said once at minute 34. PALM hears it, prices it, bills it.", "qr": True},
    {"slug": "two-minutes", "bg": "teal", "kicker": "SAME VISIT",
     "headline": "Two minutes,<br>not <em>two hours.</em>",
     "sub": "The information does not change based on who types it. PALM just types it faster.", "cta": "Download Today"},
    {"slug": "just-palm-it-mint", "bg": "gradient", "kicker": "PALM",
     "headline": "Don't type it.<br><em>Just PALM IT.</em>",
     "sub": "PALM is on the App Store. Record the visit, get the documentation.", "cta": "Download Today"},
    {"slug": "download-qr-2", "bg": "dark", "kicker": "ON THE APP STORE",
     "headline": "Get PALM<br>on your iPhone.", "qr": True, "badge": True},
    {"slug": "clipboard-dead", "bg": "dark", "kicker": "PALM",
     "headline": "The clipboard<br>is <em>retired.</em>",
     "sub": "Press record at the assessment. PALM writes the care plan, the billables, and the contract.", "cta": "Download Today"},
    {"slug": "three-outputs", "bg": "gradient", "kicker": "WHAT PALM WRITES",
     "headline": "Care plan.<br>Billables.<br><em>Contract.</em>",
     "sub": "All from the assessment you were already doing.", "cta": "Just PALM IT"},
    {"slug": "before-the-car", "bg": "teal", "kicker": "POV",
     "headline": "Done before you<br><em>start the car.</em>",
     "sub": "Notes, billables, and contract drafted while the visit is still fresh.", "cta": "Download Today"},
    {"slug": "tuesday-nights-qr", "bg": "dark", "kicker": "GET YOUR TIME BACK",
     "headline": "Your Tuesday<br>nights, <em>back.</em>", "qr": True},
    {"slug": "scan-download-hero", "bg": "gradient", "kicker": "SCAN TO DOWNLOAD",
     "headline": "Free on the<br>App Store.", "qr": True, "badge": True},
    {"slug": "different-evening", "bg": "dark", "kicker": "SAME VISIT",
     "headline": "Same visit.<br><em>Different evening.</em>",
     "sub": "One agency retypes it at 9pm. The other had it drafted before they left.", "cta": "Download Today"},
    {"slug": "whole-assessment", "bg": "teal", "kicker": "PALM",
     "headline": "The whole<br>assessment,<br><em>handled.</em>",
     "sub": "Record it once. Review the draft. Send it to sign.", "cta": "Just PALM IT"},
    {"slug": "finale-qr", "bg": "gradient", "kicker": "JUST PALM IT",
     "headline": "Download PALM<br><em>today.</em>",
     "sub": "It sits in on the assessment, writes the care plan, finds the billables, builds the contract.",
     "qr": True, "badge": True},
    {"slug": "not-typing", "bg": "dark", "kicker": "THE FIX",
     "headline": "The fix isn't<br>typing faster.<br><em>It's not typing.</em>",
     "sub": "PALM is on the App Store. Free for 14 days.", "cta": "Download Today"},
]


def render(html: str, out: Path, w: int, h: int) -> None:
    tmp = out.with_suffix(".html")
    tmp.write_text(html)
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", f"--window-size={w},{h}",
         f"--screenshot={out}", "--virtual-time-budget=3000", f"file://{tmp}"],
        check=True, capture_output=True,
    )
    tmp.unlink()


def main() -> None:
    out_dir = HERE / "creatives"
    out_dir.mkdir(exist_ok=True)
    for spec in SPECS:
        for w, h, tag in ((1080, 1080, "1x1"), (1080, 1920, "9x16")):
            out = out_dir / f"palm-{spec['slug']}-{tag}.png"
            render(html_doc(spec, w, h), out, w, h)
            print(f"rendered {out.name}")
    print(f"\nDone. {len(SPECS)} specs x 2 ratios = {len(SPECS) * 2} images in {out_dir}")


if __name__ == "__main__":
    main()
