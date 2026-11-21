// Converts the old caroling-binder songs.txt markup (## Title | Key, R:, ~) to plain text.
// Run: node scripts/convert-legacy.js songs.txt out.txt
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8').split('\n');
const songs=[];
for(const raw of src){
  if(raw.startsWith('#')&&!raw.startsWith('## '))continue;
  if(raw.startsWith('## ')){const[t,k]=raw.slice(3).split('|');songs.push({t:t.trim(),k:(k||'').trim(),st:[[]]});continue}
  const s=songs[songs.length-1];if(!s)continue;
  if(!raw.trim()){if(s.st.at(-1).length)s.st.push([]);continue}
  const l=raw.trim(), cur=s.st.at(-1);
  if(l.startsWith('~'))cur[cur.length-1]+=' '+l.slice(1);else cur.push(l);
}
const norm=a=>a.join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let out='Binder: Mission Peak Choir · Holiday Caroling\nContents: no\n\n\n';
out+=songs.map(s=>{
  const st=s.st.filter(x=>x.length);
  const cnt={};st.forEach(x=>{const n=norm(x[0].startsWith('R:')?[x[0].slice(2),...x.slice(1)]:x);cnt[n]=(cnt[n]||0)+1});
  const body=st.map(x=>{const r=x[0].startsWith('R:');const L=r?[x[0].slice(2),...x.slice(1)]:x;const n=norm(L);
    if(r&&cnt[n]<2){console.error('label needed:',s.t);L[0]='Refrain: '+L[0]}
    if(!r&&cnt[n]>=2)console.error('auto-refrain on non-R stanza:',s.t,L[0]);
    return L.join('\n')}).join('\n\n');
  return s.t+(s.k?'\n'+s.k:'')+'\n\n'+body;
}).join('\n\n\n')+'\n';
fs.writeFileSync(process.argv[3],out);console.error(songs.length,'songs');
