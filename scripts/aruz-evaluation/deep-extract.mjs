import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createJiti } from 'jiti';
const root=resolve(import.meta.dirname,'../..'), out=join(root,'reports/aruz-evaluation/deep');
const clean=s=>s.normalize('NFC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک');
const arkan=s=>clean(s.split('(')[0]).trim().replace(/\s+/g,' ');
if(!isMainThread) {
  const {poem,kind,modes}=workerData;
  const jiti=createJiti(import.meta.url,{fsCache:false});
  const {detect}=await jiti.import(join(out,'engines',kind,'detect.ts'));
  const {METERS}=await jiti.import(join(out,'engines',kind,'meters.ts'));
  const gold=arkan(poem.rhythm), pats=METERS.filter(m=>arkan(m.ark)===gold).map(m=>m.pat);
  const results=[];
  for(const mode of modes)for(const pair of poem.pairs) {
    const lines=mode==='plain'?pair.lines.map(clean):pair.lines;
    const start=performance.now(), r=detect(...lines);
    results.push({url:poem.url,poet:poem.poet,pairIndex:pair.index,mode,lines,gold,pats,ms:Math.round(performance.now()-start),scanCounts:[r.s1.size,r.s2.size],rows:r.rows.map(m=>({...m,correct:arkan(m.ark)===gold||pats.includes(m.pat),base:m.score-(m.lex??0)}))});
  }
  parentPort.postMessage(results);
} else {
  const split=process.argv[2]??'development',kind=process.argv[3]??'baseline';
  const modes=(process.argv[4]??'plain').split(',');
  const corpusFile=join(out,split==='development'?'../corpus.json':`${split}-corpus.json`);
  const corpus=JSON.parse(readFileSync(corpusFile,'utf8'));
  const file=join(out,`${split}-${kind}.jsonl`);
  const resume=process.argv.includes('--resume');
  const previous=resume?readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
  const limit=Number(process.argv.find(s=>s.startsWith('--limit='))?.split('=')[1]??1e9);
  const jobs=corpus.poems.slice(0,limit).filter(p=>!modes.every(mode=>p.pairs.every(b=>previous.some(r=>r.url===p.url&&r.mode===mode&&r.pairIndex===b.index))));
  const metadata={split,kind,modes,corpusHash:createHash('sha256').update(readFileSync(corpusFile)).digest('hex'),engineManifest:JSON.parse(readFileSync(join(out,'engine-manifest.json'),'utf8')),startedAt:new Date().toISOString()};
  const metaFile=file.replace('.jsonl','-metadata.json');
  if(resume) {
    const old=JSON.parse(readFileSync(metaFile,'utf8'));
    if(old.corpusHash!==metadata.corpusHash||JSON.stringify(old.engineManifest)!==JSON.stringify(metadata.engineManifest)||JSON.stringify(old.modes)!==JSON.stringify(modes))throw Error('Resume mismatch');
  }else{writeFileSync(file,'');writeFileSync(metaFile,JSON.stringify(metadata,null,2));}
  let done=0;
  async function consume() {
    while(jobs.length) {
      const poem=jobs.shift();
      const result=await new Promise((ok,fail)=>{
        const w=new Worker(new URL(import.meta.url),{workerData:{poem,kind,modes},resourceLimits:{maxOldGenerationSizeMb:1200}});
        const timer=setTimeout(()=>{w.terminate();fail(Error('Timeout '+poem.url));},240000);
        w.once('message',r=>{clearTimeout(timer);ok(r);});w.once('error',e=>{clearTimeout(timer);fail(e);});
        w.once('exit',code=>{if(code){clearTimeout(timer);fail(Error('Worker exit '+code));}});
      });
      for(const r of result)appendFileSync(file,JSON.stringify(r)+'\n');
      done++; if(done%5===0)console.log(split,kind,done,'remaining',jobs.length);
    }
  }
  await Promise.all([consume(),consume()]);
  writeFileSync(metaFile,JSON.stringify({...metadata,completedAt:new Date().toISOString()},null,2));
  console.log('Done',file);
}
