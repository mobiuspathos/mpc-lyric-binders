/* Shared by Binder Maker and Booklet Maker: reads typed lyrics into songs. Inlined into both tools by scripts/build.js. */
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const norm = lines => lines.join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const LABEL = /^\s*[\(\[]?\s*(refrain|chorus)\s*[\)\]]?\s*[:.\-–—]?\s*/i;
const VERSE = /^\s*[\(\[]?\s*verse\s*\d*\s*[\)\]]?\s*[:.\-–—]?\s*/i;

function splitHeader(text){
  const lines = text.replace(/\r\n?/g,'\n').split('\n'); const meta = {};
  while (lines.length){
    const m = lines[0].match(/^\s*(binder|contents|font|booklet|subtitle|closing)\s*:\s*(.*)$/i);
    if (m) { meta[m[1].toLowerCase()] = m[2].trim(); lines.shift(); }
    else if (!lines[0].trim() && Object.keys(meta).length) lines.shift();
    else break;
  }
  return { meta, body: lines.join('\n') };
}
// With { full: true } every repeated refrain keeps its full lines (the booklet prints them in full each time).
function parse(text, opts = {}){
  const { body } = splitHeader(text);
  const songs = []; let stanzas = [[]], blanks = 0;
  const flush = () => { const st = stanzas.filter(s => s.length); if (st.length) songs.push(st); stanzas = [[]]; };
  for (const raw of body.replace(/\t/g,' ').split('\n')){
    const l = raw.trim();
    if (!l){ blanks++; continue; }
    if (blanks >= 2) flush(); else if (blanks === 1) stanzas.push([]);
    blanks = 0; stanzas[stanzas.length-1].push(l.replace(/\s+/g,' '));
  }
  flush();
  return songs.map(st => {
    const first = st[0], title = first.shift(); let key = '';
    if (first.length && /^key\b/i.test(first[0])) key = first.shift();
    const underTitle = first.length > 0;
    const raw = st.filter(s => s.length);
    // labels
    const verses = [];
    for (let lines of raw){
      let labeled = false;
      const v = lines[0].match(VERSE);
      if (v && /^\s*[\(\[]?\s*verse\s*\d*\s*[\)\]]?\s*[:.\-–—]?\s*$/i.test(lines[0])) lines = lines.slice(1);
      else if (v && /[:.\-–—)\]]/.test(v[0])) lines = [lines[0].slice(v[0].length), ...lines.slice(1)];
      if (lines.length && LABEL.test(lines[0])){
        const rest = lines[0].replace(LABEL,'');
        const exact = /^\s*[\(\[]?\s*(refrain|chorus)\s*[\)\]]?\s*[:.\-–—]?\s*$/i.test(lines[0]);
        if (exact || /[:.\-–—)\]]/.test(lines[0].match(LABEL)[0])){
          labeled = true; lines = rest ? [rest, ...lines.slice(1)] : lines.slice(1);
        }
      }
      if (!lines.length && !labeled) continue;
      verses.push({ lines, labeled });
    }
    const count = {}; verses.forEach(v => { if (v.lines.length){ const n = norm(v.lines); count[n] = (count[n]||0) + 1; } });
    const seen = new Set(); let lastRef = null, lastRefLines = null, refrains = 0;
    const blocks = verses.map(v => {
      if (!v.lines.length) return opts.full && lastRefLines ? { type:'cue', text: lastRef, lines: lastRefLines } : { type:'cue', text: lastRef };
      const n = norm(v.lines), isRef = v.labeled || count[n] >= 2;
      if (!isRef) return { type:'verse', lines: v.lines };
      if (seen.has(n)) return opts.full ? { type:'cue', text: v.lines[0], lines: v.lines } : { type:'cue', text: v.lines[0] };
      seen.add(n); refrains++; lastRef = v.lines[0]; lastRefLines = v.lines;
      return { type:'ref', lines: v.lines };
    });
    const song = { title, key, blocks, verses: blocks.filter(b => b.type === 'verse').length, refrains };
    if (opts.full) song.underTitle = underTitle;   // the first block started right under the title line (no blank line)
    return song;
  });
}
