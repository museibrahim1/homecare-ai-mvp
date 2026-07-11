"""One-off: email the CEO that Apple approved higher price points and pricing is final."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

HTML = """
<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a202c;">
  <div style="background: linear-gradient(135deg, #059669, #047857); padding: 28px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Apple Approved. All Pricing Is Live in App Store Connect.</h1>
    <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">The app is still NOT submitted for review. That only happens when you say go.</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">

    <h2 style="font-size: 16px; margin: 0 0 12px;">Final prices, set in all 175 countries</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="background: #f7fafc;">
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Plan</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Monthly</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Annual</th>
        <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0;">Free trial</th>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Starter</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$199</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$1,899.99 (20% off)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">14 days</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Growth</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$699</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$6,699.99 (20% off)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">14 days</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Enterprise</strong></td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$1,199.99</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">$10,000 (about 30% off)</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">None</td>
      </tr>
    </table>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">Two small notes on the numbers</h2>
    <ul style="font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
      <li>Apple sells from a fixed catalog of price points, so $1,200 exactly does not exist. The closest is <strong>$1,199.99</strong>, which is what customers will see. Same reason the annuals end in .99.</li>
      <li>Enterprise Annual at 20% off would have been $11,520, but Apple's absolute maximum is $10,000. I set it there, which is actually a better deal for the customer (about 30% off) and the highest price Apple allows anywhere.</li>
    </ul>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">Verified just now in App Store Connect</h2>
    <ul style="font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
      <li>All 6 products (3 monthly, 3 annual) are priced in every one of the 175 territories.</li>
      <li>14 day free trials are attached to Starter and Growth, both monthly and annual. Enterprise has none, as you asked.</li>
      <li>All three annual products moved to Ready to Submit. The monthlies were already cleared.</li>
      <li>The website, backend, and structured data now show the exact same numbers customers will be charged.</li>
    </ul>

    <h2 style="font-size: 16px; margin: 24px 0 8px;">What happens next</h2>
    <p style="font-size: 14px; line-height: 1.7; margin: 0;">
      Everything is ready. When you give the green light, I will attach all six subscriptions to version 1.1 and submit the app and the subscriptions to App Review together in one submission. Nothing goes to Apple until then.
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
        "subject": "Apple approved the higher prices. All 6 subscriptions are priced and ready. Awaiting your green light to submit.",
        "html": HTML,
    },
    timeout=30,
)
print(resp.status_code, resp.text)
