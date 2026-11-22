// The editor panel: the "?" formatting tip, "More help below", and autosave.
const { test, expect } = require('@playwright/test');
const { openTool } = require('./helpers');

test.describe('on a computer (mouse)', () => {
  test.beforeEach(async ({ page }) => { await openTool(page); });

  test('the ? tip opens on hover and closes when the mouse leaves', async ({ page }) => {
    await expect(page.locator('#tip')).toBeHidden();
    await page.hover('#tipbtn');
    await expect(page.locator('#tip')).toBeVisible();
    await expect(page.locator('#tiptext')).toContainText('Song Title');
    await page.mouse.move(900, 800);
    await expect(page.locator('#tip')).toBeHidden();
  });

  test('clicking ? opens the tip and Esc closes it, returning focus to ?', async ({ page }) => {
    await page.click('#tipbtn');
    await page.mouse.move(900, 800); // move away so hover does not keep it open
    await expect(page.locator('#tip')).toBeVisible();
    await expect(page.locator('#tipbtn')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#tip')).toBeHidden();
    await expect(page.locator('#tipbtn')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#tipbtn')).toBeFocused();
  });

  test('"More help below" closes the tip and opens the full help', async ({ page }) => {
    await expect(page.locator('#help')).not.toHaveAttribute('open', '');
    await page.click('#tipbtn');
    await page.click('#tipmore');
    await expect(page.locator('#help')).toHaveAttribute('open', '');
    await expect(page.locator('#help summary')).toBeFocused();
    await expect(page.locator('#tipwrap')).not.toHaveClass(/open/);
  });

  test('typed text, binder name and contents choice are saved and come back after reopening', async ({ page }) => {
    await page.fill('#name', 'Spring Concert');
    await page.check('#toc');
    await page.fill('#src', 'Saved Song\n\nla la la');
    await page.waitForTimeout(800); // autosave runs shortly after typing stops
    await page.reload();
    await page.waitForSelector('body[data-ready]');
    await expect(page.locator('#src')).toHaveValue('Saved Song\n\nla la la');
    await expect(page.locator('#name')).toHaveValue('Spring Concert');
    await expect(page.locator('#toc')).toBeChecked();
    await expect(page.locator('#p0 h2')).toHaveText('Saved Song');
  });
});

test.describe('on a phone or tablet (touch)', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => { await openTool(page); });

  test('tapping ? opens the tip and tapping outside closes it', async ({ page }) => {
    await expect(page.locator('#tip')).toBeHidden();
    await page.tap('#tipbtn');
    await expect(page.locator('#tip')).toBeVisible();
    await page.tap('h1');
    await expect(page.locator('#tip')).toBeHidden();
  });

  test('tapping ? again closes the tip', async ({ page }) => {
    await page.tap('#tipbtn');
    await expect(page.locator('#tip')).toBeVisible();
    await page.tap('#tipbtn');
    await expect(page.locator('#tip')).toBeHidden();
  });

  test('tapping inside the tip does not close it', async ({ page }) => {
    await page.tap('#tipbtn');
    await page.tap('#tiptext');
    await expect(page.locator('#tip')).toBeVisible();
  });
});
