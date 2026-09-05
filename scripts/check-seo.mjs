#!/usr/bin/env node
/**
 * ممیزیِ سئو روی HTMLِ واقعی — `node scripts/check-seo.mjs [baseUrl]`
 *
 * ⚠️ چرا روی HTML و نه روی فایل‌های JSX: متادیتا در Next ارث می‌رسد، ادغام
 * می‌شود و در generateMetadata پویا ساخته می‌شود. خواندنِ کد می‌گوید چه چیزی
 * *نوشته* شده؛ فقط خروجیِ HTML می‌گوید چه چیزی *فرستاده* می‌شود. همان
 * تفاوت بود که باعث شد canonicalِ ارثیِ «/» ماه‌ها دیده نشود.
 *
 * این ابزار هیچ چیزی را تغییر نمی‌دهد؛ فقط گزارش می‌دهد.
 */

const BASE = process.argv[2] || "http://127.0.0.1:4700";
const OLD_DOMAIN = "aruzino.ir";

/** صفحه‌های نمونه و انتظارِ ما از هرکدام. */
const PAGES = [
  { path: "/", kind: "public", label: "خانه" },
  { path: "/aruz", kind: "public", label: "عروض" },
  { path: "/vazn-yab", kind: "public", label: "وزن‌یاب" },
  { path: "/doroos", kind: "public", label: "فهرست پایه‌ها" },
  { path: "/doroos/yazdahom", kind: "public", label: "پایهٔ یازدهم" },
  { path: "/doroos/yazdahom/1", kind: "public", label: "درس منتشرشده" },
  { path: "/doroos/yazdahom/01", kind: "dupe", label: "درس با صفرِ ابتدایی", canonicalOf: "/doroos/yazdahom/1" },
  { path: "/doroos/yazdahom/%DB%B1", kind: "dupe", label: "درس با رقمِ فارسی", canonicalOf: "/doroos/yazdahom/1" },
  { path: "/game", kind: "public", label: "کهکشان بازی‌ها" },
  { path: "/game/grammar-circuit", kind: "public", label: "بازی مدار دستور" },
  { path: "/game/aruz-bridge", kind: "public", label: "بازی پل وزن" },
  { path: "/game/ninja", kind: "public", label: "بازی نینجا" },
  { path: "/game/vocab", kind: "public", label: "بازی واژه‌یاب" },
  { path: "/game/jasoos", kind: "public", label: "بازی جاسوس" },
  { path: "/game/pairs", kind: "public", label: "بازی جفت‌ها" },
  { path: "/game/aruz-rapid", kind: "public", label: "بازی تقطیع سریع" },
  { path: "/exam", kind: "public", label: "فهرست آزمون‌ها" },
  { path: "/sarvaclub", kind: "public", label: "کلاب" },
  /* صفحه‌بندیِ کلاب: صفحهٔ دوم باید آدرسِ واقعی، canonicalِ خودش و لینکِ
     a/href داشته باشد — نه canonical به صفحهٔ یک. */
  { path: "/sarvaclub?page=2", kind: "public", label: "کلاب، صفحهٔ دوم", needsPageLink: true },
  { path: "/sarvaclub?sort=popular", kind: "noindex", label: "کلاب، مرتب‌سازی" },
  { path: "/sarvaclub?form=ghazal", kind: "noindex", label: "کلاب، فیلتر قالب" },
  { path: "/guide", kind: "public", label: "راهنما" },
  { path: "/about", kind: "public", label: "درباره" },
  { path: "/quiz", kind: "noindex", label: "جلسهٔ تمرین" },
  { path: "/auth", kind: "noindex", label: "ورود" },
  { path: "/reset-password", kind: "noindex", label: "بازیابی رمز" },
  { path: "/result", kind: "noindex", label: "نتیجهٔ شخصی" },
  /* ⚠️ ۴ و ۱۳ در پایهٔ یازدهم واقعاً `ready: false` اند. اولین بار اینجا
     درسِ ۱۷ نوشته شده بود و ابزار «ایراد» گزارش داد — ولی ۱۷ منتشر شده
     است، پس ایراد از انتظارِ آزمون بود نه از کد. */
  { path: "/doroos/yazdahom/4", kind: "noindex-or-404", label: "درس آماده‌نشده" },
  { path: "/doroos/yazdahom/13", kind: "noindex-or-404", label: "درس آماده‌نشدهٔ دوم" },
  { path: "/doroos/nadarad", kind: "404", label: "پایهٔ نامعتبر" },
  { path: "/doroos/yazdahom/999", kind: "404", label: "شمارهٔ خارج از کتاب" },
  { path: "/hich-koja-nist", kind: "404", label: "آدرس نامعتبر" },
];

const pick = (html, re) => html.match(re)?.[1]?.trim() ?? null;

async function look(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  const status = res.status;
  const location = res.headers.get("location");
  const html = status >= 300 && status < 400 ? "" : await res.text();
  return {
    status,
    location,
    title: pick(html, /<title>([^<]*)<\/title>/i),
    canonical: pick(html, /<link rel="canonical" href="([^"]+)"/i),
    robots: pick(html, /<meta name="robots" content="([^"]+)"/i),
    ogUrl: pick(html, /<meta property="og:url" content="([^"]+)"/i),
    ogTitle: pick(html, /<meta property="og:title" content="([^"]+)"/i),
    desc: pick(html, /<meta name="description" content="([^"]+)"/i),
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, "").trim(),
    hasOld: html.includes(OLD_DOMAIN),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]),
    html,
  };
}

let problems = 0;
const bad = (msg) => {
  problems++;
  console.log(`      ✗ ${msg}`);
};

console.log(`ممیزیِ سئو روی ${BASE}\n`);
console.log("مسیر".padEnd(34) + "کد   canonical / یادداشت");
console.log("─".repeat(96));

for (const page of PAGES) {
  let r;
  try {
    r = await look(page.path);
  } catch (e) {
    console.log(`${page.path.padEnd(34)} —    ✗ دسترسی نشد: ${e.message}`);
    problems++;
    continue;
  }

  const noindexed = /noindex/i.test(r.robots ?? "");
  console.log(
    `${page.path.padEnd(34)} ${String(r.status).padEnd(4)} ${r.canonical ?? (noindexed ? "(noindex)" : "—")}`,
  );

  if (r.hasOld) bad(`دامنهٔ قدیم (${OLD_DOMAIN}) هنوز در HTML هست`);

  if (page.kind === "public") {
    if (r.status !== 200) bad(`انتظار ۲۰۰ بود، ${r.status} آمد`);
    if (!r.canonical) bad("canonical ندارد");
    else {
      const want = BASE.startsWith("http://127") ? null : null;
      if (!r.canonical.endsWith(page.path === "/" ? "" : page.path))
        bad(`canonical به مسیرِ خودش اشاره نمی‌کند: ${r.canonical}`);
    }
    if (noindexed) bad("صفحهٔ عمومی noindex شده");
    if (!r.title) bad("عنوان ندارد");
    if (r.title && /سروا \| .*\| سروا|\| سروا \| سروا/.test(r.title))
      bad(`تکرارِ برند در عنوان: ${r.title}`);
    if (!r.desc) bad("توضیح (description) ندارد");
    if (!r.h1) bad("تیترِ H1 در HTMLِ اولیه نیست");

    // لینکِ صفحه‌بندی باید در HTMLِ اولیه باشد، نه فقط با جاوااسکریپت.
    if (page.needsPageLink && !/href="\/sarvaclub\?page=\d+"/.test(r.html))
      bad("لینکِ صفحه‌بندی در HTMLِ اولیه نیست");

    // ── دادهٔ ساختاریافته ────────────────────────────────────────────────
    for (const raw of r.jsonLd) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        bad("JSON-LD معتبر نیست (parse نشد)");
        continue;
      }
      // ⚠️ متنِ کاربر داخلِ اسکریپت نباید بتواند تگ را ببندد.
      if (raw.includes("</script")) bad("JSON-LD امن serialize نشده");

      const graph = parsed["@graph"] ?? [parsed];
      for (const node of graph) {
        // چیزهایی که نباید ساخته باشیم.
        for (const forbidden of ["aggregateRating", "review", "offers", "priceRange"]) {
          if (node[forbidden]) bad(`schema ادعای بی‌پشتوانه دارد: ${forbidden}`);
        }
        if (node["@type"] === "FAQPage") bad("FAQPage بدونِ پرسش‌وپاسخِ واقعیِ صفحه");

        if (node["@type"] === "BreadcrumbList") {
          const items = node.itemListElement ?? [];
          if (!items.length) bad("BreadcrumbList خالی است");
          items.forEach((it, i) => {
            if (it.position !== i + 1) bad(`ترتیبِ breadcrumb غلط است (${it.position})`);
            if (!it.name) bad("حلقهٔ breadcrumb نام ندارد");
            if (!it.item || !/^https?:\/\//.test(it.item))
              bad(`حلقهٔ breadcrumb آدرسِ مطلق ندارد: ${it.item}`);
            if (String(it.item ?? "").includes(OLD_DOMAIN))
              bad("breadcrumb به دامنهٔ قدیم اشاره می‌کند");
          });
        }
      }
    }
  }

  if (page.kind === "dupe") {
    if (!r.canonical) bad("canonical ندارد؛ آدرسِ تکراری بدونِ مرجع");
    else if (!r.canonical.endsWith(page.canonicalOf))
      bad(`canonical باید به ${page.canonicalOf} برسد، ولی ${r.canonical} است`);
  }

  if (page.kind === "noindex") {
    if (!noindexed) bad("باید noindex می‌بود");
  }

  if (page.kind === "404") {
    if (r.status !== 404) bad(`باید ۴۰۴ می‌داد، ${r.status} داد`);
  }

  if (page.kind === "noindex-or-404") {
    if (r.status !== 404 && !noindexed) bad("نه ۴۰۴ است نه noindex");
  }
}

// ── robots.txt و sitemap ──────────────────────────────────────────────────
console.log("\n── robots.txt ──");
const robots = await (await fetch(BASE + "/robots.txt")).text();
console.log(robots.trim().split("\n").map((l) => "   " + l).join("\n"));
if (robots.includes(OLD_DOMAIN)) bad("robots.txt هنوز دامنهٔ قدیم دارد");

console.log("\n── sitemap.xml ──");
const sm = await (await fetch(BASE + "/sitemap.xml")).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`   ${urls.length} آدرس`);
if (sm.includes(OLD_DOMAIN)) bad("sitemap هنوز دامنهٔ قدیم دارد");
if (/<lastmod>/.test(sm)) console.log("   ⚠️ lastmod دارد — مطمئن شوید تاریخِ واقعی است");

// هر آدرسِ sitemap باید ۲۰۰ بدهد و noindex نباشد
console.log("\n── سلامتِ آدرس‌های sitemap ──");
for (const u of urls) {
  const path = new URL(u).pathname;
  const r = await look(path);
  const noindexed = /noindex/i.test(r.robots ?? "");
  if (r.status !== 200) bad(`sitemap: ${path} → ${r.status}`);
  else if (noindexed) bad(`sitemap: ${path} در sitemap هست ولی noindex است`);
}
console.log(`   ${urls.length} آدرس بررسی شد`);

console.log(
  problems === 0
    ? "\n✓ هیچ ایرادی پیدا نشد."
    : `\n${problems} ایراد پیدا شد.`,
);
process.exit(problems === 0 ? 0 : 1);
