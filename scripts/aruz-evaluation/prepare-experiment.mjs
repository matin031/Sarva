import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const dir=join(root,'reports/aruz-evaluation/experimental-engine');
mkdirSync(dir,{recursive:true});
for(const file of ['engine.ts','detect.ts','meters.ts','align.ts','lexicon.ts','lexicon.json','ranker.json']) {
  copyFileSync(join(root,'lib/aruz',file),join(dir,file));
}
const target=join(dir,'engine.ts');
const source=readFileSync(target,'utf8');
const before='last && n > 1 && prevb !== "آ"';
if(!source.includes(before))throw new Error('The baseline has changed; review this experiment before rerunning.');
writeFileSync(target,source.replace(before,before+' && prevb !== "ا"'));
console.log('Experimental copy prepared. Production engine unchanged.');
