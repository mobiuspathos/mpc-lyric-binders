// Page layout rules: type size limits, too-long songs, contents page, margins, Letter size.
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openTool, loadLyrics, line, verse } = require('./helpers');

const IN = 96; // CSS pixels per inch

test.beforeEach(async ({ page }) => { await openTool(page); });

// Counts pages and reads page sizes from a PDF file.
function pdfInfo(file) {
  const s = fs.readFileSync(file, 'latin1');
  const pages = (s.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const boxes = [...s.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)]
    .map(m => [Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2])]);
  return { pages, boxes };
}

test('a short song gets big type, never above 30 pt', async ({ page }) => {
  const [r] = await loadLyrics(page, 'Short\n\nla la la\nla la la');
  expect(r.ok).toBe(true);
  expect(r.size).toBeLessThanOrEqual(30);
  expect(r.size).toBeGreaterThan(24);
});

test('type never goes below 16 pt', async ({ page }) => {
  const songs = [4, 8, 12, 16].map(n =>
    `Song ${n}\n\n` + Array.from({ length: n }, (_, i) => verse(i * 10)).join('\n\n'));
  const fit = await loadLyrics(page, songs.join('\n\n\n'));
  for (const r of fit) {
    if (r.ok) expect(r.size).toBeGreaterThanOrEqual(16);
  }
  const sizes = await page.$$eval('.pw[id] .body', els => els.map(e => parseFloat(e.style.fontSize)));
  for (const pt of sizes) expect(pt).toBeGreaterThanOrEqual(16);
});

test('a song that does not fit is flagged and the PDF is blocked', async ({ page }) => {
  const long = 'Far Too Long\n\n' + Array.from({ length: 40 }, (_, i) => verse(i * 10, 6)).join('\n\n');
  const fit = await loadLyrics(page, 'Fine Song\n\nla la\n\n\n' + long);
  expect(fit[0].ok).toBe(true);
  expect(fit[1].ok).toBe(false);

  await expect(page.locator('#p1')).toHaveClass(/flag/);
  await expect(page.locator('#p0')).not.toHaveClass(/flag/);
  await expect(page.locator('#p1 .tag')).toContainText('TOO LONG');
  await expect(page.locator('#print')).toBeDisabled();
  await expect(page.locator('#status')).toHaveClass(/bad/);
  await expect(page.locator('#status')).toContainText('Far Too Long');

  // Even if someone prints anyway, the pages are hidden and only a warning prints.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#preview')).toBeHidden();
  await expect(page.locator('.blockedmsg')).toBeVisible();
});

test('fixing a too-long song unblocks the PDF', async ({ page }) => {
  const long = 'Song\n\n' + Array.from({ length: 40 }, (_, i) => verse(i * 10, 6)).join('\n\n');
  await loadLyrics(page, long);
  await expect(page.locator('#print')).toBeDisabled();
  await loadLyrics(page, 'Song\n\n' + verse(0));
  await expect(page.locator('#print')).toBeEnabled();
  await expect(page.locator('#status')).toContainText('Ready to print');
});

test('long lines wrap instead of being cut off', async ({ page }) => {
  const text = 'Wordy\n\n' + [1, 2, 3, 4].map(n => line(n, 30)).join('\n');
  const [r] = await loadLyrics(page, text);
  expect(r.ok).toBe(true);
  expect(r.wrap).toBe(true);
  const cut = await page.$$eval('#p0 .ln', els => els.filter(l => l.scrollWidth > l.clientWidth + 1).length);
  expect(cut).toBe(0);
  const tall = await page.$eval('#p0 .body', b => b.scrollHeight > b.closest('main').clientHeight + 1);
  expect(tall).toBe(false);
});

test('the contents page gets its own sheet with a blank back', async ({ page }, info) => {
  await loadLyrics(page, 'Contents: yes\n\n\nOne\n\na\n\n\nTwo\n\nb\n\n\nThree\n\nc');
  const kinds = await page.$$eval('#preview .pw', els => els.map(e => e.dataset.kind || e.id));
  expect(kinds).toEqual(['toc', 'blank', 'p0', 'p1', 'p2']);
  await expect(page.locator('.toc li')).toHaveText(['1One', '2Two', '3Three']);
  expect(await page.locator('.pw[data-kind=blank] .page').innerHTML()).toBe('');
  // Song 1 still starts on a right-hand page.
  await expect(page.locator('#p0 .page')).toHaveClass(/front/);

  const file = info.outputPath('contents.pdf');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
  expect(pdfInfo(file).pages).toBe(5);
});

test('no contents page unless it is turned on', async ({ page }) => {
  await loadLyrics(page, 'Contents: no\n\n\nOne\n\na');
  await expect(page.locator('.pw[data-kind]')).toHaveCount(0);
});

test('odd songs are right-hand pages, even songs left-hand', async ({ page }) => {
  await loadLyrics(page, ['A', 'B', 'C', 'D'].map(t => `${t}\n\nla`).join('\n\n\n'));
  const sides = await page.$$eval('.pw[id] .page', els => els.map(e => e.classList.contains('front') ? 'right' : 'left'));
  expect(sides).toEqual(['right', 'left', 'right', 'left']);
});

test('binding margin is mirrored: wide margin on the binding side of each page', async ({ page }) => {
  await loadLyrics(page, 'A\n\nla\n\n\nB\n\nla');
  const pad = sel => page.$eval(sel, e => {
    const c = getComputedStyle(e);
    return [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(parseFloat);
  });
  const right = await pad('#p0 .page');
  const left = await pad('#p1 .page');
  // top, outside, bottom, binding (in inches)
  expect(right.map(px => +(px / IN).toFixed(2))).toEqual([0.45, 0.5, 0.4, 0.85]);
  expect(left.map(px => +(px / IN).toFixed(2))).toEqual([0.45, 0.85, 0.4, 0.5]);
});

test('pages are US Letter in the PDF, one song per page', async ({ page }, info) => {
  await loadLyrics(page, 'A\n\nla\n\n\nB\n\nla\n\n\nC\n\nla');
  const size = await page.$eval('#p0 .page', e => [e.offsetWidth, e.offsetHeight]);
  expect(size).toEqual([8.5 * IN, 11 * IN]);

  const file = info.outputPath('letter.pdf');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
  const { pages, boxes } = pdfInfo(file);
  expect(pages).toBe(3);
  for (const [w, h] of boxes) expect([Math.round(w), Math.round(h)]).toEqual([612, 792]);
});
