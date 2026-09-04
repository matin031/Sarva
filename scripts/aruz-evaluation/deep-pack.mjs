import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const out=resolve(import.meta.dirname,'../../reports/aruz-evaluation/deep');
if(process.argv.includes('--unpack')) {
  for(const file of readdirSync(out).filter(f=>f.endsWith('.jsonl.gz'))) {
    writeFileSync(join(out,file.slice(0,-3)),gunzipSync(readFileSync(join(out,file))));
  }
  console.log('Archived evaluation traces restored.');
  process.exit(0);
}
let before=0,after=0;
for(const file of readdirSync(out).filter(f=>f.endsWith('.jsonl'))) {
  const bytes=readFileSync(join(out,file)),packed=gzipSync(bytes,{level:9});
  assert.deepEqual(gunzipSync(packed),bytes);
  writeFileSync(join(out,file+'.gz'),packed);before+=bytes.length;after+=packed.length;
}
console.log(JSON.stringify({originalBytes:before,compressedBytes:after,roundTripVerified:true}));
