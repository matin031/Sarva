#!/usr/bin/env node
/**
 * HTMLِ اولیه چه چیزی دارد؟ — `node scripts/check-render.mjs [baseUrl]`
 *
 * ⚠️ چرا لازم است: خزنده اول همین HTML را می‌گیرد. اگر متنِ آموزشی فقط بعد
 * از اجرای جاوااسکریپت ساخته شود، ممکن است دیده شود و ممکن است نشود — و
 * برای کسی که با اینترنتِ کند یا مرورگرِ قدیمی می‌آید، اصلاً نمی‌شود.
 *
 * ⚠️ «client component بودن» به‌تنهایی یعنی نبودِ SSR *نیست*: Next همان
 * کامپوننت را روی سرور هم رندر می‌کند. تنها راهِ دانستن، نگاه کردن به خودِ
 * پاسخ است. این ابزار همان کار را می‌کند — بدونِ اجرای جاوااسکریپت.
 *
 * چیزی را تغییر نمی‌دهد؛ فقط گزارش می‌دهد.
 */

const BASE = process.argv[2] || "http://127.0.0.1:5200";

/** صفحه‌های عمومی و انتظارِ محتوایی از هرکدام. */
const PAGES = [
  { path: "/", label: "خانه", needs: ["سروا"] },
  { path: "/aruz", label: "عروض", needs: ["عروض"] },
  { path: "/vazn-yab", label: "وزن‌یاب", needs: ["وزن"] },
  { path: "/doroos", label: "فهرست پایه‌ها", needs: ["درس"] },
  { path: "/doroos/yazdahom", label: "پایهٔ یازدهم", needs: ["درس"] },
  { path: "/doroos/yazdahom/1", label: "درس", needs: ["قلمرو"] },
  { path: "/game", label: "کهکشان بازی‌ها", needs: ["بازی"] },
  { path: "/game/grammar-circuit", label: "مدار دستور", needs: [] },
  { path: "/game/ninja", label: "نینجا", needs: [] },
  { path: "/game/aruz-bridge", label: "پل وزن", needs: [] },
  { path: "/game/vocab", label: "واژه‌یاب", needs: [] },
  { path: "/game/jasoos", label: "جاسوس", needs: [] },
  { path: "/game/pairs", label: "جفت‌های ادبی", needs: [] },
  { path: "/game/aruz-rapid", label: "تقطیع سریع", needs: [] },
  { path: "/exam", label: "آزمون‌ها", needs: ["آزمون"] },
  { path: "/sarvaclub", label: "کلاب", needs: [] },
  { path: "/guide", label: "راهنما", needs: ["سروا"] },
  { path: "/about", label: "درباره", needs: ["سروا"] },
];

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

let problems = 0;
const bad = (m) => {
  problems++;
  console.log(`      ✗ ${m}`);
};
const warn = (m) => console.log(`      ⚠️ ${m}`);

console.log(`HTMLِ اولیه — ${BASE}\n`);
console.log(
  "مسیر".padEnd(26) + "متن".padEnd(8) + "H1".padEnd(5) + "لینک".padEnd(6) + "تصویرِ بی‌alt",
);
console.log("─".repeat(78));

for (const page of PAGES) {
  const res = await fetch(BASE + page.path);
  const html = await res.text();
  const text = strip(html);

  // تعدادِ لینکِ داخلی در همان HTMLِ اولیه.
  const links = new Set(
    [...html.matchAll(/<a\s[^>]*href="(\/[^"#][^"]*)"/g)].map((m) => m[1]),
  );

  // تصویرها: محتوایی باید alt معنادار داشته باشد، تزئینی alt خالی.
  const imgs = [...html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\salt=/.test(t)).length;

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];

  console.log(
    page.path.padEnd(26) +
      String(text.length).padEnd(8) +
      String(h1s.length).padEnd(5) +
      String(links.size).padEnd(6) +
      String(noAlt),
  );

  if (res.status !== 200) bad(`وضعیت ${res.status}`);

  // ── متنِ اصلی ────────────────────────────────────────────────────────
  if (text.length < 200)
    bad(`متنِ HTMLِ اولیه تقریباً خالی است (${text.length} نویسه)`);

  for (const needle of page.needs) {
    if (!text.includes(needle))
      bad(`واژهٔ کلیدیِ «${needle}» در HTMLِ اولیه نیست`);
  }

  // ── تیترها ───────────────────────────────────────────────────────────
  if (h1s.length === 0) bad("H1 ندارد");
  if (h1s.length > 1) warn(`${h1s.length} تا H1 دارد — یکی کافی است`);

  // پرشِ سطحِ تیتر: h1 → h3 بدونِ h2.
  const levels = [...html.matchAll(/<h([1-6])[^>]*>/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1)
      warn(`پرشِ سطحِ تیتر: h${levels[i - 1]} → h${levels[i]}`);
  }

  // ── لینک ─────────────────────────────────────────────────────────────
  if (links.size === 0) bad("هیچ لینکِ داخلی در HTMLِ اولیه نیست");

  // ── تصویر ────────────────────────────────────────────────────────────
  if (noAlt > 0) bad(`${noAlt} تصویر بدونِ صفتِ alt`);

  // ── محتوای پنهان‌شده با انیمیشن ───────────────────────────────────────
  // ⚠️ اگر متنِ اصلی با opacity:0 شروع شود و انیمیشن اجرا نشود (خطای
  // hydration، حرکتِ کم، مرورگرِ قدیمی) برای همیشه نامرئی می‌ماند.
  const zeroOpacity = (html.match(/opacity:\s*0(?![.\d])/g) ?? []).length;
  if (zeroOpacity > 12)
    warn(`${zeroOpacity} عنصر با opacity:0 در HTMLِ اولیه`);
}

console.log(
  problems === 0 ? "\n✓ هیچ ایرادی پیدا نشد." : `\n${problems} ایراد پیدا شد.`,
);
process.exit(problems === 0 ? 0 : 1);
