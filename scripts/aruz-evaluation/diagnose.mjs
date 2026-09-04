import { createJiti } from 'jiti';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const jiti=createJiti(import.meta.url,{fsCache:false});
const engine=await jiti.import(join(root,'lib/aruz/engine.ts'));
const {findMeterLocally}=await jiti.import(join(root,'lib/aruz/index.ts'));
const {METERS,meterVariants}=await jiti.import(join(root,'lib/aruz/meters.ts'));
const lex=JSON.parse(readFileSync(join(root,'lib/aruz/lexicon.json'),'utf8'));
const model=JSON.parse(readFileSync(join(root,'lib/aruz/ranker.json'),'utf8'));
const corpus=JSON.parse(readFileSync(join(root,'reports/aruz-evaluation/corpus.json'),'utf8'));
const bare=s=>s.normalize('NFC').replace(/[\u064b-\u065f\u0670]/g,'');
const lines=corpus.poems.flatMap(p=>p.pairs.flatMap(b=>b.lines));
const meter=METERS.find(m=>m.ark==='فعلاتن فعلاتن فعلاتن فعلن');
const combined='-'+meter.pat.slice(1,-3)+'--';
const coverage=xs=>{
  const words=xs.flatMap(s=>engine.normalize(s).split(/\s+/));
  return {tokens:words.length,known:words.filter(w=>lex[w]).length};
};
const result={
  wordDiagnostics:['راه','ماه','نگاه','خانه','خانهٔ','خانۀ','پِی','مِی','رَه','بِه','خِرقِه','دلِ'].map(word=>({word,normalized:engine.normalize(word),tokens:engine.tokenizeWord(engine.normalize(word)),scans:[...engine.scanLine(word)],lexicon:lex[word]??null})),
  invalidInputDiagnostics:['سلام','الف '.repeat(15)].map(text=>({text,result:findMeterLocally(text)})),
  variants:{meter:meter.ark,base:meter.pat,combinedStartAndEnding:combined,combinedPresent:combined in meterVariants(meter.pat,meter.name)},
  lexicon:{entries:Object.keys(lex).length,original:coverage(lines),plain:coverage(lines.map(bare))},
  ui:{lines:lines.length,originalOver40:lines.filter(s=>s.length>40).length,plainOver40:lines.filter(s=>bare(s).length>40).length,originalRejectedByRegex:lines.filter(s=>!(/^[\u0600-\u06FF\u200C\u200E\u200F\s]+$/).test(s)).length},
  ranker:{kind:model.kind,features:model.feats.length,hidden:model.b1.length,nTrain:model.n_train,storedValAccuracy:model.val_acc,trainingManifestAvailable:false},
};
writeFileSync(join(root,'reports/aruz-evaluation/diagnostics.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
