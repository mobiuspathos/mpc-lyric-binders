// Builds binder-maker.html: src/template.html with the fonts in src/fonts inlined.
// Run: npm run build   (or: node scripts/build.js)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let s = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
for (const f of ['PlayfairDisplay-Bold', 'Oswald-Medium', 'Lato-Regular', 'Lato-Bold'])
  s = s.replace(`{{${f}}}`, fs.readFileSync(path.join(root, 'src/fonts', f + '.ttf')).toString('base64'));
if (/\{\{[\w-]+\}\}/.test(s)) throw new Error('A font placeholder was not filled');
fs.writeFileSync(path.join(root, 'binder-maker.html'), s);
console.log(`Wrote binder-maker.html (${Math.round(s.length / 1024)} KB)`);
