import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createJiti } from 'jiti';

const root = resolve(import.meta.dirname,'../..');
const out = join(root,'reports/aruz-evaluation');
const clean = text => text.normalize('NFC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
const arkan = text => clean(text.split('(')[0]);

if (!isMainThread) {
  const { engine, poem, mode, single } = workerData;
  const jiti = createJiti(import.meta.url, { fsCache:false });
  const {detect} = await jiti.import(join(engine,'detect.ts'));
  const {METERS} = await jiti.import(join(engine,'meters.ts'));
  const gold = arkan(poem.rhythm);
  const expected = METERS.filter(m=>arkan(m.ark)===gold);
  const matches = r => arkan(r.ark)===gold || expected.some(m=>m.pat===r.pat);
  const results = [];
  for (const pair of poem.pairs) {
    const lines = mode === 'plain' ? pair.lines.map(clean) : pair.lines;
    const start = performance.now();
    const r = detect(lines[0],single ? undefined : lines[1]);
    const rank = r.rows.findIndex(matches)+1;
    results.push({url:poem.url,poet:poem.poet,pairIndex:pair.index,mode,single:!!single,lines,gold,goldInTable:!!expected.length,rank,conf:r.conf,ms:Math.round(performance.now()-start),scanCounts:[r.s1.size,r.s2?.size??null],top:r.rows.slice(0,5),expected:r.rows.find(matches)??null});
  }
  parentPort.postMessage(results);
} else {
  const tag = process.argv[2] || 'current';
  const engine = resolve(process.argv[3] || join(root,'lib/aruz'));
  const modes = (process.argv[4] || 'plain,original').split(',');
  const limit = Number(process.argv[5] || 1e9);
  const single = process.argv.includes('--single');
  mkdirSync(out,{recursive:true});
  const corpus = JSON.parse(readFileSync(join(out,'corpus.json'),'utf8'));
  const hashes = Object.fromEntries(readdirSync(engine).filter(f=>/\.(ts|json)$/.test(f)).map(f=>[f,createHash('sha256').update(readFileSync(join(engine,f))).digest('hex')]));
  const perPoet = Number(process.argv.find(a=>a.startsWith('--per-poet='))?.split('=')[1] || 1e9);
  const seen = new Map();
  const selected = corpus.poems.filter(p=>{const n=seen.get(p.poet)||0;seen.set(p.poet,n+1);return n<perPoet;}).slice(0,limit);
  const file = join(out,tag+'.jsonl');
  const existing = process.argv.includes('--resume') ? readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const metadataFile=join(out,tag+'-metadata.json');
  if(existing.length&&existsSync(metadataFile)) {
    const previous=JSON.parse(readFileSync(metadataFile,'utf8'));
    if(JSON.stringify(previous.hashes)!==JSON.stringify(hashes)||previous.corpusCommit!==corpus.commit||previous.single!==single) {
      throw new Error('Cannot resume: engine, corpus, or single/couplet setting changed.');
    }
  }
  const jobs = selected.flatMap(poem=>modes.filter(mode=>!poem.pairs.every(p=>existing.some(r=>r.url===poem.url&&r.mode===mode&&r.pairIndex===p.index&&r.single===single))).map(mode=>({engine,poem,mode,single})));
  if (!process.argv.includes('--resume')) writeFileSync(file,'');
  const metadata={engine,hashes,corpusCommit:corpus.commit,modes,single,perPoet,selectedPoems:selected.map(p=>p.url),startedAt:new Date().toISOString()};
  writeFileSync(metadataFile,JSON.stringify(metadata,null,2));
  let done=0;
  async function consume() {
    while(jobs.length) {
      const job = jobs.shift();
      const result = await new Promise((ok,fail)=>{
        const w = new Worker(new URL(import.meta.url),{workerData:job,resourceLimits:{maxOldGenerationSizeMb:1536}});
        const timer = setTimeout(()=>{w.terminate();fail(new Error('Timeout '+job.poem.url));},180000);
        w.once('message',r=>{clearTimeout(timer);ok(r);});
        w.once('error',e=>{clearTimeout(timer);fail(e);});
        w.once('exit',code=>{if(code!==0){clearTimeout(timer);fail(new Error(`Worker exit ${code}: ${job.poem.url}`));}});
      });
      for (const row of result) appendFileSync(file,JSON.stringify(row)+'\n');
      console.log(`${tag}: ${++done} ${job.poem.url} ${job.mode} ranks=${result.map(r=>r.rank)} ms=${result.map(r=>r.ms)}`);
    }
  }
  // Fresh workers prevent the legacy engine's unbounded cache from distorting the run.
  await Promise.all([consume(),consume()]);
  writeFileSync(metadataFile,JSON.stringify({...metadata,completedAt:new Date().toISOString()},null,2));
}
