// One-off functional click-test of the marketing site (run against local dev server).
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:3100';
const EXEC = process.env.CHROME_EXEC;
const results = [];
const log = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`);
};

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// 1. Homepage renders
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
log('homepage renders', await page.locator('h1').first().textContent().then(t => t.includes('Record it')));
log('orb canvas present', await page.locator('canvas').count() > 0);

// 2. Hero CTA -> /register
await page.click('[data-track="hero-cta-trial"]');
await page.waitForURL('**/register**');
log('hero trial CTA -> /register', page.url().includes('/register'));

// 3. Hero demo CTA -> /book-demo
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.click('[data-track="hero-cta-demo"]');
await page.waitForURL('**/book-demo**');
log('hero demo CTA -> /book-demo', page.url().includes('/book-demo'));
log('book-demo renders form', await page.locator('input, select, button').count() > 3);

// 4. Nav dropdowns
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.hover('nav button:has-text("Features")');
await page.waitForTimeout(400);
log('Features dropdown (6 items)', await page.locator('nav a[href^="/features#"]').count() === 6);
await page.hover('nav button:has-text("Resources")');
await page.waitForTimeout(400);
const resLinks = await page.locator('nav a:visible').allTextContents();
log('Resources has Blog/ROI/FAQ', ['Blog', 'ROI Calculator', 'FAQ'].every(x => resLinks.some(t => t.includes(x))));
await page.click('nav a:has-text("Blog")');
await page.waitForURL('**/blog');
log('Resources Blog link -> /blog', true);

// 5. Blog light theme + featured listicle
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
log('blog light theme', !bg.includes('0, 0, 0'), `body bg: ${bg}`);
const featured = await page.locator('h2').first().textContent();
log('featured is 7-best listicle', featured.includes('7 Best AI Tools'), featured.trim().slice(0, 60));
await page.screenshot({ path: '/tmp/verify-blog-index.png' });
await page.click('h2:has-text("7 Best AI Tools")');
await page.waitForURL('**/blog/best-ai-tools-home-care-agencies-2026');
const hasItemList = await page.evaluate(() =>
  [...document.querySelectorAll('script[type="application/ld+json"]')].some(s => s.textContent.includes('ItemList')));
log('listicle has ItemList JSON-LD', hasItemList);
log('listicle renders sections', await page.locator('h2').count() >= 8);
await page.screenshot({ path: '/tmp/verify-listicle.png' });

// 6. Register step 1 -> step 2 with new question (do NOT submit)
await page.goto(BASE + '/register', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="Jane Smith"]', 'Test User');
await page.fill('input[placeholder="jane@agency.com"]', 'test@example.com');
await page.fill('input[placeholder="Min 8 characters"]', 'testpassword123');
await page.click('button:has-text("Continue")');
await page.waitForSelector('text=Agency Details');
const q = page.locator('label:has-text("Where did you find us?")');
log('register step 2 has referral question', await q.count() === 1);
const sel = page.locator('label:has-text("Where did you find us?") + select');
const opts = await sel.locator('option').allTextContents();
log('referral options include AI assistant', opts.some(o => o.includes('ChatGPT')), opts.join(' | ').slice(0, 120));
await sel.selectOption('ai_assistant');
log('referral select works', (await sel.inputValue()) === 'ai_assistant');
await page.screenshot({ path: '/tmp/verify-register-step2.png' });

// 7. Feature tabs switch
await page.goto(BASE + '/#features', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
const firstCardBefore = await page.locator('#features h3').first().textContent();
await page.click('#features button:has-text("Billing & Reports")');
await page.waitForTimeout(300);
const firstCardAfter = await page.locator('#features h3').first().textContent();
log('feature tabs switch content', firstCardBefore !== firstCardAfter, `${firstCardBefore} -> ${firstCardAfter}`);

// 8. Track events actually queue (fetch to /analytics observed?)
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (consoleErrors.length) console.log('PAGE ERRORS:', consoleErrors.slice(0, 5));
await browser.close();
process.exit(failed.length ? 1 : 0);
