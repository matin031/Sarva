/**
 * aruz-parity.mjs — موتورِ TypeScript را روی بیت‌های داده‌شده اجرا می‌کند و
 * نتیجه را به‌صورتِ JSON چاپ می‌کند، تا parity.py آن را با خروجیِ arooz.py
 * (مرجع) مقایسه کند.
 *
 * چرا لازم است: وزن‌های رتبه‌بند در پایتون آموخته می‌شوند ولی در مرورگر اجرا
 * می‌شوند. اگر ویژگی‌ها در دو پیاده‌سازی حتی کمی فرق کنند، وزن‌ها بی‌معنا
 * می‌شوند — و این‌جور واگرایی بی‌صدا است: صفحه جواب می‌دهد، فقط جوابِ بدتری.
 * یک‌بار همین اتفاق افتاد (BEAM در TS ۴۰۰۰۰ ماند و در پایتون ۲۰۰۰ شد) و فقط
 * با همین مقایسه پیدا شد.
 *
 *   node scripts/aruz-parity.mjs bayts.json
 *
 * ورودی: [[مصراع۱, مصراع۲], …]   خروجی: [{ark, score, conf}, …]
 */
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { detect } = await jiti.import("../lib/aruz/detect.ts");

const pairs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = pairs.map(([m1, m2]) => {
  const { rows, conf } = detect(m1, m2 ?? undefined);
  const r = rows[0];
  // summ (هزینهٔ خامِ جور شدن) و lex را جدا می‌دهیم تا اگر واگرایی بود بشود
  // فهمید در کدام لایه است: تقطیع/هزینه، یا رتبه‌بند، یا بازرتبه‌بندیِ واژه‌نامه.
  return {
    ark: r.ark, name: r.name, score: r.score, conf,
    summ: r.summ, lex: r.lex ?? null,
  };
});
process.stdout.write(JSON.stringify(out));
