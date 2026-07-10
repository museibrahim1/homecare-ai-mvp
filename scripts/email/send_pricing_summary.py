"""One-off: email the CEO a summary of the new subscription pricing rollout."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

HTML = """
<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a202c;">
  <div style="background: linear-gradient(135deg, #059669, #047857); padding: 28px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Pricing Is Fully Set Up</h1>
    <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Nothing has been submitted to the App Store. Waiting on your green light.</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">

    <h2 style="font-size: 16px; margin: 0 0 12px;">The new plans</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="background: #f7fafc;">
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Plan</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Monthly</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Annual (20% off)</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Free trial</th>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Starter</strong><br><span style="color:#718096; font-size:12px;">20 assessments, 5 team members</span></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$199</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$1,910 (about $159/mo)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">14 days</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Growth</strong><br><span style="color:#718096; font-size:12px;">75 assessments, 20 team members</span></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$699</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$6,710 (about $559/mo)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">14 days</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Enterprise</strong><br><span style="color:#718096; font-size:12px;">Unlimited everything, dedicated manager</span></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$1,200</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$11,520 (about $960/mo)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">None</td>
      </tr>
    </table>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">What is done and verified</h2>
    <ul style="font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
      <li><strong>Backend:</strong> plans repriced, Enterprise replaces Professional, new descriptions, annual prices, and per tier rate limits on all AI endpoints (Starter 15, Growth 40, Enterprise 120 requests per minute).</li>
      <li><strong>App Store Connect:</strong> Starter Monthly is live at $199 and Growth Monthly at $699 across all 175 territories. Both have the 14 day free trial attached. Annual products are created with names, descriptions, and review screenshots.</li>
      <li><strong>iOS app:</strong> new paywall with a Monthly and Annual toggle, Save 20% badge, free trial labels, Enterprise naming, and an in app Request a Refund button. The app compiles clean.</li>
      <li><strong>Website:</strong> pricing page, upgrade modal, register page, pricing.md, and llms.txt all match the new numbers.</li>
      <li>Everything is committed and pushed to GitHub.</li>
    </ul>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">One thing waiting on Apple</h2>
    <p style="font-size: 14px; line-height: 1.7; margin: 0;">
      Apple caps subscription prices at $1,000 by default. I submitted the official request for higher price points (up to $10,000) and Apple confirmed they will review it. Until they approve:
    </p>
    <ul style="font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 8px 0 0;">
      <li>Enterprise Monthly is set at $1,000, the max allowed today. I will move it to $1,200 the moment Apple approves.</li>
      <li>The annual products exist but cannot be priced yet since all three are above $1,000. I will price them when access is granted.</li>
      <li>Heads up: Enterprise Annual at $11,520 is above even Apple's extended $10,000 cap. The closest options are $10,000 flat or lowering that one plan. Your call when we get there.</li>
    </ul>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">App Store status</h2>
    <p style="font-size: 14px; line-height: 1.7; margin: 0;">
      Version 1.1 is NOT submitted. I cancelled the pending review as you asked, and there are no active review submissions. When you give the green light I will attach the three monthly subscriptions and submit everything together.
    </p>

    <p style="font-size: 13px; color: #718096; margin: 24px 0 0;">Sent automatically by your PALM build agent.</p>
  </div>
</div>
"""

resp = requests.post(
    "https://api.resend.com/emails",
    headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
    json={
        "from": "PALM Build Agent <sales@send.palmtai.com>",
        "to": ["museibrahim@palmtai.com", "musajama89@gmail.com"],
        "subject": "New pricing is set up: $199 / $699 / $1,200 with trials and annual plans. Not submitted yet.",
        "html": HTML,
    },
    timeout=30,
)
print(resp.status_code, resp.text)
