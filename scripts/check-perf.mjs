#!/usr/bin/env node
/**
 * خط مبنای سرعت روی بیلد تولیدی — `node scripts/check-perf.mjs [baseUrl]`
 *
 * ⚠️ این عددها **آزمایشگاهی‌اند**، روی یک ماشینِ مجازی با CPU مشترک و
 * WebGL نرم‌افزاری. برای مقایسهٔ «پیش و پس از یک تغییر» روی همین ماشین
 * خوب‌اند و برای هیچ چیزِ دیگری نیستند. عددِ کاربرانِ واقعی فقط از
 * Search Console و CrUX می‌آید؛ اینجا هیچ ادعایی دربارهٔ صدکِ ۷۵ میدانی
 * نمی‌شود.
 *
 * ⚠️ درسِ ثبت‌شده در همین مخزن: باز کردنِ یک مرورگرِ تازه به ازای هر نمونه،
 * ۲۵–۴۴fps گزارش کرد و کسی را دنبالِ مشکلی فرستاد که وجود نداشت. پس همهٔ
 * نمونه‌ها در یک مرورگر گرفته می‌شوند و هر صفحه چند بار.
 */
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:5300";
const RUNS = 3;

const PAGES = [
  ["خانه", "/"],
  ["عروض", "/aruz"],
  ["وزن‌یاب", "/vazn-yab"],
  ["درسِ بلند", "/doroos/yazdahom/1"],
  ["کهکشانِ بازی‌ها", "/game"],
  ["کلاب", "/sarvaclub"],
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ ...devices["Pixel 7"], hasTouch: true, isMobile: true });
const page = await ctx.newPage();

/** یک بار بارگذاری و اندازه‌گیری.
 *
 * ⚠️ حجم‌ها از Resource Timing خوانده می‌شوند و نه از هدرِ `content-length`.
 * نسخهٔ اولِ همین اسکریپت از آن هدر می‌خواند و برای *همهٔ* صفحه‌ها «۰ کیلوبایت
 * جاوااسکریپت» گزارش کرد — چون پاسخ‌های chunked اصلاً این هدر را ندارند.
 * عددِ صفر هم به‌عنوان «عالی» خوانده می‌شد، که بدترین نوعِ اندازه‌گیریِ
 * خراب است: خطا نمی‌دهد، فقط دروغ می‌گوید.
 */
async function sample(path) {
  await page.goto(BASE + path, { waitUntil: "load" });

  const m = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) lcp = Math.max(lcp, e.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* مرورگر پشتیبانی نمی‌کند */
        }
        setTimeout(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const fcp = performance
            .getEntriesByType("paint")
            .find((p) => p.name === "first-contentful-paint");
          // transferSize واقعیِ روی سیم است (فشرده). اگر صفر بود — مثلاً
          // از حافظهٔ نهان — encodedBodySize جایگزینش می‌شود.
          const bytes = { js: 0, css: 0, img: 0, font: 0, other: 0 };
          for (const e of performance.getEntriesByType("resource")) {
            const size = e.transferSize || e.encodedBodySize || 0;
            const kind =
              e.initiatorType === "script"
                ? "js"
                : e.initiatorType === "link" || e.initiatorType === "css"
                  ? "css"
                  : e.initiatorType === "img"
                    ? "img"
                    : /\.(woff2?|ttf|otf)(\?|$)/.test(e.name)
                      ? "font"
                      : "other";
            bytes[kind] += size;
          }
          resolve({
            ttfb: Math.round(nav?.responseStart ?? 0),
            fcp: Math.round(fcp?.startTime ?? 0),
            lcp: Math.round(lcp),
            cls: Number(cls.toFixed(3)),
            domNodes: document.getElementsByTagName("*").length,
            html: Math.round(nav?.encodedBodySize ?? 0),
            bytes,
          });
        }, 2500);
      }),
  );

  return m;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const kb = (n) => Math.round(n / 1024);

console.log(`سرعت روی بیلد تولیدی — ${BASE}`);
console.log(`موبایلِ شبیه‌سازی‌شده، میانهٔ ${RUNS} اجرا\n`);
console.log(
  "صفحه".padEnd(18) +
    "TTFB".padEnd(8) +
    "FCP".padEnd(8) +
    "LCP".padEnd(8) +
    "CLS".padEnd(8) +
    "JS".padEnd(8) +
    "HTML".padEnd(8) +
    "DOM",
);
console.log("─".repeat(66));

const rows = [];
for (const [label, path] of PAGES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await sample(path));
  const row = {
    label,
    path,
    ttfb: median(runs.map((r) => r.ttfb)),
    fcp: median(runs.map((r) => r.fcp)),
    lcp: median(runs.map((r) => r.lcp)),
    cls: median(runs.map((r) => r.cls)),
    js: median(runs.map((r) => r.bytes.js)),
    html: median(runs.map((r) => r.html)),
    dom: median(runs.map((r) => r.domNodes)),
  };
  rows.push(row);
  console.log(
    label.padEnd(18) +
      `${row.ttfb}ms`.padEnd(8) +
      `${row.fcp}ms`.padEnd(8) +
      `${row.lcp}ms`.padEnd(8) +
      String(row.cls).padEnd(8) +
      `${kb(row.js)}KB`.padEnd(8) +
      `${kb(row.html)}KB`.padEnd(8) +
      row.dom,
  );
}

console.log("\n── نکته‌ها ──");
for (const r of rows) {
  // آستانه‌ها فقط برای جلبِ توجه‌اند، نه حکم. عددِ میدانی جای دیگری است.
  if (r.cls > 0.1) console.log(`  ⚠️ ${r.label}: جابه‌جاییِ چیدمان ${r.cls} — بالای ۰٫۱`);
  if (r.dom > 3000) console.log(`  ⚠️ ${r.label}: ${r.dom} گرهٔ DOM`);
  if (kb(r.js) > 600) console.log(`  ⚠️ ${r.label}: ${kb(r.js)}KB جاوااسکریپت`);
  if (r.js === 0) console.log(`  ⚠️ ${r.label}: حجمِ JS صفر خوانده شد — اندازه‌گیری مشکوک است`);
}

console.log(
  "\n⚠️ این‌ها آزمایشگاهی‌اند و روی ماشینِ توسعه گرفته شده‌اند." +
    "\n   برای صدکِ ۷۵ کاربرانِ واقعی به Search Console › Core Web Vitals نگاه کنید.",
);

await browser.close();
