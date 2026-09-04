import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dir=resolve(import.meta.dirname,'../../reports/aruz-evaluation');
const key=r=>`${r.url}:${r.pairIndex}:${r.mode}`;
const read=tag=>readFileSync(join(dir,tag+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
function summary(rows) {
  const n=rows.length;
  const count=fn=>rows.filter(fn).length;
  const high=rows.filter(r=>['بسیار بالا','بالا'].includes(r.conf));
  const groups=Object.values(Object.groupBy(rows,r=>r.url));
  // Cluster bootstrap: two couplets from the same ghazal are not independent.
  let seed=20260904;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const boot=[];
  for(let i=0;i<2000&&groups.length;i++) {
    let total=0,correct=0;
    for(let j=0;j<groups.length;j++)for(const r of groups[Math.floor(rand()*groups.length)]) {total++;if(r.rank===1)correct++;}
    boot.push(correct/total*100);
  }
  boot.sort((a,b)=>a-b);
  return {n,poems:groups.length,correct:count(r=>r.rank===1),accuracy:n?count(r=>r.rank===1)/n*100:null,cluster95:n?[boot[50],boot[1950]]:null,top3:count(r=>r.rank>0&&r.rank<=3),top5:count(r=>r.rank>0&&r.rank<=5),missingGold:count(r=>!r.goldInTable),anyEmptyScan:count(r=>r.scanCounts.some(v=>v===0)),bothEmptyScans:count(r=>r.scanCounts.every(v=>v===0)),highConfidence:high.length,highConfidenceWrong:high.filter(r=>r.rank!==1).length,conf:Object.fromEntries(Object.entries(Object.groupBy(rows,r=>r.conf)).map(([k,v])=>[k,{n:v.length,correct:v.filter(r=>r.rank===1).length}]))};
}
const results={};
for(const tag of ['baseline-current','baseline-attached-plain','experiment-final-he']) {
  if(!existsSync(join(dir,tag+'.jsonl')))continue;
  const rows=read(tag);
  results[tag]=Object.fromEntries(['plain','original'].filter(m=>rows.some(r=>r.mode===m)).map(mode=>[mode,{...summary(rows.filter(r=>r.mode===mode)),byPoet:Object.fromEntries(Object.entries(Object.groupBy(rows.filter(r=>r.mode===mode),r=>r.poet)).map(([p,r])=>[p,summary(r)]))}]));
}
const base=read('baseline-current');
for(const tag of ['baseline-attached-plain','experiment-final-he']) {
  if(!existsSync(join(dir,tag+'.jsonl')))continue;
  const other=read(tag), map=new Map(other.map(r=>[key(r),r]));
  const matched=base.filter(r=>map.has(key(r)));
  results['paired-'+tag]=Object.fromEntries(['plain','original'].filter(mode=>matched.some(r=>r.mode===mode)).map(mode=>{
    const rows=matched.filter(r=>r.mode===mode);
    return [mode,{baseline:summary(rows),other:summary(rows.map(r=>map.get(key(r)))),fixed:rows.filter(r=>r.rank!==1&&map.get(key(r)).rank===1).map(r=>({url:r.url,index:r.pairIndex,lines:r.lines,gold:r.gold,before:r.top[0].ark})),regressed:rows.filter(r=>r.rank===1&&map.get(key(r)).rank!==1).map(r=>({url:r.url,index:r.pairIndex,lines:r.lines,gold:r.gold,after:map.get(key(r)).top[0].ark}))}];
  }));
}
writeFileSync(join(dir,'summary.json'),JSON.stringify(results,null,2)+'\n');
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const fields=['mode','url','coupletNumber','line1','line2','gold','predicted','rank','confidence','scan1','scan2'];
const errors=base.filter(r=>r.rank!==1).map(r=>[r.mode,r.url,r.pairIndex+1,...r.lines,r.gold,r.top[0].ark,r.rank,r.conf,...r.scanCounts]);
writeFileSync(join(dir,'errors.csv'),'\ufeff'+[fields,...errors].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n');
console.log(JSON.stringify(results,null,2));
