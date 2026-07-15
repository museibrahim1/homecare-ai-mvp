/*
 * Portable deck builder for pitch-deck-v5.
 *
 * Renders every .card in deck.html to a full-bleed 16:9 PNG (out/), then
 * assembles PalmCare_Deck_v5.pdf and PalmCare_Deck_v5.pptx from those PNGs.
 *
 * Unlike render.js (which hardcodes local macOS Playwright paths), this uses
 * the Playwright package resolved from node_modules, so it runs anywhere.
 *
 *   npm install playwright pdf-lib pptxgenjs
 *   npx playwright install chromium
 *   node build_deck.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const pptxgen = require('pptxgenjs');

const outDir = path.join(__dirname, 'out');

async function renderSlides() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 2000, height: 1200 },
    deviceScaleFactor: 1,
  });

  await page.goto('file://' + path.join(__dirname, 'deck.html'), { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(600);

  const ids = [];
  const cards = await page.locator('.card').all();
  for (const card of cards) {
    const id = await card.getAttribute('id');
    if (!id) continue;
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: path.join(outDir, id + '.png') });
    ids.push(id);
    console.log('rendered', id + '.png');
  }
  await browser.close();
  return ids.sort();
}

async function buildPdf(files) {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(outDir, file));
    const png = await pdf.embedPng(bytes);
    // Normalize every slide to a 1920x1080 page (16:9), full-bleed.
    const page = pdf.addPage([1920, 1080]);
    page.drawImage(png, { x: 0, y: 0, width: 1920, height: 1080 });
  }
  const bytes = await pdf.save();
  fs.writeFileSync(path.join(__dirname, 'PalmCare_Deck_v5.pdf'), bytes);
  console.log('wrote PalmCare_Deck_v5.pdf with', files.length, 'slides');
}

async function buildPptx(files) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Muse Ibrahim';
  pres.company = 'PalmCare AI';
  pres.title = 'PalmCare AI — Seed Round $250K';
  for (const file of files) {
    const slide = pres.addSlide();
    slide.addImage({ path: path.join(outDir, file), x: 0, y: 0, w: 10, h: 5.625 });
  }
  await pres.writeFile({ fileName: path.join(__dirname, 'PalmCare_Deck_v5.pptx') });
  console.log('wrote PalmCare_Deck_v5.pptx with', files.length, 'slides');
}

(async () => {
  await renderSlides();
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
  await buildPdf(files);
  await buildPptx(files);
})();
