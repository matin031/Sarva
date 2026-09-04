import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const out=resolve(import.meta.dirname,'../../reports/aruz-evaluation/deep/engines');
for(const kind of ['strict-align','combined-variants']) {
  const dir=join(out,kind);mkdirSync(dir,{recursive:true});
  for(const f of readdirSync(join(out,'baseline')))copyFileSync(join(out,'baseline',f),join(dir,f));
  if(kind==='strict-align') {
    const p=join(dir,'align.ts');const s=readFileSync(p,'utf8');
    if(!s.includes('j >= m - 1 ? [] : null'))throw Error('Alignment baseline changed');
    writeFileSync(p,s.replace('j >= m - 1 ? [] : null','j === m ? [] : null'));
  } else {
    const p=join(dir,'meters.ts');const s=readFileSync(p,'utf8');
    const needle='  VAR_CACHE.set(key, out);';
    if(!s.includes(needle))throw Error('Variant baseline changed');
    writeFileSync(p,s.replace(needle,`  // Co-occurring initial faelaton substitution and terminal fe'lon.
  if (pat.startsWith("UU") && pat.endsWith("UU-")) {
    const combined = "-" + pat.slice(1, -3) + "--";
    out[combined] = Math.min(out[combined] ?? Infinity, 1.6);
  }
${needle}`));
  }
}
console.log('Strict alignment and combined-variant ablations prepared.');
