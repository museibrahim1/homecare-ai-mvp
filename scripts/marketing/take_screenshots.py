"""
Take screenshots of all app pages using Playwright.
Saves to /screenshots/ directory organized by category.
"""

import asyncio
import os
import sys

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing playwright...")
    os.system(f"{sys.executable} -m pip install playwright")
    os.system(f"{sys.executable} -m playwright install chromium")
    from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "screenshots")

PAGES = {
    "public": [
        ("/", "01-landing-page"),
        ("/about", "02-about"),
        ("/contact", "03-contact"),
        ("/features", "04-features"),
        ("/help", "05-help"),
        ("/terms", "06-terms"),
        ("/privacy", "07-privacy"),
        ("/status", "08-status"),
    ],
    "auth": [
        ("/login", "01-login"),
        ("/forgot-password", "02-forgot-password"),
        ("/reset-password", "03-reset-password"),
        ("/register/status", "04-register-status"),
    ],
    "dashboard": [
        ("/dashboard", "01-dashboard"),
        ("/welcome", "02-welcome"),
        ("/clients", "03-clients"),
        ("/visits", "04-visits"),
        ("/visits/new", "05-new-visit"),
        ("/contracts/new", "06-new-contract"),
        ("/proposals", "07-proposals"),
        ("/documents", "08-documents"),
        ("/templates", "09-templates"),
        ("/billing", "10-billing"),
        ("/schedule", "11-schedule"),
        ("/caregivers", "12-caregivers"),
        ("/care-tracker", "13-care-tracker"),
        ("/adl-logging", "14-adl-logging"),
        ("/pipeline", "15-pipeline"),
        ("/leads", "16-leads"),
        ("/reports", "17-reports"),
        ("/activity", "18-activity"),
        ("/notes", "19-notes"),
        ("/policies", "20-policies"),
        ("/team-chat", "21-team-chat"),
        ("/messages", "22-messages"),
        ("/integrations", "23-integrations"),
    ],
    "settings": [
        ("/settings", "01-settings"),
    ],
    "admin": [
        ("/admin", "01-admin-dashboard"),
        ("/admin/businesses", "02-businesses"),
        ("/admin/users", "03-users"),
        ("/admin/approvals", "04-approvals"),
        ("/admin/subscriptions", "05-subscriptions"),
        ("/admin/billing", "06-admin-billing"),
        ("/admin/analytics", "07-analytics"),
        ("/admin/compliance", "08-compliance"),
        ("/admin/support", "09-support"),
        ("/admin/audit", "10-audit"),
        ("/admin/system", "11-system"),
        ("/admin/incidents", "12-incidents"),
        ("/admin/quick-setup", "13-quick-setup"),
        ("/admin/sales-leads", "14-sales-leads"),
    ],
}


async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
        )
        page = await context.new_page()

        total = sum(len(routes) for routes in PAGES.values())
        count = 0

        for category, routes in PAGES.items():
            cat_dir = os.path.join(SCREENSHOTS_DIR, category)
            os.makedirs(cat_dir, exist_ok=True)

            for path, filename in routes:
                count += 1
                url = f"{BASE_URL}{path}"
                filepath = os.path.join(cat_dir, f"{filename}.png")

                print(f"[{count}/{total}] {path} -> {category}/{filename}.png")

                try:
                    await page.goto(url, wait_until="networkidle", timeout=15000)
                    await page.wait_for_timeout(1000)

                    await page.screenshot(
                        path=filepath,
                        full_page=True,
                    )
                    print(f"  -> Saved")
                except Exception as e:
                    print(f"  -> ERROR: {e}")

                    try:
                        await page.screenshot(
                            path=filepath,
                            full_page=False,
                        )
                        print(f"  -> Saved (viewport only)")
                    except Exception:
                        print(f"  -> SKIP")

        await browser.close()
        print(f"\nDone! {count} screenshots saved to {SCREENSHOTS_DIR}/")


if __name__ == "__main__":
    asyncio.run(take_screenshots())
