// Shared bits for the tests: open the built tool and feed it lyrics.
const path = require('path');
const fs = require('fs');

const TOOL = 'file://' + path.resolve(__dirname, '../binder-maker.html');
const EXAMPLE = fs.readFileSync(path.resolve(__dirname, '../examples/holiday-caroling.txt'), 'utf8');

// Opens Binder Maker and waits until fonts are loaded and the first render is done.
async function openTool(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(TOOL);
  await page.waitForSelector('body[data-ready]');
  return errors;
}

// Loads lyrics the same way "Open text" does, and returns the fit results per song.
async function loadLyrics(page, text) {
  await page.evaluate(t => window.binderMaker.applyText(t), text);
  return page.evaluate(() => window.FIT);
}

// Runs the tool's own parser on some text and returns the songs it found.
function parse(page, text) {
  return page.evaluate(t => window.binderMaker.parse(t), text);
}

// Made-up lines, so the tests never need real lyrics.
const line = (n, words = 5) => Array.from({ length: words }, (_, i) => `word${n}x${i}`).join(' ');
const verse = (start, lines = 4) => Array.from({ length: lines }, (_, i) => line(start + i)).join('\n');

module.exports = { TOOL, EXAMPLE, openTool, loadLyrics, parse, line, verse };
