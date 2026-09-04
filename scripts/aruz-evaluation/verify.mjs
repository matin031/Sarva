import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const dir=resolve(import.meta.dirname,'../../reports/aruz-evaluation');
const corpus=JSON.parse(readFileSync(join(dir,'corpus.json'),'utf8'));
assert.equal(corpus.poems.length,90);
assert.equal(new Set(corpus.poems.map(p=>p.url)).size,90);
for(const poet of ['hafez','saadi','moulavi'])assert.equal(corpus.poems.filter(p=>p.poet===poet).length,30);
for(const poem of corpus.poems)assert.equal(poem.pairs.length,2);
const verified=[];
for(const [tag,expected,modes] of [['baseline-current',360,['plain','original']],['baseline-attached-plain',60,['plain']],['experiment-final-he',360,['plain','original']]]) {
  const rows=readFileSync(join(dir,tag+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const meta=JSON.parse(readFileSync(join(dir,tag+'-metadata.json'),'utf8'));
  assert.equal(rows.length,expected,tag);
  assert.equal(new Set(rows.map(r=>`${r.url}:${r.pairIndex}:${r.mode}`)).size,expected,tag+' duplicates');
  assert.equal(meta.corpusCommit,corpus.commit);
  for(const mode of modes)assert.equal(rows.filter(r=>r.mode===mode).length,expected/modes.length);
  for(const [file,hash]of Object.entries(meta.hashes))assert.equal(createHash('sha256').update(readFileSync(join(meta.engine,file))).digest('hex'),hash,tag+' changed: '+file);
  const allowed=new Set(meta.selectedPoems??corpus.poems.map(p=>p.url));
  for(const row of rows) {
    assert(allowed.has(row.url));
    const poem=corpus.poems.find(p=>p.url===row.url);
    assert(poem.pairs.some(p=>p.index===row.pairIndex));
    assert.equal(row.gold,poem.rhythm.split('(')[0].trim());
    assert(row.rank>0&&row.goldInTable);
    assert(row.top.every(r=>Number.isFinite(r.score)));
  }
  verified.push({tag,rows:rows.length,uniquePoems:new Set(rows.map(r=>r.url)).size,engineHashesUnchanged:true});
}
writeFileSync(join(dir,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),corpusCommit:corpus.commit,verified},null,2)+'\n');
console.log(verified);
