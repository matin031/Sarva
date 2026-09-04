// Freeze the pre-correction engine for exact reproduction after the accepted fix.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'reports/aruz-evaluation/deep');
const destination=join(out,'baseline-engine-snapshot.json.gz');
if(existsSync(destination))throw Error('Snapshot already exists; do not overwrite it');
const manifest=JSON.parse(readFileSync(join(out,'engine-manifest.json'),'utf8'));
const files={};
for(const [name,hash] of Object.entries(manifest.hashes)) {
  const path=name==='align.ts'?join(out,'engines/baseline',name):join(root,'lib/aruz',name);
  const data=readFileSync(path);
  if(createHash('sha256').update(data).digest('hex')!==hash)throw Error('Source hash mismatch: '+name);
  files[name]=data.toString('utf8');
}
writeFileSync(destination,gzipSync(JSON.stringify({schema:1,hashes:manifest.hashes,files}),{level:9}));
console.log('Verified and archived the exact baseline engine.');
