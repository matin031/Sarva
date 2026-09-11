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
import { existsSync } from "node:fs";
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
for (const junk of [
  "tsconfig.tsbuildinfo",
  "package-lock.json",
  "deploy",
  "cpanel-app.js",
]) {
  await rm(join(OUT, junk), { recursive: true, force: true });
}

step("کپی .next/static  (standalone خودش این را نمی‌آورد)");
await mkdir(join(OUT, ".next"), { recursive: true });
await cp(join(ROOT, ".next", "static"), join(OUT, ".next", "static"), { recursive: true });

step("کپی public");
await cp(join(ROOT, "public"), join(OUT, "public"), { recursive: true });

step("فایل شروع برای cPanel");
await cp(join(ROOT, "cpanel-app.js"), join(OUT, "app.js"));

step("اسکریپت ساخت حساب مدیر");
await mkdir(join(OUT, "scripts", "mysql"), { recursive: true });
await cp(join(ROOT, "scripts", "seed-admin.mjs"), join(OUT, "scripts", "seed-admin.mjs"));
await cp(join(ROOT, "scripts", "mysql", "script-db.mjs"), join(OUT, "scripts", "mysql", "script-db.mjs"));

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
step("وابستگی‌های اسکریپت مدیر (mysql2 و زیرمجموعه‌هایش)");
const copied = await copyDependencyClosure(["mysql2"], join(ROOT, "node_modules"), join(OUT, "node_modules"));
say(`  ${copied} بسته کپی شد`);

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
// مرزِ ۰۰۲ دلبخواه نیست: ۰۰۱ و ۰۰۲ همان چیزی‌اند که در اولین راه‌اندازی
// وارد شده‌اند، پس هر هاستِ موجود آن‌ها را دارد. هرچه بعد از آن آمده، تازه
// است. سرتیترِ خودِ فایل می‌گوید دقیقاً کدام migration ها داخلش‌اند تا با
// `SELECT name FROM schema_migrations` قابل مقایسه باشد.
const UPDATE_FROM = (() => {
  const i = process.argv.indexOf("--db-from");
  return i !== -1 ? process.argv[i + 1] : "003";
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
// ⚠️ خروجی standalone یک package.json با وابستگی‌های خالی دارد. cPanel از
// همین می‌خواند و اگر دکمهٔ «Run NPM Install» زده شود، هیچ کاری نمی‌کند —
// که دقیقاً همان چیزی است که می‌خواهیم، چون node_modules از قبل کامل است.
//
// فقط `start` اضافه می‌شود تا اگر کسی از خط فرمان اجرا کرد هم کار کند.
const pkgPath = join(OUT, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
pkg.name = "sarva";
pkg.scripts = { start: "node app.js" };
pkg.engines = { node: ">=20.9.0" };
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

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

const zip = spawnSync("zip", ["-rq", "sarva.zip", "sarva"], { cwd: join(ROOT, "deploy") });
const zipped = zip.status === 0 && existsSync(join(ROOT, "deploy", "sarva.zip"));
if (zipped) {
  const zipMb = ((await stat(join(ROOT, "deploy", "sarva.zip"))).size / 1024 / 1024).toFixed(0);
  say(`  deploy/sarva.zip — ${zipMb} مگابایت`);
} else {
  say("  (zip نصب نیست — پوشهٔ deploy/sarva را دستی فشرده کنید)");
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
────────────────────────────────────────────────────────────
`);
