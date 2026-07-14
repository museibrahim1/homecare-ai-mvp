/*
 * Builds PalmCare_Deck_v5.pptx from the rendered slide PNGs (full-bleed 16:9).
 */
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');
const slides = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Muse Ibrahim';
pres.company = 'PalmCare AI';
pres.title = 'PalmCare AI — Seed Round $250K';

for (const file of slides) {
  const slide = pres.addSlide();
  slide.addImage({ path: path.join(outDir, file), x: 0, y: 0, w: 10, h: 5.625 });
}

pres.writeFile({ fileName: path.join(__dirname, 'PalmCare_Deck_v5.pptx') }).then(() => {
  console.log('wrote PalmCare_Deck_v5.pptx with', slides.length, 'slides');
});
