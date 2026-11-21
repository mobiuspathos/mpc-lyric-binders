// Renders a lyrics .txt to PDF with the built tool, without opening Chrome.
// Run: npm run pdf -- examples/holiday-caroling.txt out.pdf   (needs: npm install)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [txt, pdf = 'binder.pdf'] = process.argv.slice(2);
if (!txt) { console.error('Usage: node scripts/render-pdf.js <lyrics.txt> [out.pdf]'); process.exit(1); }
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage();
  pg.on('pageerror', e => console.error('Page error:', e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../binder-maker.html'));
  await pg.waitForSelector('body[data-ready]');
  await pg.evaluate(t => window.binderMaker.applyText(t), fs.readFileSync(txt, 'utf8'));
  const fit = await pg.evaluate(() => window.FIT);
  console.table(fit.map(r => ({ title: r.title, size: r.ok ? r.size : 'TOO LONG', cols: r.cols, refrains: r.refrains })));
  if (fit.some(r => !r.ok)) { console.error('Some songs are too long at 16 pt. No PDF written.'); await br.close(); process.exit(2); }
  await pg.emulateMedia({ media: 'print' });
  await pg.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await br.close(); console.log('Wrote', pdf);
})();
