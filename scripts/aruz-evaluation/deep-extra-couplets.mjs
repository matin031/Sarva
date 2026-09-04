import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const out=resolve(import.meta.dirname,'../../reports/aruz-evaluation/deep');
for(const split of ['holdout','external']) {
  const c=JSON.parse(readFileSync(join(out,`${split}-corpus.json`),'utf8'));
  const seed='sarva-extra-couplets-v1';
  const hash=s=>createHash('sha256').update(seed+s).digest('hex');
  const poems=c.poems.map(p=>({...p,pairs:p.allPairs.filter(b=>!p.pairs.some(a=>a.index===b.index)).sort((a,b)=>hash(p.url+':'+a.index).localeCompare(hash(p.url+':'+b.index))).slice(0,2)}));
  const shortPoems=poems.filter(p=>p.pairs.length<2).map(p=>({url:p.url,availableExtra:p.pairs.length}));
  writeFileSync(join(out,`${split}-extra-corpus.json`),JSON.stringify({seed,commit:c.commit,createdAt:new Date().toISOString(),note:'Exploratory extension after the prespecified two-couplet result; all poems receive available extra couplets, irrespective of errors. Short poems remain in the denominator.',shortPoems,poems:poems.filter(p=>p.pairs.length)},null,2));
}
console.log('Two extra hash-selected couplets per held-out ghazal prepared.');
