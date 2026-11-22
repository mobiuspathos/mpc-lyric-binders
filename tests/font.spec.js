// The Serif / Sans-serif lettering toggle, and the empty binder name.
const { test, expect } = require('@playwright/test');
const { openTool, loadLyrics, verse } = require('./helpers');

const SONG = `Test Song\n\n${verse(1)}\n\n${verse(10)}`;
const fontOf = (page, sel) => page.$eval(sel, e => getComputedStyle(e).fontFamily);

test('serif is the default: Playfair titles and Source Serif lyrics', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, SONG);
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'true');
  expect(await fontOf(page, '#p0 h2')).toContain('Playfair Display');
  expect(await fontOf(page, '#p0 .body')).toContain('Source Serif 4');
  expect(await page.$eval('#fontSwitch', e => e.offsetHeight)).toBe(30);
});

test('the switch changes titles and lyrics to Lato, and Serif switches back', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, SONG);
  await page.click('#fontSwitch');
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#fSans')).toHaveAttribute('aria-pressed', 'true');
  expect(await fontOf(page, '#p0 h2')).toMatch(/^Lato/);
  expect(await fontOf(page, '#p0 .body')).toMatch(/^Lato/);
  await page.click('#fontSwitch');
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'true');
  expect(await fontOf(page, '#p0 h2')).toContain('Playfair Display');
  expect(await fontOf(page, '#p0 .body')).toContain('Source Serif 4');
});

test('clicking the words Sans-serif and Serif also switches', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, SONG);
  await page.click('#fSans');
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'false');
  await page.click('#fSerif');
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'true');
});

test('the font choice is saved in the browser and comes back after reopening', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, SONG);
  await page.click('#fontSwitch');
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'false');
  expect(await fontOf(page, '#p0 .body')).toMatch(/^Lato/);
});

test('a "Font:" line in a saved file sets the toggle, and Save writes it', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, `Binder: Spring\nFont: sans\n\n\n${SONG}`);
  await expect(page.locator('#fontSwitch')).toHaveAttribute('aria-checked', 'false');
  await page.click('#fontSwitch');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const text = require('fs').readFileSync(await dl.path(), 'utf8');
  expect(text).toMatch(/^Binder: Spring\nContents: no\nFont: serif\n/);
});

test('an empty binder name prints no name; the hint is only an example', async ({ page }) => {
  await openTool(page);
  await loadLyrics(page, `Binder: \n\n\n${SONG}\n\n\nSecond Song\n\n${verse(20)}`);
  await expect(page.locator('#name')).toHaveAttribute('placeholder', 'Ensemble · Event');
  await expect(page.locator('#p0 footer span').first()).toHaveText('');
  await expect(page.locator('#p0 footer')).toContainText('Song 1 of 2');
});
