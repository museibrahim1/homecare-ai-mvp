// One-off: screenshot the redesigned register flow (step 1 and step 2).
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXEC, headless: true });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
await desktop.goto('http://localhost:3100/register', { waitUntil: 'networkidle' });
await desktop.screenshot({ path: '/tmp/register-v2-step1.png' });

await desktop.fill('input[placeholder="Jane Smith"]', 'Test User');
await desktop.fill('input[placeholder="jane@agency.com"]', 'test@example.com');
await desktop.fill('input[placeholder="At least 8 characters"]', 'testpassword123');
await desktop.click('button:has-text("Continue")');
await desktop.waitForSelector('text=Tell us about your agency');
const hasEntity = await desktop.locator('label:has-text("Entity Type")').count();
console.log('entity type field present:', hasEntity, '(should be 0)');
await desktop.screenshot({ path: '/tmp/register-v2-step2.png', fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto('http://localhost:3100/register', { waitUntil: 'networkidle' });
await mobile.screenshot({ path: '/tmp/register-v2-mobile.png' });

await browser.close();
console.log('done');
