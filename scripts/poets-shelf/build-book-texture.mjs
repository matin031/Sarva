/**
 * قفسهٔ شاعران — سبک‌کردنِ بافتِ کتاب.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * چرا
 * ──────────────────────────────────────────────────────────────────────────
 * `OldBook001_tex.png` یک PNG‌ِ ۲۰۰۰×۲۰۰۰ و ۴٫۶ مگابایتی است. برای کتابی که
 * روی صفحه حدودِ ۱۲۰ پیکسل ارتفاع دارد و پنج نسخه‌اش هم‌زمان دیده می‌شود،
 * این یعنی پرداختِ ۴٫۶ مگابایت بابتِ جزئیاتی که هیچ‌وقت یک پیکسل هم دیده
 * نمی‌شوند — و ۱۶ مگابایت حافظهٔ GPU بعد از رمزگشایی.
 *
 * دو اندازه‌گیری این تصمیم را ساخت:
 *
 *   • کانالِ آلفا **کاملاً مات است** (کمینه = بیشینه = ۲۵۵). یعنی یک کانالِ
 *     کامل داشت حمل می‌شد که هیچ اطلاعاتی نداشت.
 *   • بزرگ‌ترین کتاب در بزرگ‌ترین قابِ ممکن حدودِ ۲۵۰ پیکسل می‌شود. ۱۰۲۴
 *     یعنی هنوز چهار برابرِ آن، حتی روی نمایشگرِ ۲x.
 *
 * ⚠️ فایلِ اصلی دست نمی‌خورد. این اسکریپت فقط یک همسایهٔ `.webp` می‌سازد.
 *    اگر روزی بافتِ باکیفیت‌تری لازم شد، منبع سرِ جایش است.
 *
 *     npm run build:poets-shelf-texture
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const DIR = path.join(ROOT, "public", "games", "game-assets", "book");
const SRC = path.join(DIR, "OldBook001_tex.png");
const OUT = path.join(DIR, "OldBook001_tex.webp");

/** ⚠️ توانِ دو، و این اجباری است: بافتی که توانِ دو نباشد در three میپ‌مپ
 *  نمی‌گیرد و کتابِ دور روی صفحه سوسو می‌زند. */
const SIZE = 1024;

if (!fs.existsSync(SRC)) {
  console.error(`منبع پیدا نشد: ${path.relative(ROOT, SRC)}`);
  process.exit(1);
}

const src = sharp(SRC);
const meta = await src.metadata();
const stats = await src.stats();

console.log(`منبع: ${meta.width}×${meta.height} ${meta.format}، ${(fs.statSync(SRC).size / 1048576).toFixed(2)} مگابایت`);
console.log(`آلفا: ${stats.isOpaque ? "کاملاً مات — حذف می‌شود" : "شفافیتِ واقعی دارد — نگه داشته می‌شود"}`);

let pipeline = sharp(SRC).resize(SIZE, SIZE, { fit: "fill", kernel: "lanczos3" });
if (stats.isOpaque) pipeline = pipeline.removeAlpha();

await pipeline
  /* کیفیتِ ۸۲ روی یک بافتِ کاغذ/چرم عملاً از اصل جدا نمی‌شود، و `effort: 6`
     چون این یک بار در زمانِ ساخت اجرا می‌شود و نه در زمانِ اجرا. */
  .webp({ quality: 82, effort: 6 })
  .toFile(OUT);

const before = fs.statSync(SRC).size;
const after = fs.statSync(OUT).size;
console.log(
  `\nنوشته شد: ${path.relative(ROOT, OUT)}  ` +
    `(${(after / 1024).toFixed(0)} کیلوبایت — ${(before / after).toFixed(0)} برابر کوچک‌تر)`,
);
