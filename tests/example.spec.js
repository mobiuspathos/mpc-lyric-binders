// The real 17-song caroling binder in examples/ must always render cleanly.
const { test, expect } = require('@playwright/test');
const { openTool, loadLyrics, EXAMPLE } = require('./helpers');

test('the 17-song caroling example renders with no songs flagged', async ({ page }, info) => {
  const errors = await openTool(page);
  const fit = await loadLyrics(page, EXAMPLE);

  expect(fit).toHaveLength(17);
  const flagged = fit.filter(r => !r.ok).map(r => r.title);
  expect(flagged, 'songs flagged as too long').toEqual([]);
  for (const r of fit) expect(r.size, r.title).toBeGreaterThanOrEqual(16);

  await expect(page.locator('.pw.flag')).toHaveCount(0);
  await expect(page.locator('#print')).toBeEnabled();
  await expect(page.locator('#status')).toContainText('Ready to print');
  await expect(page.locator('#name')).toHaveValue('Mission Peak Choir · Holiday Caroling');

  const hark = fit.find(r => r.title.startsWith('Hark!'));
  expect(hark.size).toBeGreaterThanOrEqual(16.5);
  expect(hark.size).toBeLessThanOrEqual(17.5);

  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: info.outputPath('caroling.pdf'), preferCSSPageSize: true, printBackground: true });
  expect(errors).toEqual([]);
});
