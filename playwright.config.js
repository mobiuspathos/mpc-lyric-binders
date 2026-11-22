// Settings for `npm test`. Tests open binder-maker.html in Playwright's own Chromium (hidden).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: [['list']],
  use: {
    viewport: { width: 1280, height: 900 },
    trace: 'off',
  },
});
