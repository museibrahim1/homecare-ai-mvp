// Regression test for a Comfort Keepers trial report (Sep 14, 2026):
// "I tried clicking on the clients box, but it does not take me to a new page."
//
// Two bugs compounded:
//  1. The dashboard stat cards were plain divs, so the Clients box never
//     navigated anywhere.
//  2. The What's New popup rendered an invisible full-screen backdrop button
//     that swallowed the first click anywhere in the app.
//
// This test logs in through the real login form (auth is cookie-session based;
// seeding a token into localStorage no longer hydrates a session), waits for
// the What's New popup when it appears, and asserts that a single click on the
// Clients stat box lands on the client list.
//
// Requires the API that the dev server proxies to (see next.config.js
// rewrites) to be reachable, e.g. `API_URL=https://api-production-a0a2.up.railway.app`.
import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'demo@agency.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo1234';

test('dashboard Clients box navigates to the client list in one click', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Clear the seen flag so the What's New popup opens like it does for a new
  // trial signup — the click must work even with the popup on screen.
  await page.evaluate(() => localStorage.removeItem('palmcare-whats-new-seen'));

  // Guard against clicking before React hydrates (native GET submit).
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[type="submit"]');
      return !!btn && Object.keys(btn).some((k) => k.startsWith('__react'));
    },
    { timeout: 60_000 },
  );

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 90_000 });

  const clientsBox = page
    .locator('[class*="grid-cols-3"] > *')
    .filter({ hasText: 'Clients' })
    .first();
  await expect(clientsBox).toBeVisible({ timeout: 90_000 });

  // Give the What's New popup a moment to open if it is going to.
  await page.waitForTimeout(1_500);

  await clientsBox.click();
  await page.waitForURL('**/clients**', { timeout: 15_000 });
  expect(page.url()).toContain('/clients');
});
