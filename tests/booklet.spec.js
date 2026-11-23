// Booklet Maker: the caroling booklet in three versions (booklet, PRINT, phone).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { line, verse } = require('./helpers');

const TOOL = 'file://' + path.resolve(__dirname, '../booklet-maker.html');
const STARTER = fs.readFileSync(path.resolve(__dirname, '../examples/caroling-booklet.txt'), 'utf8');
const IN = 96;

async function open(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(TOOL);
  await page.waitForSelector('body[data-ready]');
  return errors;
}
const load = (page, text) => page.evaluate(t => { window.bookletMaker.applyText(t); return window.BOOK; }, text);
const version = (page, v) => page.evaluate(v => { window.bookletMaker.setVersion(v); return window.BOOK; }, v);
function pdfInfo(file) {
  const s = fs.readFileSync(file, 'latin1');
  const pages = (s.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const boxes = [...s.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)]
    .map(m => [Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2])]);
  return { pages, boxes };
}
async function pdf(page, file) {
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return pdfInfo(file);
}
const HEAD = 'Booklet: Test Book\nSubtitle: A Test\nClosing: Bye / See you\n\n\n';
const song = (t, n, lines = 4) => `${t}\nKey of C · Start on G\n\n` + Array.from({ length: n }, (_, i) => verse(i * 10, lines)).join('\n\n');

test.beforeEach(async ({ page }) => { await open(page); });

test('first visit starts with the 2026 booklet, which renders cleanly in all three versions', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  const errors = await open(page);
  await expect(page.locator('#bTitle')).toHaveValue('Holiday Caroling Lyrics');
  for (const v of ['booklet', 'print', 'mobile']) {
    const b = await version(page, v);
    expect(b.songs, v).toHaveLength(17);
    expect(b.dyks, v).toBe(2);
    for (const s of b.songs) {
      expect(s.over, s.title).toBeFalsy();
      expect(s.size, `${v}: ${s.title}`).toBeGreaterThanOrEqual(b.min);
      expect(s.size, `${v}: ${s.title}`).toBeLessThanOrEqual(b.max);
    }
  }
  await expect(page.locator('#status')).toContainText('Ready');
  expect(errors).toEqual([]);
});

test('header lines fill the cover, back cover and lettering', async ({ page }) => {
  await load(page, 'Booklet: My Book\nSubtitle: Sing along\nClosing: Merry Christmas / and more\nFont: serif\n\n\n' + song('A', 2));
  await expect(page.locator('#bTitle')).toHaveValue('My Book');
  await expect(page.locator('#bSub')).toHaveValue('Sing along');
  await expect(page.locator('#fSerif')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pw[data-kind=cover] .cvt')).toHaveText('My Book');
  await expect(page.locator('.pw[data-kind=cover] .cvc')).toHaveText('1 favorite carol and songs');
  await expect(page.locator('.pw[data-kind=back] .bkt')).toHaveText('Merry Christmas');
  await expect(page.locator('.pw[data-kind=back] .cvs')).toHaveText('and more');
});

test('booklet order: cover, contents, songs, Did You Know?, spare pages, back cover; a multiple of 4', async ({ page }) => {
  const b = await load(page, HEAD + [song('A', 2), song('B', 2), song('C', 2)].join('\n\n\n') + '\n\n\nDid You Know?\nLittle facts\n\nFact one.\n\nFact two.');
  expect(b.pages % 4).toBe(0);
  expect(b.kinds).toEqual(['cover', 'toc', 'song', 'song', 'song', 'dyk', 'fav', 'back']);
  expect(b.songs.map(s => s.start)).toEqual([3, 4, 5]);
  await expect(page.locator('.pw[data-kind=toc] .pg')).toHaveText(['3', '4', '5']);
  await expect(page.locator('.pw[data-kind=dyk] .sub')).toHaveText('Little facts');
  await expect(page.locator('.pw[data-kind=dyk] .fact')).toHaveCount(2);
});

test('the phone version is not padded to a multiple of 4', async ({ page }) => {
  await load(page, HEAD + [song('A', 2), song('B', 2), song('C', 2)].join('\n\n\n'));
  const b = await version(page, 'mobile');
  expect(b.kinds).toEqual(['cover', 'toc', 'song', 'song', 'song', 'back']);
});

test('a two-page song starts on a left-hand page (so there is no page turn) and a spare page is added before it if needed', async ({ page }) => {
  const b = await load(page, HEAD + song('One', 1) + '\n\n\n' + song('Two', 1) + '\n\n\n' + song('Long', 5, 6) + '\n\n\n' + song('After', 1));
  const long = b.songs[2];
  expect(long.pages).toBe(2);
  expect(long.start % 2).toBe(0);                       // even = left-hand page, facing the next page
  expect(b.kinds.slice(0, 7)).toEqual(['cover', 'toc', 'song', 'song', 'fav', 'song', 'song']);
  expect(b.songs[3].start).toBe(long.start + 2);
  await expect(page.locator('.pw[data-song="2"] .contd')).toHaveText('(continued)');
  await expect(page.locator('.pw[data-kind=toc] .pg')).toHaveText(['3', '4', String(long.start), String(b.songs[3].start)]);
});

test('a song too long for a page or a spread is flagged with a note, but Make PDF is never blocked', async ({ page }) => {
  const b = await load(page, HEAD + song('Huge', 14, 6));
  expect(b.songs[0].tooLong).toBe(true);
  expect(b.songs[0].pages).toBeGreaterThan(2);
  await expect(page.locator('#status')).toContainText('Page turn');
  await expect(page.locator('#print')).toBeEnabled();
  await load(page, HEAD + song('Fine', 2));
  await expect(page.locator('#status')).not.toContainText('Page turn');
});

test('on the phone a song shrinks to stay on one page, and only spills to a second page if it must', async ({ page }) => {
  await load(page, HEAD + song('Medium', 2, 4) + '\n\n\n' + song('Short', 1) + '\n\n\n' + song('Huge', 14, 6));
  const m = await version(page, 'mobile');
  expect(m.songs[0].pages).toBe(1);
  expect(m.songs[0].size).toBeGreaterThanOrEqual(14);
  expect(m.songs[1].pages).toBe(1);
  expect(m.songs[2].pages).toBeGreaterThan(1);
  expect(m.songs[2].size).toBeGreaterThanOrEqual(16);
  expect(m.songs.some(s => s.tooLong)).toBe(false);   // a phone spill is fine, no warning
  await expect(page.locator('#status')).not.toContainText('Page turn');
  await expect(page.locator('#print')).toBeEnabled();
});

test('Did You Know? facts are spread to fill the page', async ({ page }) => {
  await load(page, HEAD + song('A', 1) + '\n\n\nDid You Know?\n\nFact one is a short one.\n\nFact two is a short one.');
  const r = await page.evaluate(() => {
    const pg = document.querySelector('.pw[data-kind=dyk]'), f = [...pg.querySelectorAll('.fact')], main = pg.querySelector('main').getBoundingClientRect();
    return { span: f.at(-1).getBoundingClientRect().bottom - f[0].getBoundingClientRect().top, main: main.height };
  });
  expect(r.span).toBeGreaterThan(r.main * 0.4);
});

test('the serif / sans-serif switch is on the main panel and changes the pages', async ({ page }) => {
  await expect(page.locator('#fontSwitch')).toBeVisible();
  await expect(page.locator('.pw[data-song="0"] .bp').first()).toHaveClass(/sans/);
  await page.click('#fSerif');
  await expect(page.locator('.pw[data-song="0"] .bp').first()).toHaveClass(/serif/);
  await expect(page.locator('.pw[data-song="0"] .body').first()).toHaveCSS('font-family', /Source Serif 4/);
  await page.click('#fontSwitch');
  await expect(page.locator('.pw[data-song="0"] .bp').first()).toHaveClass(/sans/);
});

test('repeated refrains print in full and bold every time', async ({ page }) => {
  const ref = verse(90, 2);
  await load(page, HEAD + `R\n\n${verse(1)}\n\n${ref}\n\n${verse(10)}\n\n${ref}`);
  await expect(page.locator('.pw[data-song="0"] .bst.ref')).toHaveCount(2);
  await expect(page.locator('.pw[data-song="0"] .bst.ref').nth(1)).toContainText(line(90));
});

test('a short song gets the largest type; a long line breaks only when it has to', async ({ page }) => {
  let b = await load(page, HEAD + 'Short\n\nla la la\nla la la');
  expect(b.songs[0].size).toBe(16);
  b = await version(page, 'mobile');
  expect(b.songs[0].size).toBe(20);
  await version(page, 'booklet');
  b = await load(page, HEAD + `Wide\n\n${line(1, 6)}\n${line(2, 6)}`);
  expect(b.songs[0].size).toBeGreaterThanOrEqual(13);
  expect(b.songs[0].size).toBeLessThan(b.max);  // shrinks to keep the 6-word lines whole
});

test('PRINT puts two booklet pages on each letter sheet in fold-and-staple order', async ({ page }) => {
  await load(page, HEAD + Array.from({ length: 6 }, (_, i) => song('S' + i, 1)).join('\n\n\n'));
  const b = await version(page, 'print');
  expect(b.pages).toBe(12);
  expect(b.order).toEqual([[12, 1], [2, 11], [10, 3], [4, 9], [8, 5], [6, 7]]);
  await expect(page.locator('.pw[data-sheet]')).toHaveCount(6);
  await expect(page.locator('.pw[data-sheet="0"] .bp').first()).toHaveClass(/cover/);  // back cover, left
  await expect(page.locator('.pw[data-sheet="0"] .cvt')).toHaveText('Test Book');      // front cover, right
});

test('PDF page sizes: booklet 5.5 x 8.5 in, PRINT letter landscape, phone 360 x 640 pt', async ({ page }, info) => {
  await load(page, HEAD + [song('A', 2), song('B', 2), song('C', 2)].join('\n\n\n'));
  const size = await page.$eval('.pw[data-kind=song] .bp', e => [e.offsetWidth, e.offsetHeight]);
  expect(size).toEqual([5.5 * IN, 8.5 * IN]);
  const cases = [['booklet', 8, [396, 612]], ['print', 4, [792, 612]], ['mobile', 6, [360, 640]]];
  for (const [v, pages, box] of cases) {
    await version(page, v);
    const r = await pdf(page, info.outputPath(v + '.pdf'));
    expect(r.pages, v).toBe(pages);
    for (const [w, h] of r.boxes) expect([Math.round(w), Math.round(h)], v).toEqual(box);
  }
});

test('"Add a song" puts the song after the last song, before Did You Know?, and keeps it', async ({ page }) => {
  await load(page, HEAD + song('A', 1) + '\n\n\nDid You Know?\n\nFact one.');
  await page.fill('#newTitle', 'My New Song');
  await page.fill('#newKey', 'F · Start on C');
  await page.fill('#newWords', verse(1) + '\n\n' + verse(20));
  await page.click('#addSong');
  await expect(page.locator('#added')).toContainText('Added “My New Song”. It is song 2, on page 4.');
  await expect(page.locator('#newTitle')).toHaveValue('');
  const b = await page.evaluate(() => window.BOOK);
  expect(b.songs.map(s => s.title)).toEqual(['A', 'My New Song']);
  expect(b.kinds.slice(0, 5)).toEqual(['cover', 'toc', 'song', 'song', 'dyk']);
  await expect(page.locator('.pw[data-song="1"] .key')).toHaveText('Key of F · Start on C');
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  expect((await page.evaluate(() => window.BOOK)).songs).toHaveLength(2);
});

test('"Add a song" asks for a title and words', async ({ page }) => {
  await page.fill('#newWords', 'la la');
  await page.click('#addSong');
  await expect(page.locator('#added')).toHaveText('Type the song title first.');
  await page.fill('#newTitle', 'T'); await page.fill('#newWords', '');
  await page.click('#addSong');
  await expect(page.locator('#added')).toHaveText('Type or paste the words first.');
});

test('the version buttons switch the preview and the PDF page size', async ({ page }) => {
  await page.click('#versions button[data-v=mobile]');
  await expect(page.locator('#versions button[data-v=mobile]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.$eval('#pagesize', e => e.textContent)).toContain('@page{size:5in 8.888889in;margin:0}');
  await page.click('#versions button[data-v=print]');
  await expect(page.locator('#printnote')).toContainText('flip on short edge');
  await expect(page.locator('.pw[data-sheet]').first()).toBeVisible();
});

test('on a phone, every button is a big tap target and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  for (const b of await page.locator('.panel button:visible').all()) {
    const box = await b.boundingBox();
    if (await b.evaluate(e => e.classList.contains('sw'))) continue;  // the switch has a larger invisible hit area
    expect(box.height, await b.innerText()).toBeGreaterThanOrEqual(44);
  }
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(wide).toBeLessThanOrEqual(375);
});

test('songs can be moved with the up and down buttons, and the contents follow', async ({ page }) => {
  await load(page, HEAD + song('Alpha', 1) + '\n\n\n' + song('Bravo', 1) + '\n\n\n' + song('Charlie', 1) + '\n\n\nDid You Know?\n\nFact one.');
  await page.click('#songlist li[data-i="0"] .mv[data-d="1"]');
  expect((await page.evaluate(() => window.BOOK)).songs.map(s => s.title)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  await expect(page.locator('.pw[data-kind=toc] .tt')).toHaveText(['Bravo', 'Alpha', 'Charlie']);
  await expect(page.locator('#songlist li[data-i="1"] .mv[data-d="1"]')).toBeFocused();
  await expect(page.locator('#songlist li[data-i="0"] .mv[data-d="-1"]')).toBeDisabled();
  const text = await page.inputValue('#src');
  expect(text.indexOf('Bravo')).toBeLessThan(text.indexOf('Alpha'));
  expect(text.indexOf('Charlie')).toBeLessThan(text.indexOf('Did You Know?'));   // the facts page stays after the songs
  expect((await page.evaluate(() => window.BOOK)).kinds).toContain('dyk');
});

test('songs can be dragged by the ≡ handle with the mouse', async ({ page }) => {
  await load(page, HEAD + song('Alpha', 1) + '\n\n\n' + song('Bravo', 1) + '\n\n\n' + song('Charlie', 1));
  await page.locator('#songlist').scrollIntoViewIfNeeded();
  const box = async i => (await page.locator(`#songlist li[data-i="${i}"] .h`).boundingBox());
  const a = await box(0), c = await box(2);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height + 20, { steps: 4 });
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2 + 6, { steps: 6 });
  await expect(page.locator('#songlist li.drop-below')).toHaveCount(1);
  await page.mouse.up();
  expect((await page.evaluate(() => window.BOOK)).songs.map(s => s.title)).toEqual(['Bravo', 'Charlie', 'Alpha']);
  await expect(page.locator('.pw[data-kind=toc] .tt')).toHaveText(['Bravo', 'Charlie', 'Alpha']);
});

test('the arrow keys on the ≡ handle move a song', async ({ page }) => {
  await load(page, HEAD + song('Alpha', 1) + '\n\n\n' + song('Bravo', 1));
  await page.focus('#songlist li[data-i="1"] .h');
  await page.keyboard.press('ArrowUp');
  expect((await page.evaluate(() => window.BOOK)).songs.map(s => s.title)).toEqual(['Bravo', 'Alpha']);
  await expect(page.locator('#songlist li[data-i="0"] .h')).toBeFocused();
});

test('a moved song keeps its verses, key and refrains exactly', async ({ page }) => {
  const a = song('Alpha', 2, 3), b = `Bravo\nKey of F · Start on A\n\n${verse(1, 3)}\n\n${verse(50, 2)}\n\n${verse(9, 3)}\n\n${verse(50, 2)}`;
  await load(page, HEAD + a + '\n\n\n' + b);
  await page.evaluate(() => window.bookletMaker.moveSong(1, 0));
  const text = await page.inputValue('#src');
  expect(text).toBe(b + '\n\n\n' + a + '\n');
});

test('songs can be dragged with a finger on a phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(TOOL); await page.waitForSelector('body[data-ready]');
  await load(page, HEAD + song('Alpha', 1) + '\n\n\n' + song('Bravo', 1) + '\n\n\n' + song('Charlie', 1));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#songlist').getBoundingClientRect().top + scrollY - 150));
  const a = await page.locator('#songlist li[data-i="0"] .h').boundingBox(), c = await page.locator('#songlist li[data-i="2"] .h').boundingBox();
  expect(a.height).toBeGreaterThanOrEqual(44);
  const cdp = await ctx.newCDPSession(page), x = a.x + a.width / 2, y0 = a.y + a.height / 2, y1 = c.y + c.height / 2;
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', y0);
  for (let i = 1; i <= 10; i++) await touch('touchMove', y0 + (y1 - y0) * i / 10);
  await touch('touchEnd', y1);
  expect((await page.evaluate(() => window.BOOK.songs.map(s => s.title)))).toEqual(['Bravo', 'Charlie', 'Alpha']);
  await ctx.close();
});
