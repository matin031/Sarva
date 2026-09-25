#!/usr/bin/env node
/**
 * بستهٔ آمادهٔ آپلود روی هاست اشتراکی cPanel می‌سازد.
 *
 *     npm run host:build
 *
 * خروجی: پوشهٔ deploy/sarva/ و فایل deploy/sarva.zip
 *
 * =============================================================================
 * ⚠️ چرا build روی خودِ هاست انجام نمی‌شود
 * =============================================================================
 *
 * `next build` این پروژه ۸۳ صفحه می‌سازد و چند صد مگابایت حافظه می‌خواهد.
 * هاست اشتراکی سقفِ حافظه دارد و وقتی به آن بخورد، پروسه *کشته* می‌شود —
 * بدون پیام روشن، فقط یک build ناقص که ممکن است حتی به‌نظر موفق بیاید.
 *
 * پس build اینجا انجام می‌شود و فقط نتیجه‌اش آپلود می‌شود. سود دیگرش این
 * است که node_modules کاملِ ۸۰۰ مگابایتی هرگز روی هاست نمی‌رود: خروجی
 * standalone فقط همان چیزهایی را دارد که واقعاً import شده‌اند.
 *
 * =============================================================================
 * چه چیزی در بسته هست و چرا
 * =============================================================================
 *
 *   server.js, node_modules/   خروجی standalone — خودِ برنامه
 *   .next/static/              فایل‌های CSS/JS مرورگر.
 *                              ⚠️ standalone عمداً اینها را کپی نمی‌کند
 *                              (فرضش این است که روی CDN می‌روند). ما CDN
 *                              نداریم، پس دستی می‌آیند — وگرنه سایت بدون
 *                              هیچ استایلی بالا می‌آید.
 *   public/                    تصویر و صوتِ ثابت. همان دلیل بالا؛ ۳۱ فایل
 *                              صوتیِ اوزان اینجاست.
 *   app.js                     فایل شروع برای cPanel
 *   scripts/                   فقط ساختِ حساب مدیر
 *   .env.example               نمونهٔ تنظیمات با توضیح فارسی
 *   sarva-database.sql         ساختِ دیتابیس از صفر، برای phpMyAdmin
 *   sarva-database-update.sql  فقط migration های تازه، برای سایتی که بالاست
 *   README-HOST.md             راهنمای گام‌به‌گام
 */

import { cp, mkdir, rm, writeFile, readFile, stat, readdir } from "node:fs/promises";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "deploy", "sarva");

const say = (m) => console.log(m);
const step = (m) => console.log(`\n▸ ${m}`);


/**
 * یک بسته و *همهٔ* وابستگی‌هایش را کپی می‌کند.
 *
 * ⚠️ کپی کردنِ تنهای mysql2 کافی نیست: خودش هفت وابستگی دارد و آن‌ها هم
 * وابستگی دارند. یک کپیِ ناقص یعنی خطای «Cannot find package» روی هاست —
 * جایی که کمترین امکان برای عیب‌یابی هست.
 *
 * پیمایش بازگشتی و offline است: هیچ npm install ای لازم نیست، چون هرچه
 * لازم است از قبل در node_modules پروژه هست.
 */
async function copyDependencyClosure(names, from, to) {
  const seen = new Set();
  const queue = [...names];
  let count = 0;

  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);

    const source = join(from, name);
    if (!existsSync(source)) continue;

    // اگر خروجی standalone خودش این بسته را داشته باشد، دست نمی‌خورد.
    if (!existsSync(join(to, name))) {
      await cp(source, join(to, name), { recursive: true });
      count += 1;
    }

    try {
      const meta = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
      queue.push(...Object.keys(meta.dependencies ?? {}));
    } catch {
      // بستهٔ بدون package.json خوانا — وابستگیِ دیگری هم نخواهد داشت.
    }
  }
  return count;
}

// --- بررسی اینکه build انجام شده -------------------------------------------
//
// ⚠️ صریح بررسی می‌شود و خودکار build نمی‌شود. یک build خودکار در دلِ
// اسکریپتِ بسته‌بندی یعنی وقتی build شکست بخورد، پیامش لای خروجیِ کپی کردن
// فایل‌ها گم می‌شود.
if (!existsSync(join(ROOT, ".next", "standalone", "server.js"))) {
  console.error(
    "\nخروجی build پیدا نشد.\n\n" +
      "  اول این را بزنید:   npm run build\n" +
      "  بعد دوباره:         npm run host:build\n",
  );
  process.exit(1);
}
if (!existsSync(join(ROOT, ".next", "static"))) {
  console.error("\n.next/static نیست. `npm run build` را دوباره اجرا کنید.\n");
  process.exit(1);
}

// -----------------------------------------------------------------------------
//  ⚠️ نگهبان: بسته نباید از یک .next کهنه ساخته شود
// -----------------------------------------------------------------------------
//
//  بالاتر توضیح داده شد که این اسکریپت عمداً خودش build نمی‌کند. پیامدش این
//  است که وقتی `npm run build` شکست بخورد — یا اصلاً زده نشود — همین‌جا با
//  کمالِ میل همان .next ساعت‌ها پیش بسته‌بندی می‌شود و هیچ‌چیز هم نمی‌گوید:
//  zip ساخته می‌شود، همه‌چیز سبز است، و چیزی که روی هاست بالا می‌آید کدِ
//  دیروز است. (همین در توضیحاتِ tsconfig.json هم ثبت شده است.)
//
//  پس زمانِ .next/BUILD_ID با تازه‌ترین فایلِ سورس سنجیده می‌شود.
const STALE_SOURCE_DIRS = ["app", "components", "lib", "scripts", "mysql-migrations"];
const STALE_SOURCE_FILES = ["next.config.ts", "package.json", "tsconfig.json"];
const STALE_SKIP = new Set([".git", ".next", "node_modules", "deploy", "r3f-skills"]);

async function newestSource() {
  let newest = { at: 0, file: null };
  const see = async (full) => {
    const at = (await stat(full)).mtimeMs;
    if (at > newest.at) newest = { at, file: relative(ROOT, full) };
  };
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (STALE_SKIP.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else await see(full);
    }
  };
  for (const dir of STALE_SOURCE_DIRS) {
    if (existsSync(join(ROOT, dir))) await walk(join(ROOT, dir));
  }
  for (const file of STALE_SOURCE_FILES) {
    if (existsSync(join(ROOT, file))) await see(join(ROOT, file));
  }
  return newest;
}

{
  const buildId = join(ROOT, ".next", "BUILD_ID");
  const builtAt = existsSync(buildId) ? (await stat(buildId)).mtimeMs : 0;
  const newest = await newestSource();

  if (builtAt === 0 || newest.at > builtAt) {
    console.error(
      [
        "",
        "⛔ بستهٔ آپلود از یک build کهنه ساخته می‌شد.",
        "",
        `      آخرین build:   ${builtAt ? new Date(builtAt).toLocaleString("en-GB") : "(BUILD_ID نیست)"}`,
        `      تازه‌ترین سورس: ${newest.file ? `${new Date(newest.at).toLocaleString("en-GB")}  —  ${newest.file}` : "?"}`,
        "",
        "  یعنی .next موجود این تغییر را ندارد و بسته کدِ قدیمی را می‌برد.",
        "",
        "  اول این را بزنید:   npm run build",
        "  بعد دوباره:         npm run host:build",
        "",
        "  (اگر واقعاً عمدی است: HOST_BUILD_ALLOW_STALE=true)",
        "",
      ].join("\n"),
    );
    if (process.env.HOST_BUILD_ALLOW_STALE !== "true") process.exit(1);
  } else {
    say(`  build تازه است: ${new Date(builtAt).toLocaleString("en-GB")}`);
  }
}

// -----------------------------------------------------------------------------
//  ⚠️ نگهبان: آدرسِ سایتی که در همین بیلد جاگذاری شده
// -----------------------------------------------------------------------------
//
//  این بررسی با یک خرابیِ واقعی و کاملاً خاموش اضافه شد.
//
//  `NEXT_PUBLIC_*` را Next در زمانِ **build** داخلِ کد جاگذاری می‌کند — هم در
//  باندلِ مرورگر و هم در کدِ سرور. این بسته روی ماشینِ توسعه ساخته می‌شود و
//  `.env.local` کنارش نشسته، با NEXT_PUBLIC_SITE_URL=http://localhost:3000 — پس همان
//  رشته *داخلِ بسته* به هاست می‌رفت و مقدارِ درستِ `.env`ِ روی هاست هیچ‌وقت
//  خوانده نمی‌شد. روی سایتِ زنده نتیجه‌اش این بود:
//
//      GET /robots.txt   ->  Sitemap: http://localhost:3000/sitemap.xml
//      GET /sitemap.xml  ->  <loc>http://localhost:3000</loc>   (every page)
//
//  و لینکِ دعوتی که دبیر کپی می‌کرد: http://localhost:3000/panel/classes?join=...
//
//  ⚠️ `lib/seo/site.ts` حالا در production خودش localhost را رد می‌کند، پس
//  این لایهٔ دوم است و نه تنها نگهبان. ولی لازم است: نگهبانِ آن فایل
//  بی‌صدا به دامنهٔ پیش‌فرض برمی‌گردد، و این‌جا *پیش از* آپلود می‌گوید
//  چه چیزی در بسته نشسته است.
const buildEnv = (() => {
  /* ⚠️ دقیقاً همان ترتیبی که Next در یک بیلدِ production می‌خواند،
     از پرزورترین به کم‌زورترین:

         .env.production.local  >  .env.local  >  .env.production  >  .env

     ⚠️ نسخهٔ اولِ این نگهبان فقط دو تای آخر را می‌دید و همین
     خودش یک باگ بود: روشِ درستِ رفعِ این مشکل گذاشتنِ
     `.env.production.local` است (تا `npm run dev` همچنان localhost ببیند)، و
     نگهبانی که آن فایل را نمی‌خواند، دقیقاً روی بیلدِ *درست*
     خطا می‌داد. */
  for (const name of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    // آخرین تعریف برنده است — هر دو فایل این متغیر را دو بار دارند.
    let found = null;
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*NEXT_PUBLIC_SITE_URL\s*=\s*(.*)$/.exec(line);
      if (m) found = m[1].trim().replace(/^["']|["']$/g, "");
    }
    if (found) return { value: found, from: name };
  }
  return { value: "", from: null };
})();

const LOCAL_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i;

if (!buildEnv.value) {
  console.error(
    [
      "",
      "NEXT_PUBLIC_SITE_URL is not set in .env or .env.local.",
      "",
      "  It is inlined at build time, so setting it on the host has no effect.",
      "  Set:  NEXT_PUBLIC_SITE_URL=https://sarvaedu.ir",
      "  Then: npm run build   and   npm run host:build",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

{
  let bakedHost = "";
  try {
    bakedHost = new URL(buildEnv.value).hostname;
  } catch {
    bakedHost = "";
  }
  if (!bakedHost || LOCAL_HOST_RE.test(bakedHost)) {
    console.error(
      [
        "",
        `NEXT_PUBLIC_SITE_URL in ${buildEnv.from} is "${buildEnv.value}".`,
        "",
        "  That value is already baked into this build and would ship to the host:",
        "  sitemap, robots, canonical URLs and the class invite link all point at it.",
        "",
        "  Fix:  NEXT_PUBLIC_SITE_URL=https://sarvaedu.ir",
        "  Then: npm run build   and   npm run host:build",
        "",
        "  (For a deliberately local package: HOST_BUILD_ALLOW_LOCAL_URL=true)",
        "",
      ].join("\n"),
    );
    if (process.env.HOST_BUILD_ALLOW_LOCAL_URL !== "true") process.exit(1);
  } else {
    say(`  site origin baked into the build: ${buildEnv.value}  (from ${buildEnv.from})`);
  }
}


step("پاک کردن بستهٔ قبلی");
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

step("کپی خروجی standalone");
await cp(join(ROOT, ".next", "standalone"), OUT, { recursive: true });

// ⚠️ این فایل‌ها فقط از build عبور کرده‌اند و روی هاست به درد نمی‌خورند.
// ماندنشان یعنی فرستادنِ تنظیمات و قفلِ وابستگی‌ها روی فضای عمومی.
//
// ⚠️ و کمربند دوم برای چیزهایی که ردیابِ Next ممکن است دوباره واردشان کند.
// آن ردیاب به‌خاطر دسترسیِ پویای فایل در مسیر /uploads محتاطانه عمل می‌کند
// و هر فایلی در ریشهٔ پروژه ممکن است سر از خروجی دربیاورد. یک بار deploy/
// را — که خودش یک zip چهل‌مگابایتی دارد — داخل بستهٔ بعدی گذاشت، یعنی هر
// build حجم را تصاعدی زیاد می‌کرد. next.config جلویش را می‌گیرد؛ این خط
// تضمین می‌کند که اگر آن تنظیم روزی از کار افتاد، بی‌صدا نگذرد.
// ⚠️⚠️ این فهرست یک «تمیزکاری» نیست — نگهبانِ نشتِ راز است.
//
// یک بار، بستهٔ آمادهٔ آپلود فایلِ `.env` *واقعی* را در خودش داشت: گذرواژهٔ
// دیتابیس، کلیدِ امضای ورود، pepperِ کدهای یک‌بارمصرف و کلیدِ پیامک. کنارش
// `vocab-images.tar.gz` هم بود — ۱۱۶ مگابایت از ۳۴۶ مگابایتِ بسته، بی‌آنکه
// هیچ‌وقت خوانده شود.
//
// علتش ردیابِ فایلِ Next بود: مسیرهایی که فایل را با مسیرِ زمانِ اجرا
// می‌خوانند برایش مبهم‌اند و محتاطانه هر چیزی را که در ریشهٔ پروژه ببیند
// وارد خروجی می‌کند. `next.config.ts` حالا جلویش را می‌گیرد.
//
// ⚠️ ولی این فهرست هم می‌ماند و نباید حذف شود. آن یکی تنظیمِ فریمورک است و
// می‌تواند با یک ارتقای Next رفتارش عوض شود؛ این یکی روی *خروجیِ نهایی*
// کار می‌کند — همان چیزی که واقعاً آپلود می‌شود. دو نگهبان برای چیزی که
// شکستنش یعنی رفتنِ کلیدِ دیتابیس روی یک هاست اشتراکی، زیادی نیست.
const JUNK = [
  // رازها — مهم‌ترین بخشِ این فهرست.
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  // آرشیوهای محتوا: بزرگ، و در اجرا خوانده نمی‌شوند.
  "audio.tar.gz",
  "vocab-images.tar.gz",
  // سورس و پیکربندی که فقط از build عبور کرده‌اند.
  "instrumentation.ts",
  "instrumentation.node.ts",
  "proxy.ts",
  "next.config.ts",
  "tsconfig.tsbuildinfo",
  "package-lock.json",
  "r3f-skills",
  "deploy",
  "cpanel-app.js",
];

for (const junk of JUNK) {
  await rm(join(OUT, junk), { recursive: true, force: true });
}

// ⚠️ و یک بررسیِ نهایی: اگر با همهٔ این‌ها باز هم چیزی شبیهِ راز در بسته
// ماند، build باید **بشکند** و نه اینکه هشدار بدهد و رد شود.
//
// یک هشدار در میانِ سی خط لاگ دیده نمی‌شود؛ و بسته‌ای که با راز آپلود شود،
// دیگر برگشتنی نیست — باید همهٔ کلیدها را عوض کرد.
const leaked = (await readdir(OUT)).filter(
  (name) => name === ".env" || name.startsWith(".env."),
);
if (leaked.length > 0) {
  console.error(
    `\n⛔ بسته ساخته نشد: این فایل‌ها راز دارند و نباید آپلود شوند:\n` +
      leaked.map((n) => `      ${n}`).join("\n") +
      `\n\n   به فهرست JUNK در همین اسکریپت اضافه‌شان کنید.\n`,
  );
  process.exit(1);
}

step("کپی .next/static  (standalone خودش این را نمی‌آورد)");
await mkdir(join(OUT, ".next"), { recursive: true });
await cp(join(ROOT, ".next", "static"), join(OUT, ".next", "static"), { recursive: true });

step("کپی public");
await cp(join(ROOT, "public"), join(OUT, "public"), { recursive: true });

step("فایل شروع برای cPanel");
await cp(join(ROOT, "cpanel-app.js"), join(OUT, "app.js"));

// --- ابزارهای عملیاتیِ بعد از Deploy ----------------------------------------
//
// ⚠️ این بخش قبلاً فقط `seed-admin.mjs` و `script-db.mjs` را می‌برد، و روی
// هاست دقیقاً همین کم آورد: `npm run db:seed-exams` اجرا نمی‌شد چون نه
// `scripts/seed-exams.ts` در بسته بود و نه پوشهٔ `lib/exam/seed-data/`.
//
// ⚠️ و فهرستِ دستیِ فایل‌ها همان اشتباه را دوباره می‌سازد: هر بار که یکی از
// این اسکریپت‌ها یک import تازه بگیرد، بسته دوباره ناقص می‌شود و خرابی‌اش
// فقط *روی هاست* دیده می‌شود.
//
// پس به‌جای فهرست، از خودِ اسکریپت‌ها شروع می‌کنیم و importهایشان را دنبال
// می‌کنیم — همان بستنی که Next برای سایت می‌کند، اینجا برای ابزارها.
const TOOL_ENTRIES = [
  "scripts/seed-admin.mjs",        // db:seed-admin
  "scripts/seed-exams.ts",         // db:seed-exams
  "scripts/validate-exam-seeds.ts",// exam:validate
  "scripts/sms-latency.ts",        // sms:latency
  "scripts/sms-diagnose.mjs",      // عیب‌یابیِ SMS.ir
  "scripts/migrate.mjs",           // db:migrate
  "scripts/db-check.mjs",          // db:check
  "scripts/check-timezone.mjs",    // db:check-tz
  "scripts/mysql/check-snippets.ts",// db:check-snippets
  "scripts/check-audio.mjs",       // db:check-audio
  // بقیهٔ seedها — همان‌هایی که یک نصبِ تازه بدونشان خالی بالا می‌آید.
  "scripts/seed-plus-plans.ts",      // db:seed-plus
  "scripts/seed-grammar-circuit.ts", // db:seed-grammar-circuit
  "scripts/seed-aruz.ts",            // db:seed-aruz
  "scripts/seed-aruz-bridge.mjs",    // db:seed-aruz-bridge
  "scripts/seed-rang-ara.ts",        // db:seed-rang-ara
  "scripts/seed-kimia.ts",           // db:seed-kimia
];

// پوشه‌هایی که کامل می‌روند، حتی اگر همین امروز هیچ importی به آن‌ها نباشد:
// یک فایلِ آزمونِ تازه در seed-data یا یک migration تازه باید در بسته باشد
// پیش از آنکه کدی صدایش بزند.
const TOOL_DIRS = [
  "scripts/mysql",        // script-db، type-map، split-sql، index-overrides
  "lib/exam/seed-data",   // خودِ آزمون‌ها
  "mysql-migrations",     // برای db:migrate و برای خواندنِ دستی
];

// tsconfig لازم است: اسکریپت‌ها با `@/lib/...` import می‌کنند و tsx مسیرِ
// این نام مستعار را فقط از `compilerOptions.paths` همین فایل می‌فهمد.
const TOOL_FILES = ["tsconfig.json"];

const LOCAL_EXTS = ["", ".ts", ".tsx", ".mts", ".mjs", ".js", ".json",
  "/index.ts", "/index.tsx", "/index.mjs", "/index.js"];

function resolveLocal(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = join(dirname(fromFile), spec);
  else return null; // بستهٔ npm — جای دیگری رسیدگی می‌شود
  for (const ext of LOCAL_EXTS) {
    const candidate = base + ext;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* نیست — بعدی */
    }
  }
  return null;
}

// ⚠️ این جست‌وجو متنی است و نه نحوی، پس داخلِ توضیحات و رشته‌ها هم می‌افتد.
// یک بار `lib/admin/sql-guard.ts` در توضیحش نوشته بود
// `prepare s from 'delete from admin_audit_log'` و همان رشته به‌عنوانِ نامِ
// یک بستهٔ npm سر از خروجی درآورد. مسیرِ واقعیِ import هیچ‌وقت فاصله ندارد.
const looksLikeSpecifier = (spec) => /^[@\w][\w@./-]*$/.test(spec);

// نامِ بسته از مسیرِ import:  mysql2/promise -> mysql2 ،  @a/b/c -> @a/b
const packageOf = (spec) =>
  spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];

const IMPORT_RES = [
  /\bfrom\s*["']([^"']+)["']/g,      // import x from "y" / export { x } from "y"
  /\bimport\s+["']([^"']+)["']/g,     // import "y"
  /\bimport\s*\(\s*["']([^"']+)["']/g,// await import("y")
  /\brequire\s*\(\s*["']([^"']+)["']/g,
];

/** از فایل‌های ورودی شروع می‌کند و هر سورسِ محلیِ قابلِ رسیدن را کپی می‌کند. */
async function copySourceClosure(entries) {
  const seen = new Set();
  const bare = new Set();
  const queue = [];
  const missing = [];

  for (const entry of entries) {
    const full = join(ROOT, entry);
    if (existsSync(full)) queue.push(full);
    else missing.push(entry);
  }

  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);

    const target = join(OUT, relative(ROOT, file));
    await mkdir(dirname(target), { recursive: true });
    await cp(file, target);

    if (/\.(ts|tsx|mts|mjs|js)$/.test(file)) {
      const text = await readFile(file, "utf8");
      for (const re of IMPORT_RES) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
          const spec = m[1];
          if (spec.startsWith("node:")) continue;
          const local = resolveLocal(spec, file);
          if (local) queue.push(local);
          else if (!spec.startsWith(".") && !spec.startsWith("@/") && looksLikeSpecifier(spec))
            bare.add(packageOf(spec));
        }
      }
    }
  }
  return { count: seen.size, bare, missing };
}

step("ابزارهای عملیاتیِ بعد از Deploy و سورسی که لازم دارند");
const closure = await copySourceClosure(TOOL_ENTRIES);
say(`  ${closure.count} فایل سورس (از ${TOOL_ENTRIES.length} اسکریپت و importهایشان)`);
if (closure.missing.length > 0) {
  // ⚠️ هشدار است و نه خطا: ممکن است اسکریپتی عمداً حذف شده باشد. ولی دیده
  // شدنش لازم است، چون package.json داخل بسته هم آن را نخواهد داشت.
  say(`  ⚠️ در پروژه نبودند: ${closure.missing.join("، ")}`);
}

for (const dir of TOOL_DIRS) {
  if (!existsSync(join(ROOT, dir))) continue;
  await cp(join(ROOT, dir), join(OUT, dir), { recursive: true });
  const n = (await readdir(join(OUT, dir))).length;
  say(`  ${dir}/ — ${n} مورد`);
}
for (const file of TOOL_FILES) {
  if (existsSync(join(ROOT, file))) await cp(join(ROOT, file), join(OUT, file));
}

// --- وابستگی‌های همان اسکریپت -----------------------------------------------
//
// ⚠️ این بخش با یک آزمونِ واقعی پیدا شد و بدون آن، ساختِ حسابِ مدیر روی هاست
// با `Cannot find package 'mysql2'` می‌افتاد.
//
// علتش ظریف است: خروجی standalone فقط چیزهایی را در node_modules می‌گذارد
// که *نتوانسته* داخل کد جاسازی کند. mysql2 جاواسکریپتِ خالص است، پس Next
// آن را در chunk های سرور inline کرده و از node_modules برداشته. برای خودِ
// سایت اشکالی ندارد — ولی seed-admin.mjs یک پروسهٔ جداست و به بستهٔ واقعی
// نیاز دارد.
//
// (@node-rs/argon2 خودش مانده، چون ماژول نیتیو است و جاسازی‌شدنی نیست.)
// ⚠️ ولی هر بسته‌ای را نمی‌شود از اینجا کپی کرد.
//
// این بسته روی ویندوز ساخته می‌شود و هاست لینوکس است. هر بسته‌ای که باینریِ
// نیتیو دارد، نسخهٔ *ویندوزیِ* آن در node_modules ما نشسته و بردنش روی هاست
// یعنی یک ماژولِ خراب که با «invalid ELF header» می‌افتد — بدتر از نبودنش.
//
// tsx از همین دسته است (esbuild را با باینریِ هر سکو می‌آورد). پس tsx کپی
// *نمی‌شود* و به‌جایش در package.json بسته می‌آید تا دکمهٔ «Run NPM Install»
// روی cPanel نسخهٔ لینوکسی‌اش را بگیرد. پایین‌تر همین کار انجام می‌شود.
const NATIVE = new Set(["tsx", "esbuild", "sharp", "@node-rs/argon2", "next"]);

step("وابستگی‌های npmِ ابزارها");
const vendorable = [...closure.bare].filter((name) => !NATIVE.has(name)).sort();
const skipped = [...closure.bare].filter((name) => NATIVE.has(name)).sort();
const copied = await copyDependencyClosure(vendorable, join(ROOT, "node_modules"), join(OUT, "node_modules"));
say(`  از ${vendorable.join("، ") || "—"} در مجموع ${copied} بسته کپی شد`);
if (skipped.length > 0) {
  say(`  با npm install روی هاست می‌آیند (نیتیو): ${skipped.join("، ")}`);
}

step("فایل SQL دیتابیس");
const sqlBuild = spawnSync(process.execPath, [join(HERE, "make-sql.mjs")], { stdio: "inherit" });
if (sqlBuild.status !== 0) {
  console.error("ساخت فایل SQL شکست خورد.");
  process.exit(1);
}
await cp(join(ROOT, "deploy", "sarva-database.sql"), join(OUT, "sarva-database.sql"));

// ⚠️ و یک فایلِ دوم، برای سایتی که *از قبل* بالاست.
//
// فایلِ کامل فقط روی دیتابیسِ خالی وارد می‌شود؛ روی دیتابیسِ زنده روی
// «table already exists» می‌میرد — وسطِ کار، چون phpMyAdmin تراکنش ندارد.
//
// ⚠️ این عدد یعنی «اولین migration ای که هنوز روی هاست نرفته» — و با هر
// انتشار باید جلو برود.
//
// اگر عقب بماند، فایلِ به‌روزرسانی شاملِ migration هایی می‌شود که هاست از
// قبل دارد، و phpMyAdmin وسطِ import روی «table already exists» می‌ایستد —
// با نیمی از تغییرات اعمال‌شده و بدون راهِ برگشت (تراکنش ندارد).
//
// امروز: ۰۰۱ تا ۰۰۵ منتشر شده‌اند (پلاس و تخفیفش)، و ۰۰۶ به بعد تازه‌اند:
//   ۰۰۶ هویتِ موبایل · ۰۰۷ نگارهٔ جفت‌ها · ۰۰۸ عروضِ سریع
//   ۰۰۹ پروفایل، حساب دبیر و کلاس‌ها
//
// ⚠️ پیش از انتشار، این را با واقعیتِ هاست بسنجید:
//     SELECT name FROM schema_migrations ORDER BY name;
// و اگر فرق داشت، با `--db-from <نام>` بسازید. سرتیترِ خودِ فایلِ خروجی هم
// می‌گوید دقیقاً چه چیزی داخلش است.
const UPDATE_FROM = (() => {
  const i = process.argv.indexOf("--db-from");
  return i !== -1 ? process.argv[i + 1] : "006";
})();
const updateBuild = spawnSync(
  process.execPath,
  [join(HERE, "make-sql.mjs"), "--from", UPDATE_FROM],
  { stdio: "inherit" },
);
if (updateBuild.status === 0) {
  await cp(
    join(ROOT, "deploy", `sarva-database-${UPDATE_FROM}.sql`),
    join(OUT, "sarva-database-update.sql"),
  );
} else {
  // هیچ migration تازه‌ای بعد از آن نقطه نیست — یعنی این نسخه چیزی به
  // دیتابیس اضافه نکرده. نبودِ فایل خودش پیام است، نه خطا.
  say("  (بدون به‌روزرسانیِ دیتابیس در این نسخه)");
}

step("نمونهٔ تنظیمات و راهنما");
await cp(join(ROOT, ".env.example"), join(OUT, ".env.example"));
await cp(join(ROOT, "docs", "cpanel", "README-HOST.md"), join(OUT, "README-HOST.md"));

// --- package.json مخصوص هاست ------------------------------------------------
//
// ⚠️ اینجا `scripts` قبلاً با `{ start }` *جایگزین* می‌شد — و همین باعث شد
// روی هاست `npm run db:seed-exams` بگوید «Missing script». فایلِ اسکریپت هم
// نبود، ولی حتی با بودنش هم راهی برای صدا زدنش نمی‌ماند.
//
// حالا هر اسکریپتی که فایلش *واقعاً در همین بسته هست* نگه داشته می‌شود و
// بقیه می‌روند. این خودش یک بررسی است: اسکریپتی که فایلش جا مانده باشد، در
// package.json هم نمی‌ماند، پس «Missing script» روی هاست دیگر ابهام ندارد.
const pkgPath = join(OUT, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
pkg.name = "sarva";
pkg.engines = { node: ">=20.9.0" };

// مسیرهای فایلی که در متنِ یک دستورِ npm آمده‌اند (scripts/... یا lib/...).
const scriptFiles = (command) =>
  [...command.matchAll(/(?:^|\s)((?:scripts|lib)\/[\w./-]+)/g)].map((m) => m[1]);

const kept = { start: "node app.js" };
const dropped = [];
for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  const files = scriptFiles(command);
  // دستورهای بدونِ فایل (dev، build، lint، ...) روی هاست معنا ندارند.
  if (files.length === 0) continue;
  if (files.every((f) => existsSync(join(OUT, f)))) kept[name] = command;
  else dropped.push(name);
}
pkg.scripts = kept;

// ⚠️ و tsx باید در `dependencies` باشد، نه `devDependencies`.
//
// نیمی از این دستورها با tsx اجرا می‌شوند، و tsx بالاتر عمداً کپی نشد (باینریِ
// esbuild ویندوزی است). راهِ رسیدنش به هاست فقط «Run NPM Install» است — و آن
// دکمه اگر NODE_ENV=production باشد devDependencies را نصب نمی‌کند. پس به
// dependencies منتقل می‌شود تا در هر دو حالت بیاید.
const TOOL_RUNTIME = ["tsx"];
pkg.dependencies ??= {};
for (const name of TOOL_RUNTIME) {
  const version = pkg.dependencies[name] ?? pkg.devDependencies?.[name];
  if (version) pkg.dependencies[name] = version;
  delete pkg.devDependencies?.[name];
}

await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
say(`  scripts در بسته: ${Object.keys(kept).join("، ")}`);
if (dropped.length > 0) say(`  بدونِ فایل در بسته و حذف شد: ${dropped.join("، ")}`);

// --- اندازه‌گیری ------------------------------------------------------------
async function dirSize(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? await dirSize(full) : (await stat(full)).size;
  }
  return total;
}

const bytes = await dirSize(OUT);
say(`  محتوای بسته: ${(bytes / 1024 / 1024).toFixed(0)} مگابایت پیش از فشرده‌سازی`);

step("ساخت فایل zip");

// ⚠️ زیپِ قبلی باید *پاک* شود و نه به‌روزرسانی.
//
// دستور `zip` روی یک فایلِ موجود حالتِ «update» دارد: فایل‌های تازه را
// اضافه یا جایگزین می‌کند ولی ورودی‌های قدیمی را که دیگر روی دیسک نیستند
// **نگه می‌دارد**.
//
// نتیجه‌اش در عمل دیده شد: پوشهٔ deploy/sarva کاملاً درست بود، ولی زیپ
// هنوز chunk های build قبلی را داشت و بعد از باز کردن، همان باگِ رفع‌شده
// دوباره اجرا می‌شد. یعنی بسته‌ای که به کاربر می‌رسید خرابِ قدیمی بود، در
// حالی که همه‌چیزِ محلی سبز بود.
await rm(join(ROOT, "deploy", "sarva.zip"), { force: true });

/**
 * فشرده‌سازی — دو ابزار، و یکی که عمداً استفاده **نمی‌شود**.
 *
 * ⚠️⚠️ `Compress-Archive` در پاورشل zip می‌سازد ولی مسیرها را با
 * **بک‌اسلش** می‌نویسد: `sarvapp.js` به‌جای `sarva/app.js`.
 *
 * استانداردِ ZIP اسلشِ رو به جلو می‌خواهد، و ابزارهای لینوکسی (همان چیزی که
 * روی cPanel فایل را باز می‌کند) آن بک‌اسلش را جزئی از *نامِ فایل* می‌فهمند
 * و نه جداکنندهٔ پوشه. نتیجه‌اش یک پوشهٔ صاف با چند هزار فایلِ عجیب است و
 * سایتی که بالا نمی‌آید — و هیچ پیامِ خطایی هم در کار نیست.
 *
 * آزموده شد: همین بسته یک بار با Compress-Archive ساخته شد و همهٔ ۵۲۱۴
 * ورودی‌اش بک‌اسلش داشتند.
 *
 * پس دو ابزارِ درست:
 *   • `zip`   — روی لینوکس و مک، و اگر کسی روی ویندوز نصبش کرده باشد.
 *   • bsdtar  — روی ویندوز ۱۰ به بعد در System32 هست و zip استاندارد
 *               می‌سازد. (⚠️ با مسیرِ مطلق صدا زده می‌شود: در Git Bash
 *               نامِ `tar` به GNU tar می‌رسد که اصلاً zip نمی‌سازد.)
 *
 * اگر هیچ‌کدام نبود، **فایلی ساخته نمی‌شود** و پوشه می‌ماند. یک zipِ خراب
 * بدتر از نبودنِ zip است.
 */
function makeZip() {
  const cwd = join(ROOT, "deploy");

  const zip = spawnSync("zip", ["-rq", "sarva.zip", "sarva"], { cwd });
  if (zip.status === 0) return "zip";

  if (process.platform === "win32") {
    const bsdtar = join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe");
    if (existsSync(bsdtar)) {
      const out = spawnSync(bsdtar, ["-a", "-c", "-f", "sarva.zip", "sarva"], { cwd });
      if (out.status === 0) return "bsdtar";
    }
  }

  return null;
}

const zipTool = makeZip();
const zipped = zipTool !== null && existsSync(join(ROOT, "deploy", "sarva.zip"));
if (zipped) {
  const zipMb = ((await stat(join(ROOT, "deploy", "sarva.zip"))).size / 1024 / 1024).toFixed(0);
  say(`  deploy/sarva.zip — ${zipMb} مگابایت  (با ${zipTool})`);
} else {
  say("  (نه zip بود و نه bsdtar — پوشهٔ deploy/sarva را دستی فشرده کنید)");
}

// ⚠️ پوشهٔ میانی بعد از فشرده شدن پاک می‌شود.
//
// ماندنش یک سردرگمیِ واقعی ساخت: کاربر داخل پروژه‌اش یک پوشهٔ deploy
// می‌دید که *دوباره کلِ پروژه* در آن بود، و نمی‌دانست کدام‌یک اصل است.
//
// چیزی که واقعاً لازم دارد یک فایل است: همان zip که آپلود می‌کند. پس فقط
// همان می‌ماند. (اگر zip روی سیستم نبود، پوشه می‌ماند چون آن‌وقت تنها
// خروجی همان است.)
if (zipped) {
  await rm(OUT, { recursive: true, force: true });
  await rm(join(ROOT, "deploy", "sarva-database.sql"), { force: true });
  await rm(join(ROOT, "deploy", `sarva-database-${UPDATE_FROM}.sql`), { force: true });
}

say(`
────────────────────────────────────────────────────────────
  بسته آماده است

  ${
    zipped
      ? "این یک فایل را روی هاست آپلود کنید:\n\n" +
        "      deploy/sarva.zip\n\n" +
        "  فایل SQL و راهنمای فارسی هر دو داخل همین zip هستند."
      : `پوشهٔ ${relative(ROOT, OUT)} را دستی فشرده کنید (zip روی سیستم نیست).`
  }
────────────────────────────────────────────────────────────\n`);
