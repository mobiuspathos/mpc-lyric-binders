// Renders a booklet .txt to the three PDFs (booklet, PRINT, phone) with the built tool, without opening Chrome.
// Run: npm run booklet -- examples/caroling-booklet.txt out/   (or: docker compose run --rm booklet-pdf examples/caroling-booklet.txt out/)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [txt, dir = '.'] = process.argv.slice(2);
if (!txt) { console.error('Usage: node scripts/render-booklet.js <booklet.txt> [out-folder]'); process.exit(1); }
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  pg.on('pageerror', e => console.error('Page error:', e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../booklet-maker.html'));
  await pg.waitForSelector('body[data-ready]');
  await pg.evaluate(t => window.bookletMaker.applyText(t), fs.readFileSync(txt, 'utf8'));
  const title = await pg.$eval('#bTitle', e => e.value);
  const base = (title || 'booklet').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  for (const [v, suffix] of [['booklet', ''], ['print', '_PRINT'], ['mobile', '_mobile']]) {
    await pg.evaluate(v => window.bookletMaker.setVersion(v), v);
    const b = await pg.evaluate(() => window.BOOK);
    if (v !== 'print') console.table(b.songs.map(s => ({ title: s.title, size: s.size, pages: s.pages, starts: s.start, check: s.over ? 'LINE TOO LONG' : '' })));
    await pg.emulateMedia({ media: 'print' });
    const file = path.join(dir, base + suffix + '.pdf');
    await pg.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    await pg.emulateMedia({ media: 'screen' });
    console.log(`Wrote ${file} (${v === 'print' ? b.pages / 2 + ' letter pages' : b.pages + ' pages'})`);
  }
  await br.close();
})();
