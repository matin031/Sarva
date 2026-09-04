import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createJiti } from 'jiti';
const out=resolve(import.meta.dirname,'../../reports/aruz-evaluation/deep');
const jiti=createJiti(import.meta.url,{fsCache:false});
const a=await jiti.import(join(out,'engines/baseline/align.ts'));
const strict=await jiti.import(join(out,'engines/strict-align/align.ts'));
const e=await jiti.import(join(out,'engines/baseline/engine.ts'));
const fixed=await jiti.import(join(out,'engines/phonetics/engine.ts'));
const {detect}=await jiti.import(join(out,'engines/baseline/detect.ts'));
const examples=['دل','می','من','راه','ماه','نگاه','مِی','پِی','بِه','رَه','خِرقِه'];
const words=examples.map(word=>({word,scans:[...e.scanLine(word)],fixedScans:[...fixed.scanLine(word)],extraSyllableAlignment:a.align(word,'--'),strictAlignment:strict.align(word,'--')}));
const prose=[
 ['امروز برای خرید وسایل خانه به فروشگاه رفتم','فروشنده گفت این کالا هنوز به انبار نرسیده است'],
 ['لطفا شماره تلفن خود را در این قسمت بنویسید','پس از دریافت پیامک دکمه تایید را فشار دهید'],
 ['جلسه بعدی گروه ساعت نه صبح برگزار خواهد شد','تمام اعضا باید گزارش کار خود را همراه بیاورند'],
 ['برای نصب برنامه ابتدا فایل را از سایت دریافت کنید','سپس پوشه مورد نظر را روی رایانه خود انتخاب کنید'],
 ['دمای هوای شهر در روزهای آینده افزایش پیدا میکند','احتمال بارندگی در ارتفاعات بیشتر از سایر مناطق است'],
 ['این کتاب را هفته گذشته از کتابخانه دانشگاه گرفتم','هنوز فرصت نکرده ام فصل آخر آن را مطالعه کنم'],
 ['قطار به علت نقص فنی با تاخیر حرکت خواهد کرد','مسافران میتوانند برای دریافت اطلاعات به دفتر ایستگاه مراجعه کنند'],
 ['در صورت فراموشی رمز عبور با پشتیبانی تماس بگیرید','کارشناسان ما در ساعات اداری پاسخگوی پرسشهای شما هستند'],
];
const negatives=prose.map(lines=>{const r=detect(...lines),b=r.rows[0];return {lines,scanCounts:[r.s1.size,r.s2.size],answer:b.ark,conf:r.conf,summ:b.summ,currentPublicWrapperWouldAnswer:r.s1.size>0&&r.s2.size>0&&b.c1<999&&b.c2<999};});
const data=readFileSync(join(out,'development-baseline.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const byMode={};
for(const mode of ['plain','original']) {
 const items=data.filter(x=>x.mode===mode);let changes=0;const errors=[];
 for(const x of items) {
   const f=[...x.rows].sort((a,b)=>a.base-b.base)[0],r=[...x.rows].sort((a,b)=>a.reverse-b.reverse)[0];
   if(f.pat!==r.pat){changes++;errors.push({url:x.url,pairIndex:x.pairIndex,forward:f.ark,reverse:r.ark,forwardCorrect:f.correct,reverseCorrect:r.correct});}
 }
 byMode[mode]={n:items.length,changedAnswerWithoutLex:changes,examples:errors};
}
const result={words,prose:negatives,proseNote:'Author-written everyday prose, not independently adjudicated unmetrical strings; accidental metrical matches remain possible.',orderSensitivity:byMode};
writeFileSync(join(out,'structural-audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({orderSensitivity:byMode,proseAnswers:negatives.filter(n=>n.currentPublicWrapperWouldAnswer).length,proseHighConfidence:negatives.filter(n=>['بالا','بسیار بالا'].includes(n.conf)).length}));
