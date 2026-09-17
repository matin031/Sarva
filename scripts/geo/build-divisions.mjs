#!/usr/bin/env node
/**
 * `lib/geo/iran-divisions.json` را از دادهٔ بستهٔ `iran-city` می‌سازد.
 *
 *     node scripts/geo/build-divisions.mjs <cities.json> <provinces.json>
 *
 * =============================================================================
 * ⚠️ چرا فهرست از «شهرستان» به «شهر» رفت
 * =============================================================================
 *
 * نسخهٔ قبلی ۴۲۹ ردیف داشت و هر ردیف یک **شهرستان** بود — یعنی فقط مرکزِ هر
 * شهرستان. برچسبِ فیلد ولی «شهر» است و کاربر دنبالِ شهرِ خودش می‌گشت:
 * کسی که در زرین‌شهر یا فولادشهر یا درچه درس می‌دهد، در آن فهرست هیچ‌چیز
 * پیدا نمی‌کرد و باید «لنجان» را انتخاب می‌کرد — که نامش را هم شاید
 * نمی‌دانست.
 *
 * حالا ۱۱۱۹ شهر است.
 *
 * =============================================================================
 * ⚠️⚠️ قاعدهٔ شناسه‌ها — مهم‌ترین بخشِ این اسکریپت
 * =============================================================================
 *
 * شناسهٔ شهر در دیتابیسِ کاربران ذخیره شده و **نمی‌شود دلبخواهی عوضش کرد**.
 * دو قاعده رعایت می‌شود و هر دو اجباری‌اند:
 *
 *  ۱. **شهری که از قبل بوده، شناسه‌اش عوض نمی‌شود.** تطبیق با نامِ
 *     نرمال‌شده انجام می‌شود (ی/ك عربی، نیم‌فاصله، فاصله‌های اضافه). ۳۴۳
 *     ردیف از ۴۲۹ ردیفِ قبلی همین‌طور دست‌نخورده می‌مانند.
 *
 *  ۲. **شناسهٔ قدیمی هرگز به شهرِ دیگری داده نمی‌شود.** ۸۶ شهرستانِ قبلی
 *     نامشان با هیچ شهری یکی نیست — چون نامِ شهرستان با نامِ مرکزش فرق
 *     دارد (شهرستانِ «لنجان»، مرکزش «زرین‌شهر»؛ «برخوار» → «دولت‌آباد»؛
 *     «گچساران» → «دوگنبدان»). شناسهٔ آن ۸۶ تا **رزرو** می‌ماند و به هیچ
 *     ردیفِ تازه‌ای نمی‌رسد.
 *
 *     اگر این کار نمی‌شد، کاربری که «برخوار» را انتخاب کرده بود، بی‌صدا
 *     تبدیل می‌شد به کسی که شهرِ دیگری را انتخاب کرده — و هیچ‌چیز در
 *     دیتابیس هم به آن ایراد نمی‌گرفت، چون قیدِ `LEFT(city_id,5) =
 *     province_id` همچنان برقرار است.
 *
 * ⚠️ در نتیجهٔ قاعدهٔ ۲، آن ۸۶ شناسه «یتیم» می‌شوند: در دیتابیس هستند و در
 * فهرست نیستند. این حالت بی‌خطر است و `lib/profile/schemas.ts` صریح
 * هندلش می‌کند (توضیحش همان‌جاست) — کاربر شهرش را دوباره انتخاب می‌کند.
 *
 * ⚠️ شناسهٔ استان‌ها هم عیناً از فایلِ قبلی می‌آید و نه از دادهٔ تازه.
 * `users.province_id` به همان‌ها بند است.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const TARGET = join(ROOT, "lib", "geo", "iran-divisions.json");

const [citiesPath, provincesPath] = process.argv.slice(2);
if (!citiesPath || !provincesPath) {
  console.error("usage: build-divisions.mjs <cities.json> <provinces.json>");
  process.exit(1);
}

/**
 * نرمال‌سازیِ نام برای *تطبیق* — و نه برای نمایش.
 *
 * ⚠️ همان قواعدِ `normalize()` در `components/UI/kit/animated-select.tsx`،
 * به‌علاوهٔ حذفِ همهٔ فاصله‌ها و پیشوندِ «شهرستان». دو منبعِ داده یک نام را
 * جور دیگری می‌نویسند: «بوئین ومیاندشت» در برابر «بوئین و میاندشت»،
 * «شاهین شهرومیمه» در برابر «شاهین شهر». بدونِ حذفِ فاصله‌ها، ده‌ها ردیف
 * بی‌دلیل شناسهٔ تازه می‌گرفتند.
 */
function matchKey(name) {
  return name
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, "")
    .replace(/^شهرستان/, "")
    .replace(/\s+/g, "")
    .trim();
}

/** نامِ نمایشی: فقط فاصله‌های تکراری جمع می‌شوند، حروف دست‌نخورده. */
function displayName(name) {
  return name.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}

const previous = JSON.parse(await readFile(TARGET, "utf8"));
const newCities = JSON.parse(await readFile(citiesPath, "utf8"));
const newProvinces = JSON.parse(await readFile(provincesPath, "utf8"));

const newProvinceByKey = new Map(newProvinces.map((p) => [matchKey(p.name), p]));

const provinces = [];
let reused = 0;
let fresh = 0;
const reservedTotals = [];

for (const oldProvince of previous.provinces) {
  const source = newProvinceByKey.get(matchKey(oldProvince.name));
  if (!source) {
    console.error(`استان «${oldProvince.name}» در دادهٔ تازه پیدا نشد — متوقف شد.`);
    process.exit(1);
  }

  /* شناسهٔ هر نامِ قبلی، و همهٔ شناسه‌های قبلی به‌عنوان «رزرو». */
  const idByKey = new Map(oldProvince.cities.map((c) => [matchKey(c.name), c.id]));
  const reserved = new Set(oldProvince.cities.map((c) => c.id));

  /* ⚠️ شمارندهٔ شناسهٔ تازه از بزرگ‌ترین شناسهٔ *قبلی* شروع می‌شود و نه از
     یک. با شروع از یک، اولین شهرِ تازه شناسه‌ای می‌گرفت که در `reserved`
     است و حلقهٔ پیدا کردنِ شناسهٔ خالی بی‌دلیل طولانی می‌شد. */
  let next = oldProvince.cities.reduce(
    (max, c) => Math.max(max, Number(c.id.slice(5)) || 0),
    0,
  );

  const cities = [];
  const seen = new Set();

  for (const row of newCities.filter((c) => c.province_id === source.id)) {
    const key = matchKey(row.name);
    // ⚠️ دادهٔ منبع چند نامِ تکراری دارد؛ دومی باید کنار گذاشته شود وگرنه
    // دو گزینهٔ هم‌نام با دو شناسه در فهرست می‌نشیند.
    if (seen.has(key)) continue;
    seen.add(key);

    let id = idByKey.get(key);
    if (id) {
      reused++;
    } else {
      do {
        next++;
        id = `${oldProvince.id}${String(next).padStart(3, "0")}`;
      } while (reserved.has(id));
      reserved.add(id);
      fresh++;
    }

    cities.push({ id, name: displayName(row.name) });
  }

  cities.sort((a, b) => a.name.localeCompare(b.name, "fa"));

  const orphans = oldProvince.cities.filter((c) => !cities.some((n) => n.id === c.id));
  if (orphans.length) reservedTotals.push({ province: oldProvince.name, orphans: orphans.length });

  provinces.push({ id: oldProvince.id, name: oldProvince.name, cities });
}

const output = {
  _source:
    "iran-city (ISC) — https://github.com/mohammad-hassani/iran-city · استان‌ها و شناسه‌ها از Open Admin Data (CC-BY-4.0) — https://openadmindata.org/ir/",
  _repo: "https://github.com/mohammad-hassani/iran-city",
  _note:
    "شناسه‌ها پایدارند: هر شهری که در نسخهٔ قبلی بود همان شناسه را نگه می‌دارد، و شناسهٔ شهرستان‌هایی که دیگر در فهرست نیستند به هیچ شهر تازه‌ای داده نمی‌شود. ساخته‌شده با scripts/geo/build-divisions.mjs",
  provinces,
};

await writeFile(TARGET, `${JSON.stringify(output, null, 0)}\n`, "utf8");

const total = provinces.reduce((n, p) => n + p.cities.length, 0);
console.log(`استان: ${provinces.length}`);
console.log(`شهر:   ${total}   (${reused} شناسهٔ قبلی نگه داشته شد، ${fresh} شناسهٔ تازه)`);
console.log(
  `شناسهٔ رزروشده (شهرستان‌هایی که نامشان شهر نیست): ${reservedTotals.reduce((n, r) => n + r.orphans, 0)}`,
);
