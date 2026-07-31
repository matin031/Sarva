/**
 * aruz-bench.mjs — هزینهٔ واقعیِ موتور: CPU در هر جست‌وجو، حافظه، زمانِ راه‌اندازی.
 *
 * این عدد تعیین می‌کند سرور چه اندازه‌ای لازم است، پس باید اندازه‌گیری باشد نه
 * تخمین. (عددهای پایتون به درد نمی‌خورند؛ چیزی که روی سرور اجرا می‌شود این است.)
 *
 *   node scripts/aruz-bench.mjs [تعدادِ‌تکرار]
 */
import { createJiti } from "jiti";

const N = Number(process.argv[2] || 40);
const mb = (b) => (b / 1024 / 1024).toFixed(1);

const before = process.memoryUsage();
const t0 = process.hrtime.bigint();
const jiti = createJiti(import.meta.url);
const { detect } = await jiti.import("../lib/aruz/detect.ts");
const t1 = process.hrtime.bigint();
const afterLoad = process.memoryUsage();

const BAYTS = [
  ["اگر آن ترک شیرازی به دست آرد دل ما را", "به خال هندویش بخشم سمرقند و بخارا را"],
  ["بشنو از نی چون حکایت می کند", "از جدایی ها شکایت می کند"],
  ["توانا بود هر که دانا بود", "ز دانش دل پیر برنا بود"],
  ["پی در گاوست و گاو در کهسارست", "ماهیِ سریشمین به دریا بارست"],
  ["خود به خواب خوش و پرداخته محفل از دل", "نرگس شعبده پرداز تو را بنده شوم"],
  ["دام دل بگشاییم بوسه زو برباییم", "تا نپندارد که ما تهی گفتاریم"],
];

detect(BAYTS[0][0], BAYTS[0][1]); // گرم‌کردنِ JIT — اولین اجرا نمایندهٔ حالتِ عادی نیست

const times = [];
const cpu0 = process.cpuUsage();
for (let i = 0; i < N; i++) {
  const [a, b] = BAYTS[i % BAYTS.length];
  const s = process.hrtime.bigint();
  detect(a, b);
  times.push(Number(process.hrtime.bigint() - s) / 1e6);
}
const cpu = process.cpuUsage(cpu0);
const afterRun = process.memoryUsage();

times.sort((x, y) => x - y);
const pct = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
const mean = times.reduce((a, b) => a + b, 0) / times.length;

console.log(`راه‌اندازی (بارگذاریِ ماژول + JSON): ${Number(t1 - t0) / 1e6 | 0} میلی‌ثانیه`);
console.log(`حافظه — پس از بارگذاری: ${mb(afterLoad.heapUsed)} مگابایت heap، `
          + `${mb(afterLoad.rss)} مگابایت RSS`);
console.log(`حافظه — پس از ${N} جست‌وجو: ${mb(afterRun.heapUsed)} مگابایت heap، `
          + `${mb(afterRun.rss)} مگابایت RSS`);
console.log(`\nزمانِ هر جست‌وجو (${N} بار):`);
console.log(`   میانه   ${pct(0.5).toFixed(0)} میلی‌ثانیه`);
console.log(`   میانگین ${mean.toFixed(0)} میلی‌ثانیه`);
console.log(`   ۹۵٪     ${pct(0.95).toFixed(0)} میلی‌ثانیه`);
console.log(`   بیشینه  ${times[times.length - 1].toFixed(0)} میلی‌ثانیه`);
console.log(`\nCPU خالص: ${((cpu.user + cpu.system) / 1000 / N).toFixed(0)} میلی‌ثانیه در هر جست‌وجو`);
console.log(`(heap پایه پیش از بارگذاری: ${mb(before.heapUsed)} مگابایت)`);
