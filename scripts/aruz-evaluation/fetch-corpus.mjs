import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Public poetry only. Pin upstream and store every selected poem before testing.
const count = Number(process.argv[2] || 30);
const output = new URL('../../reports/aruz-evaluation/', import.meta.url);
await mkdir(output, { recursive: true });
async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Sarva-aruz-evaluation' } });
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r.json();
}
const commit = (await json('https://api.github.com/repos/ganjoor/ganjoor-data/commits/main')).sha;
const base = `https://raw.githubusercontent.com/ganjoor/ganjoor-data/${commit}/`;
const seed = 'sarva-aruz-2026-09-04-v1';
const hash = s => createHash('sha256').update(seed + s).digest('hex');
const poems = [], excluded = [];
for (const category of ['hafez/ghazal', 'saadi/divan/ghazals', 'moulavi/shams/ghazalsh']) {
  const cat = await json(base + `poets/${category}/_cat.json`);
  const selected = [...cat.Poems].sort((a,b) => hash(a.FullUrl).localeCompare(hash(b.FullUrl))).slice(0,count);
  for (const item of selected) {
    const p = await json(base + `poets${item.FullUrl}.json`);
    const sections = p.Sections ?? [];
    if (!p.Metre?.Rhythm || sections.length !== 1 || sections[0].PoemFormat !== 'Ghazal') {
      excluded.push({ url: p.FullUrl, reason: 'missing metre, multiple sections, or non-ghazal' });
      continue;
    }
    const pairs = [];
    const verses = [...p.Verses].sort((a,b) => a.VOrder - b.VOrder);
    for (let i = 0; i < verses.length - 1; i++) {
      if (verses[i].Position === 'Right' && verses[i+1].Position === 'Left' && verses[i].CoupletIndex === verses[i+1].CoupletIndex) {
        pairs.push({ index: verses[i].CoupletIndex, lines: [verses[i].Text, verses[i+1].Text] });
        i++;
      }
    }
    const sampled = [...pairs].sort((a,b) => hash(p.FullUrl + ':' + a.index).localeCompare(hash(p.FullUrl + ':' + b.index))).slice(0,2).sort((a,b) => a.index-b.index);
    if (sampled.length !== 2) { excluded.push({url:p.FullUrl,reason:'fewer than two complete couplets'}); continue; }
    poems.push({ id:p.Id, poet:category.split('/')[0], title:p.FullTitle, url:'https://ganjoor.net'+p.FullUrl, rhythm:p.Metre.Rhythm, metreId:p.Metre.Id, pairs:sampled, allPairs:pairs });
    console.log(`${poems.length} ${p.FullUrl}`);
  }
}
const corpus = { schema:1, fetchedAt:new Date().toISOString(), seed, commit, source:base, requestedPerPoet:count, excluded, poems };
await writeFile(new URL('corpus.json',output),JSON.stringify(corpus,null,2)+'\n');
console.log(JSON.stringify({commit,poems:poems.length,excluded}));
