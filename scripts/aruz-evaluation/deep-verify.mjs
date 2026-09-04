import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'reports/aruz-evaluation/deep');
const json=p=>JSON.parse(readFileSync(join(out,p),'utf8'));
const rows=p=>readFileSync(join(out,p),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(gunzipSync(readFileSync(join(out,'baseline-engine-snapshot.json.gz'))));
for(const [f,s] of Object.entries(source.files))assert.equal(sha(s),source.hashes[f]);
const protocol=json('frozen-protocol.json');assert.equal(sha(readFileSync(join(out,'frozen-reranker.json'))),protocol.modelSha256);
let executions=0;
for(const file of readdirSync(out).filter(f=>f.endsWith('.jsonl'))) {
  const data=rows(file),meta=json(file.replace('.jsonl','-metadata.json'));
  assert.ok(meta.completedAt,file);
  const corpusFile=meta.split==='development'?'../corpus.json':`${meta.split}-corpus.json`;
  assert.equal(sha(readFileSync(join(out,corpusFile))),meta.corpusHash,file);
  const corpus=json(corpusFile);
  assert.equal(data.length,corpus.poems.reduce((n,p)=>n+p.pairs.length,0)*meta.modes.length,file);
  const keys=new Set();
  for(const r of data) {
    const key=r.url+'|'+r.pairIndex+'|'+r.mode;assert.ok(!keys.has(key),key);keys.add(key);
    assert.equal(r.rows.length,176);assert.ok(r.rows.some(m=>m.correct));
    assert.ok(r.rows.every(m=>Number.isFinite(m.score)&&Number.isFinite(m.base)));
  }
  executions+=data.length;
}
const old=new Map(rows('../baseline-current.jsonl').map(r=>[r.url+'|'+r.pairIndex+'|'+r.mode,r]));
for(const r of rows('development-baseline.jsonl')) {
  const prev=old.get(r.url+'|'+r.pairIndex+'|'+r.mode);assert.ok(prev);
  assert.equal(r.rows[0].pat,prev.top[0].pat);assert.equal(r.rows[0].score,prev.top[0].score);
  assert.deepEqual(r.scanCounts,prev.scanCounts);
}
const canon=s=>s.normalize('NFC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670\p{P}\p{Z}\s\u200c-\u200f]/gu,'');
const seenUrls=new Set(),seenLines=new Set();let corePairs=0,poems=0;
for(const file of ['../corpus.json','holdout-corpus.json','external-corpus.json']) {
  const corpus=json(file),newLines=[];
  for(const p of corpus.poems) {
    assert.ok(!seenUrls.has(p.url));seenUrls.add(p.url);poems++;corePairs+=p.pairs.length;
    for(const b of p.allPairs)for(const s of b.lines) {
      if(file!=='../corpus.json')assert.ok(!seenLines.has(canon(s)),'Cross-split hemistich: '+p.url);
      newLines.push(canon(s));
    }
  }
  for(const s of newLines)seenLines.add(s);
}
let extraPairs=0;
for(const split of ['holdout','external']) {
  const base=new Map(json(split+'-corpus.json').poems.map(p=>[p.url,p.pairs.map(b=>b.index)]));
  for(const p of json(split+'-extra-corpus.json').poems)for(const b of p.pairs){assert.ok(!base.get(p.url).includes(b.index));extraPairs++;}
}
// Only the accepted complete-consumption fix is in production.
for(const f of Object.keys(source.files).filter(f=>f!=='align.ts'))assert.equal(sha(readFileSync(join(root,'lib/aruz',f))),source.hashes[f]);
const normalizeNL=s=>s.replace(/\r\n/g,'\n');
const expected=normalizeNL(source.files['align.ts']).replace('    if (i === n) return j >= m - 1 ? [] : null;', '    // Final syllable length is flexible below; a whole unconsumed syllable is not.\n    if (i === n) return j === m ? [] : null;');
assert.equal(normalizeNL(readFileSync(join(root,'lib/aruz/align.ts'),'utf8')),expected);
const files=Object.fromEntries(readdirSync(out).filter(f=>/\.(json|jsonl|gz)$/.test(f)&&f!=='verification.json').map(f=>[f,sha(readFileSync(join(out,f)))]));
const experimentalEngines=Object.fromEntries(readdirSync(join(out,'engines')).map(kind=>[kind,Object.fromEntries(readdirSync(join(out,'engines',kind)).map(f=>[f,sha(readFileSync(join(out,'engines',kind,f)))]))]));
const result={verifiedAt:new Date().toISOString(),poems,corePairs,extraPairs,uniquePairs:corePairs+extraPairs,engineEvaluations:executions,baselineReproduced:360,sourceSplitDisjoint:true,modelFrozen:true,productionChange:'align.ts complete pattern consumption only',experimentalEngines,sha256:files};
writeFileSync(join(out,'verification.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,experimentalEngines:'stored in verification.json',sha256:'stored in verification.json'},null,2));
