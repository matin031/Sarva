// Experimental word-weight lattice. No text lookup and no gold labels in scoring.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createJiti } from 'jiti';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'reports/aruz-evaluation/deep');
const jiti=createJiti(import.meta.url,{fsCache:false});
const {normalize,scanLine}=await jiti.import(join(out,'engines/phonetics/engine.ts'));
const {meterVariants}=await jiti.import(join(out,'engines/baseline/meters.ts'));
const lex=JSON.parse(readFileSync(join(root,'lib/aruz/lexicon.json'),'utf8'));
const cache=new Map();
const bare=s=>normalize(s).replace(/[\u064b-\u065f\u0670]/g,'');
function options(word,last) {
  const k=word+'|'+last;if(cache.has(k))return cache.get(k);
  const entry=lex[word],out=new Map();
  const put=(pat,c)=>{if(pat&&pat.length<=9)out.set(pat,Math.min(out.get(pat)??Infinity,c));};
  if(entry) {
    const n=Object.values(entry).reduce((a,b)=>a+b,0);
    for(const [p,count] of Object.entries(entry))put(p,-Math.log10((count+.2)/(n+1)));
  } else {
    // Isolated scans force final length; retain both ending lengths as unknown.
    for(const [p,c] of scanLine(word)) {put(p,1+c);if(p.endsWith('-'))put(p.slice(0,-1)+'U',1+c);}
  }
  // A contextual ezafe may be absent from the observed dictionary pattern.
  if(!last)for(const [p,c] of [...out])put(p+'U',c+1);
  if(last)for(const [p,c] of [...out]) {
    if(p.endsWith('-U'))put(p.slice(0,-1),c);
    if(p.endsWith('U'))put(p.slice(0,-1)+'-',c);
  }
  const result=[...out];cache.set(k,result);return result;
}
function cost(words,pat) {
  let states=new Map([[0,0]]);
  for(let wi=0;wi<words.length;wi++) {
    const opts=options(words[wi],wi===words.length-1),next=new Map();
    if(!opts.length)return 20;
    for(const [pos,prev] of states)for(const [p,lp] of opts) {
      const end=pos+p.length;if(end>pat.length)continue;
      let c=prev+.35*lp;
      for(let i=0;i<p.length;i++)if(pos+i!==pat.length-1&&p[i]!==pat[pos+i])c+=p[i]==='U'?.5:1;
      if(c<(next.get(end)??Infinity))next.set(end,c);
    }
    states=next;
  }
  return states.get(pat.length)??20;
}
function lineCost(words,r) {
  let best=20;
  for(const [v,vp] of Object.entries(meterVariants(r.pat,r.name)))best=Math.min(best,cost(words,v)+vp);
  return best;
}
const split=process.argv[2]??'development';
const source=join(out,`${split}-baseline.jsonl`);
const items=readFileSync(source,'utf8').trim().split('\n').map(JSON.parse).filter(x=>x.mode==='plain');
if(items.length!==(split==='external'?60:180))throw Error('Wait for complete source data');
const result=[];
for(const [i,x] of items.entries()) {
  const words=x.lines.map(s=>bare(s).split(/\s+/));
  const rows=[...x.rows].sort((a,b)=>a.base-b.base).slice(0,12).map(r=>({pat:r.pat,ark:r.ark,base:r.base,correct:r.correct,costs:words.map(ws=>lineCost(ws,r))}));
  result.push({url:x.url,pairIndex:x.pairIndex,rows});
  if(i%30===0)console.log(split,'lattice',i);
}
writeFileSync(join(out,`${split}-lattice.json`),JSON.stringify({algorithm:'word-weight-viterbi-v1',lexicalCost:.35,ezafePenalty:1,items:result}));
console.log('Complete');
