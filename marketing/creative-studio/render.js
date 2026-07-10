/*
 * PALM creative studio renderer.
 * Screenshots every element with class "card" (using its id as filename)
 * from each HTML file in ./cards, into ./out.
 *
 * Usage: node render.js [file1.html file2.html ...]   (default: all cards/*.html)
 */
const path = require('path');
const fs = require('fs');

const PW_PATH = '/Users/musaibrahim/Desktop/AI Voice Contracter/apps/web/node_modules/playwright-core';
const { chromium } = require(PW_PATH);

(async () => {
  const cardsDir = path.join(__dirname, 'cards');
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  let files = process.argv.slice(2);
  if (files.length === 0) {
    files = fs.readdirSync(cardsDir).filter((f) => f.endsWith('.html'));
  }

  const executablePath = '/Users/musaibrahim/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1400, height: 2200 }, deviceScaleFactor: 1 });

  for (const file of files) {
    const filePath = path.isAbsolute(file) ? file : path.join(cardsDir, file);
    await page.goto('file://' + filePath, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300); // let fonts settle
    const cards = await page.locator('.card').all();
    for (const card of cards) {
      const id = await card.getAttribute('id');
      if (!id) continue;
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: path.join(outDir, id + '.png') });
      console.log('rendered', id + '.png');
    }
  }

  await browser.close();
})();
