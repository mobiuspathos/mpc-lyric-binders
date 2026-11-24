# Binder Maker

Turns pasted lyrics into letter-size binder pages in the Mission Peak Choir caroling layout: one song per page, big type, black and white, double-sided.

This folder also holds **Booklet Maker** (`booklet-maker.html`), which makes the Holiday Caroling booklet. See [Booklet Maker](#booklet-maker) below.

## Use it
There are two ways to open Binder Maker. Both need Chrome or Edge on a computer.

**Double-click (everyone).** Download `binder-maker.html` and double-click it. It works offline. Opening the file inside Google Drive only shows a preview. Download it first.

**Docker (power-users, development).** With Docker Desktop running, run `docker compose up -d web` in this folder and go to http://localhost:8080. Stop it with `docker compose down`.
- It works only on the Mac running it.
- It rebuilds `binder-maker.html` whenever you save a file in `src/`. Reload the page to see the change.
- Text you type there is saved apart from the double-clicked file. Neither one sees the other's lyrics.

Then:
1. Open Binder Maker one of the two ways above.
2. Paste lyrics, or click **Open text** and pick a `.txt` file (try `examples/holiday-caroling.txt`).
3. Check the preview. Fix anything by editing the text.
4. Click **Make PDF** and choose **Save as PDF**. Leave Scale at Default (100%).

## How to type lyrics
Tap or hover the **?** next to Lyrics for a quick example. The full rules are under **How to type lyrics** in the tool.

- **New song:** two blank lines. **New verse:** one blank line.
- **Title:** the first line of each song.
- **Key (optional):** a line starting with "Key" right under the title, like `Key of C · Start on G`.
- **Refrains:** a verse that repeats word for word is a refrain. To mark one yourself, start it with `Refrain:` or `Chorus:`. A verse that is only `Refrain` prints as a cue. The first refrain prints in full; repeats print as a one-line cue.
- Long lines wrap on their own. Lines like `Verse 2` are dropped.
- Optional header lines at the top of a saved file: `Binder: <footer name>`, `Contents: yes|no` and `Font: serif|sans`.
- Lettering toggle: Serif (default: Playfair Display titles, Source Serif 4 lyrics) or Sans-serif (Lato titles and lyrics). An empty binder name prints no name in the footer.

## Rules the tool enforces
- Type is as large as fits, up to 30 pt, and never below 16 pt. A song that is too long is flagged in red and the PDF is blocked. Cut a verse or split the song.
- Layout is locked to the approved brand sheet: Lato (lyrics), Playfair Display (titles), Oswald (key box).
- Contents page (optional) goes on its own sheet with a blank back, so songs still start on a right-hand page.
- A binder with only one song has no song number box, no "Song 1 of 1" in the footer (the binder name stays), and no contents page even if that box is ticked.

## Printing
US Letter, no bleed, black and white. Double-sided, flip on long edge, 100% scale. Margins: 0.85 in binding side (mirrored), 0.5 in outside, 0.45 in top, 0.4 in bottom. Odd songs on right-hand pages, so each song is one open page with no turns.

## Booklet Maker
Makes the Holiday Caroling booklet in its three versions from one text:
- **Booklet:** 5.5 × 8.5 in pages in reading order, for email and screens.
- **PRINT:** letter paper, landscape, two booklet pages per side in fold order. Print double-sided, flip on short edge, 100% scale; fold the stack and staple the fold.
- **Phone:** 5 in wide pages with bigger type. The type shrinks (down to 14 pt) to keep each song on one page; if that isn't enough, the song carries on to a second page at 16 pt or more.

**Reorder songs** by dragging the big ≡ handle (mouse or finger) or tapping ▲ ▼; the contents and page numbers follow. Open `booklet-maker.html` the same two ways as Binder Maker (Docker: http://localhost:8080/booklet-maker.html). The first time, it starts with the 2026 booklet (`examples/caroling-booklet.txt`). Use **Add a song**, pick a version, and press **Make PDF**. Chrome names the PDF after the booklet title, with `_PRINT` or `_mobile` added.

Rules it follows:
- Same typing rules as Binder Maker. Repeated refrains print in full, in bold, every time.
- Header lines at the top of a saved file: `Booklet:`, `Subtitle:`, `Closing:` (a `/` starts the smaller second line on the back cover) and `Font: serif|sans`.
- A section titled `Did You Know?` becomes a facts page after the songs. A line right under that title is its subtitle; each paragraph is one fact.
- Type is as big as fits: 13 to 16 pt in the booklet, 16 to 20 pt on the phone. Sizes that keep every line whole win. No song needs a page turn mid-song: it fits one page, or two facing pages (it then starts on a left-hand page; a "Did You Know?" page, or a lined page, fills any gap before it). A song too long for that is flagged with a note and still prints with a page turn; the PDF is never blocked. Cutting a verse or splitting the song fixes it. On the phone a spill to a second page is fine. "Did You Know?" facts are spaced to fill their page. The Serif / Sans-serif switch is on the main panel.
- The booklet and PRINT are always a multiple of 4 pages; spare pages become "Our Favorites" pages with lines. The phone version is not padded.
- Colors and fonts follow the approved brand sheet: Deep Green titles and icons, Ink text, Lato / Playfair Display / Oswald (Source Serif 4 lyrics when Serif is picked).

`docker compose run --rm booklet-pdf examples/caroling-booklet.txt booklet-pdfs` writes all three PDFs into `booklet-pdfs/` and prints each song's type size and pages. With Node.js installed, `npm run booklet -- examples/caroling-booklet.txt booklet-pdfs` does the same.

## Developing
- `src/template.html` (Binder Maker) and `src/booklet.html` (Booklet Maker) are the sources; `src/lyrics-core.js` is the lyrics reader both share. `docker compose run --rm build-html` inlines the fonts, the shared code and the starter booklet, and writes `binder-maker.html` and `booklet-maker.html`. Commit the sources and both built files. With Node.js installed, `npm run build` does the same.
- `docker compose run --rm pdf examples/holiday-caroling.txt binder.pdf` renders a PDF without opening Chrome, and prints each song's type size. With Node.js installed, `npm install` then `npm run pdf -- examples/holiday-caroling.txt binder.pdf` does the same.
- To open the tool from Docker while you work on it, see **Docker (power-users, development)** under **Use it**.
- `docker compose run --rm convert-legacy songs.txt out.txt` converts the old `songs.txt` markup to plain text. Copy `songs.txt` into this folder first; Docker sees only this folder. With Node.js installed, `node scripts/convert-legacy.js songs.txt out.txt` does the same.
- Fonts in `src/fonts` are unmodified and under the SIL Open Font License (`src/fonts/OFL.txt`).

## Testing
Run the tests after any change, before committing. You only need Docker Desktop running; Node.js and the test browser live inside the container. In this folder:

```bash
docker compose run --rm test
```

The first run downloads the test image (about 3.7 GB) and takes a few minutes. After that it takes about 15 seconds. It rebuilds `binder-maker.html` from `src/template.html` first, then opens it in a hidden browser and checks:
- **Typing rules:** songs, verses, titles, key box, refrains and cues, dropped `Verse 2` lines.
- **Layout:** type stays between 16 and 30 pt, long lines wrap, too-long songs are flagged and the PDF is blocked, the contents page has a blank back, a one-song binder drops the song number and contents page, mirrored margins, US Letter.
- **Editor:** the **?** tip opens on hover and tap and closes with Esc or a tap outside, **More help below** opens the help, and text is saved in the browser.
- **The real binder:** all 17 songs in `examples/holiday-caroling.txt` fit with nothing flagged, and Hark! comes out at about 17 pt.

- **Booklet Maker:** the 2026 booklet renders in all three versions, page order and the multiple of 4, two-page songs on facing pages, too-long songs flagged but never blocked, phone shrink-then-spill, contents page numbers, the serif switch, PRINT fold order, PDF page sizes, **Add a song**, and big tap targets on a phone, and reordering songs by mouse drag, finger drag, arrow keys and ▲ ▼.

It ends with "60 passed". A red ✘ names the rule that broke and shows what it expected. If you have Node.js installed, `npm install` once and then `npm test` does the same without Docker.

When you change a rule on purpose, update the matching test in `tests/` in the same commit. If you change the Playwright version in `package.json`, change it in `Dockerfile` too.

Only add lyrics you have the right to print, such as public-domain carols.
