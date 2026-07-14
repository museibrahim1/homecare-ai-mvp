/*
 * Pitch deck v5 renderer — screenshots every .card in deck.html to ./out/
 */
const path = require('path');
const fs = require('fs');

const PW_PATH = '/Users/musaibrahim/Desktop/AI Voice Contracter/apps/web/node_modules/playwright-core';
const { chromium } = require(PW_PATH);

(async () => {
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = '/Users/musaibrahim/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 2000, height: 1200 }, deviceScaleFactor: 1 });

  await page.goto('file://' + path.join(__dirname, 'deck.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const only = process.argv.slice(2); // optional: render specific ids
  const cards = await page.locator('.card').all();
  for (const card of cards) {
    const id = await card.getAttribute('id');
    if (!id) continue;
    if (only.length && !only.includes(id)) continue;
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: path.join(outDir, id + '.png') });
    console.log('rendered', id + '.png');
  }

  await browser.close();
})();
