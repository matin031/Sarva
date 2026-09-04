import { createJiti } from 'jiti';
import { readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const jiti=createJiti(import.meta.url,{fsCache:false});
const {findGanjoorMeter}=await jiti.import('../../lib/ganjoor.ts');
const {normalizeGanjoorText}=await jiti.import('../../lib/ganjoor/poem.ts');
const corpus=JSON.parse(readFileSync(new URL('../../reports/aruz-evaluation/corpus.json',import.meta.url),'utf8'));
const selected=['hafez','saadi','moulavi'].flatMap(poet=>corpus.poems.filter(p=>p.poet===poet).slice(0,4));
selected.push(corpus.poems.find(p=>p.url.endsWith('/hafez/ghazal/sh167')));
const results=[];
for(const p of selected) {
  const pair=p.pairs[p.url.endsWith('/sh167')?1:0];
  const lines=pair.lines.map(s=>s.replace(/[\u064b-\u065f\u0670]/g,''));
  const start=Date.now();
  const found=await findGanjoorMeter(...lines);
  const row={url:p.url,lines,expected:p.rhythm,found,ms:Date.now()-start};
  results.push(row);
  if(found)assert.equal(normalizeGanjoorText(found.rhythm.split('(')[0]),normalizeGanjoorText(p.rhythm.split('(')[0]));
  console.log(JSON.stringify({url:p.url,found:!!found,ms:row.ms}));
}
const p=selected[0];
const wrong=await findGanjoorMeter(p.pairs[0].lines[0],p.pairs[1].lines[1],{poemId:p.id});
assert.equal(wrong,null);
const report={checkedAt:new Date().toISOString(),total:results.length,matched:results.filter(r=>r.found).length,wrongReference:0,mixedPairRejected:true,results};
assert(results.find(r=>r.url.endsWith('/hafez/ghazal/sh167')).found, 'Known scanner failure must resolve through the live reference');
writeFileSync(new URL('../../reports/aruz-evaluation/live-lookup.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,matched:report.matched,mixedPairRejected:true}));
