import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'), out=join(root,'reports/aruz-evaluation/deep');
mkdirSync(out,{recursive:true});
const old=JSON.parse(readFileSync(join(out,'../corpus.json'),'utf8'));
const external=process.argv.includes('--external');
if(external)old.poems.push(...JSON.parse(readFileSync(join(out,'holdout-corpus.json'),'utf8')).poems);
const seed='sarva-aruz-independent-2026-09-04-v2';
const hash=s=>createHash('sha256').update(seed+s).digest('hex');
const key=s=>s.normalize('NFC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670\p{P}\p{Z}\s\u200c-\u200f]/gu,'');
const oldUrls=new Set(old.poems.map(p=>p.url));
const seenLines=new Set(old.poems.flatMap(p=>p.allPairs.flatMap(b=>b.lines.map(key))));
const base=`https://raw.githubusercontent.com/ganjoor/ganjoor-data/${old.commit}/poets`;
async function get(path) {
  for(let attempt=0;attempt<3;attempt++) {
    try { const r=await fetch(base+path,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(String(r.status));return await r.json(); }
    catch(e){if(attempt===2)throw e;}
  }
}
const poems=[],excluded=[];
for(const category of external?['attar/divana/ghazal-attar']:['hafez/ghazal','saadi/divan/ghazals','moulavi/shams/ghazalsh']) {
  const cat=await get('/'+category+'/_cat.json');let n=0;
  for(const item of [...cat.Poems].sort((a,b)=>hash(a.FullUrl).localeCompare(hash(b.FullUrl)))) {
    if(n===30)break;
    const url='https://ganjoor.net'+item.FullUrl;if(oldUrls.has(url))continue;
    const p=await get(item.FullUrl+'.json');
    if(!p.Metre?.Rhythm||p.Sections?.length!==1||p.Sections[0].PoemFormat!=='Ghazal'){excluded.push({url,reason:'metadata'});continue;}
    const verses=[...p.Verses].sort((a,b)=>a.VOrder-b.VOrder), pairs=[];
    for(let i=0;i+1<verses.length;i++) {
      const a=verses[i],b=verses[i+1];
      if(a.Position==='Right'&&b.Position==='Left'&&a.CoupletIndex===b.CoupletIndex){pairs.push({index:a.CoupletIndex,lines:[a.Text,b.Text]});i++;}
    }
    if(pairs.length<2||pairs.some(b=>b.lines.some(s=>seenLines.has(key(s))))){excluded.push({url,reason:'shared normalized hemistich or fewer than two pairs'});continue;}
    for(const b of pairs)for(const s of b.lines)seenLines.add(key(s));
    poems.push({id:p.Id,poet:category.split('/')[0],url,title:p.FullTitle,rhythm:p.Metre.Rhythm,pairs:[...pairs].sort((a,b)=>hash(url+':'+a.index).localeCompare(hash(url+':'+b.index))).slice(0,2).sort((a,b)=>a.index-b.index),allPairs:pairs});
    n++; if(n%10===0)console.log(category,n);
  }
}
writeFileSync(join(out,external?'external-corpus.json':'holdout-corpus.json'),JSON.stringify({seed,commit:old.commit,fetchedAt:new Date().toISOString(),excluded,poems},null,2));
console.log(JSON.stringify({poems:poems.length,excluded:excluded.length}));
