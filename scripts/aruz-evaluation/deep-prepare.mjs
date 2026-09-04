import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '../..');
const out = join(root, 'reports/aruz-evaluation/deep');
mkdirSync(out, {recursive:true});
const files = ['engine.ts','meters.ts','align.ts','detect.ts','lexicon.ts','lexicon.json','ranker.json'];
const hashes = {};
const archive=join(out,'baseline-engine-snapshot.json.gz');
const snapshot=existsSync(archive)?JSON.parse(gunzipSync(readFileSync(archive)).toString('utf8')):null;
for (const kind of ['baseline','phonetics']) {
  const dir = join(out,'engines',kind); mkdirSync(dir,{recursive:true});
  for (const f of files) {
    const data=snapshot?Buffer.from(snapshot.files[f]):readFileSync(join(root,'lib/aruz',f));
    hashes[f]=createHash('sha256').update(data).digest('hex');
    if(snapshot&&snapshot.hashes[f]!==hashes[f])throw Error('Snapshot hash mismatch: '+f);
    writeFileSync(join(dir,f),data);
  }
  let d=readFileSync(join(dir,'detect.ts'),'utf8');
  d=d.replace('function feats(', 'export function feats(').replace('function baseScore(', 'export function baseScore(');
  d=d.replace('      summ: c1 + c2,', `      summ: c1 + c2,
      d1, d2,
      reverse: baseScore(m.name, m.ark, m.pat, m.freq, d2, d1),
      single1: baseScore(m.name, m.ark, m.pat, m.freq, d1, d1),
      single2: baseScore(m.name, m.ark, m.pat, m.freq, d2, d2),`);
  // Score both dictionary-key normalizations on the very same alignment.
  d=d.replace('lexScore }','lexScore, lexScoreDetails }');
  d=d.replace('      let ls = lexScore(mesra1, r.pat, r.name);', '      let [ls, norm] = lexScoreDetails(mesra1, r.pat, r.name);');
  d=d.replace('        ls = (ls + lexScore(mesra2, r.pat, r.name)) / 2;', '        const other = lexScoreDetails(mesra2, r.pat, r.name);\n        ls = (ls + other[0]) / 2; norm = (norm + other[1]) / 2;');
  d=d.replace('      r.lex = ls;', '      r.lex = ls;\n      r.lexNormalized = norm;');
  writeFileSync(join(dir,'detect.ts'),'// @ts-nocheck -- generated research instrumentation only\n'+d);
  let l=readFileSync(join(dir,'lexicon.ts'),'utf8');
  l=l.replace('export function lexScore(', 'export function lexScoreDetails(').replace('): number {', '): [number, number] {');
  l=l.replace('return 0.0;', 'return [0, 0];').replace('return 1.1;', 'return [1.1, 1.1];');
  const start=l.indexOf('  let totS = 0.0;');
  l=l.slice(0,start)+`  const score = (strip: boolean) => {
    let total=0, n=0;
    for (const [word, wt] of a!) {
      const key=strip ? word.replace(/[\\u064b-\\u065f\\u0670]/g, '') : word;
      const c=LEXICON[key]; if(!c) continue;
      n++; const N=Object.values(c).reduce((s,v)=>s+v,0);
      total += -Math.log10(((c[wt]??0)+0.2)/(N+1));
    }
    return n ? LEX_W*total/n : 0;
  };
  return [score(false),score(true)];
}
export function lexScore(line:string, pat:string, name?:string):number { return lexScoreDetails(line,pat,name)[0]; }
`;
  writeFileSync(join(dir,'lexicon.ts'),l);
  if(kind==='phonetics') {
    let e=readFileSync(join(dir,'engine.ts'),'utf8');
    // Small, auditable candidate repairs. Not installed in production.
    e=e.replace('last && n > 1 && prevb !== "آ"','last && n > 1 && prevb !== "آ" && prevb !== "ا"');
    // Explicit short vowel before consonantal y/w (mey, pey, now).
    e=e.replace('else if (sukun) toks.push(["V", "ی"]);','else if (sukun || (i > 0 && [...U[i-1][1]].some(c => SHORT_VOWELS.has(c)))) cons();');
    e=e.replace('else if (sukun) toks.push(["V", "و"]);','else if (sukun || (i > 0 && [...U[i-1][1]].some(c => SHORT_VOWELS.has(c)))) cons();');
    // Marked final he (e.g. بِه versus رَه) remains unresolved: do not flatten
    // both pronunciations into a consonant just because a short vowel is present.
    writeFileSync(join(dir,'engine.ts'),e);
  }
}
writeFileSync(join(out,'engine-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),hashes,description:'Instrumentation plus isolated phonetic repairs; production rules unchanged.'},null,2));
console.log('Deep experiment engines prepared.');
