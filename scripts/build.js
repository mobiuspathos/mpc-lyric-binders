// Builds the two tools from src/: binder-maker.html and booklet-maker.html, with fonts and shared code inlined.
// Run: npm run build   (or: node scripts/build.js)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const FONTS = ['PlayfairDisplay-Bold', 'Oswald-Medium', 'Lato-Regular', 'Lato-Bold', 'SourceSerif4-Regular', 'SourceSerif4-Bold'];
const core = fs.readFileSync(path.join(root, 'src/lyrics-core.js'), 'utf8');
const starter = path.join(root, 'examples/caroling-booklet.txt');
for (const [src, out] of [['template.html', 'binder-maker.html'], ['booklet.html', 'booklet-maker.html']]) {
  if (!fs.existsSync(path.join(root, 'src', src))) continue;
  let s = fs.readFileSync(path.join(root, 'src', src), 'utf8');
  s = s.replace('{{lyrics-core}}', () => core);
  s = s.replace('{{starter-text}}', () => JSON.stringify(fs.existsSync(starter) ? fs.readFileSync(starter, 'utf8') : '').replace(/</g, '\\u003c'));
  for (const f of FONTS) s = s.replace(`{{${f}}}`, fs.readFileSync(path.join(root, 'src/fonts', f + '.ttf')).toString('base64'));
  if (/\{\{[\w-]+\}\}/.test(s)) throw new Error('A placeholder was not filled in ' + src);
  fs.writeFileSync(path.join(root, out), s);
  console.log(`Wrote ${out} (${Math.round(s.length / 1024)} KB)`);
}
