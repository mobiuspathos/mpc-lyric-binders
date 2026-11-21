# Binder Maker

Turns pasted lyrics into letter-size binder pages in the Mission Peak Choir caroling layout: one song per page, big type, black and white, double-sided.

## Use it
1. Download `binder-maker.html` and double-click it. Use Chrome or Edge on a computer. It works offline.
2. Paste lyrics, or click **Open text** and pick a `.txt` file (try `examples/holiday-caroling.txt`).
3. Check the preview. Fix anything by editing the text.
4. Click **Make PDF** and choose **Save as PDF**. Leave Scale at Default (100%).

Opening the file inside Google Drive only shows a preview. Download it first.

## How to type lyrics
Tap or hover the **?** next to Lyrics for a quick example. The full rules are under **How to type lyrics** in the tool.

- **New song:** two blank lines. **New verse:** one blank line.
- **Title:** the first line of each song.
- **Key (optional):** a line starting with "Key" right under the title, like `Key of C · Start on G`.
- **Refrains:** a verse that repeats word for word is a refrain. To mark one yourself, start it with `Refrain:` or `Chorus:`. A verse that is only `Refrain` prints as a cue. The first refrain prints in full; repeats print as a one-line cue.
- Long lines wrap on their own. Lines like `Verse 2` are dropped.
- Optional header lines at the top of a saved file: `Binder: <footer name>` and `Contents: yes|no`.

## Rules the tool enforces
- Type is as large as fits, up to 30 pt, and never below 16 pt. A song that is too long is flagged in red and the PDF is blocked. Cut a verse or split the song.
- Layout is locked to the approved brand sheet: Lato (lyrics), Playfair Display (titles), Oswald (key box).
- Contents page (optional) goes on its own sheet with a blank back, so songs still start on a right-hand page.

## Printing
US Letter, no bleed, black and white. Double-sided, flip on long edge, 100% scale. Margins: 0.85 in binding side (mirrored), 0.5 in outside, 0.45 in top, 0.4 in bottom. Odd songs on right-hand pages, so each song is one open page with no turns.

## Developing
- `src/template.html` is the source. `npm run build` inlines the fonts and writes `binder-maker.html`. Commit both.
- `npm install` then `npm run pdf -- examples/holiday-caroling.txt out.pdf` renders a PDF headlessly (Playwright).
- `scripts/convert-legacy.js` converts the old `songs.txt` markup to plain text.
- Fonts in `src/fonts` are unmodified and under the SIL Open Font License (`src/fonts/OFL.txt`).

Only add lyrics you have the right to print, such as public-domain carols.
