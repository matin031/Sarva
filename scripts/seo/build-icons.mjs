#!/usr/bin/env node
/**
 * آیکون‌های سایت را از نشانِ سروا (`public/favicon.svg`) می‌سازد.
 *
 *     npm run seo:icons
 *
 * خروجی‌ها، همه در گیت:
 *
 *   app/favicon.ico               ۱۶، ۳۲ و ۴۸ پیکسل
 *   public/icon.svg               نسخهٔ مربعِ نشان
 *   public/icon-192.png           ۱۹۲×۱۹۲
 *   public/apple-touch-icon.png   ۱۸۰×۱۸۰ با زمینهٔ سفید
 *
 * =============================================================================
 * ⚠️ چرا گوگل آیکونِ ورسل را نشان می‌داد
 * =============================================================================
 *
 * `app/favicon.ico` از اولین commit همان فایلِ پیش‌فرضِ `create-next-app`
 * بود — مثلثِ ورسل. Next این فایل را خودش سِرو می‌کند و لینکش را *اولِ*
 * فهرستِ آیکون‌ها در `<head>` هر صفحه می‌گذارد، کنارِ `/favicon.svg` که در
 * `app/layout.tsx` تعریف شده بود. مرورگر SVG را برمی‌داشت، پس سایت درست
 * دیده می‌شد؛ ولی گوگل ICO را برداشت و در نتیجهٔ جست‌وجو مثلثِ ورسل آمد.
 *
 * خودِ `favicon.svg` هم جایگزینِ درستی نبود: حدوداً ۳۷۷ در ۴۵۰ است و گوگل
 * فقط آیکونِ مربع قبول می‌کند. پس این اسکریپت همان نشان را وسطِ یک مربع
 * می‌گذارد و از آن همهٔ اندازه‌ها را می‌سازد.
 *
 * ⚠️ `favicon.svg` عمداً دست نمی‌خورد: `globals.css` آن را mask-image
 * می‌کند و صفحهٔ maintenance آن را در `<img>` نشان می‌دهد؛ هر دو روی همین
 * تناسبِ باریک حساب کرده‌اند.
 *
 * ⚠️ اگر نشان عوض شد، **این را دوباره اجرا کنید**؛ خروجی‌ها خودشان از
 * `favicon.svg` خبردار نمی‌شوند.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const source = await readFile(join(ROOT, "public", "favicon.svg"), "utf8");

const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
if (!viewBox) throw new Error("public/favicon.svg viewBox ندارد");
const [vx, vy, vw, vh] = viewBox.trim().split(/[\s,]+/).map(Number);
const body = source.slice(source.indexOf(">", source.indexOf("<svg")) + 1, source.lastIndexOf("</svg>"));

/**
 * نشان را وسطِ یک مربع می‌گذارد. `pad` حاشیهٔ هر طرف است، به نسبتِ ضلعِ مربع.
 *
 * ⚠️ اندازه‌های کوچک (تب و ICO) بی‌حاشیه‌اند: در ۱۶ پیکسل هر پیکسلِ حاشیه
 * از خودِ نشان کم می‌شود. اندازه‌های بزرگ حاشیه دارند چون ممکن است قابِ
 * گرد بگیرند (iOS گوشه‌های آیکونِ صفحهٔ اصلی را همیشه گرد می‌کند) و پایهٔ
 * کتابِ نشان تا لبهٔ پهنا می‌رسد.
 */
function squareSvg({ size, pad = 0, background } = {}) {
  const side = Math.max(vw, vh) / (1 - 2 * pad);
  const box = [vx + vw / 2 - side / 2, vy + vh / 2 - side / 2, side, side].map((n) => +n.toFixed(2));
  const dims = size ? ` width="${size}" height="${size}"` : "";
  const bg = background
    ? `\n  <rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(" ")}"${dims}>${bg}${body}</svg>\n`;
}

async function png(opts) {
  const { data, info } = await sharp(Buffer.from(squareSvg(opts))).png().toBuffer({ resolveWithObject: true });
  if (info.width !== opts.size || info.height !== opts.size) {
    throw new Error(`اندازهٔ ${opts.size} شد ${info.width}×${info.height}`);
  }
  return data;
}

/**
 * ICO با تصویرهای BMP و نه PNG.
 *
 * PNG داخلِ ICO را همهٔ مرورگرهای امروزی می‌خوانند، ولی BMP همان چیزی است
 * که هر خوانندهٔ ICO — از جمله خزنده‌ها — بی‌استثنا می‌فهمد. هزینه‌اش چند
 * کیلوبایت است.
 */
async function ico(sizes) {
  const images = [];
  for (const size of sizes) {
    const { data, info } = await sharp(Buffer.from(squareSvg({ size })))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== size || info.height !== size) {
      throw new Error(`اندازهٔ ${size} شد ${info.width}×${info.height}`);
    }

    // BITMAPINFOHEADER. ارتفاع دو برابر است چون ماسکِ AND هم جزوِ تصویر حساب می‌شود.
    const maskStride = Math.ceil(size / 32) * 4;
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4);
    header.writeInt32LE(size * 2, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(size * size * 4 + maskStride * size, 20);

    // BMP از پایین به بالا و BGRA است؛ sharp از بالا به پایین و RGBA می‌دهد.
    const pixels = Buffer.alloc(size * size * 4);
    const mask = Buffer.alloc(maskStride * size);
    for (let y = 0; y < size; y++) {
      const row = size - 1 - y;
      for (let x = 0; x < size; x++) {
        const s = (y * size + x) * 4;
        const d = (row * size + x) * 4;
        pixels[d] = data[s + 2];
        pixels[d + 1] = data[s + 1];
        pixels[d + 2] = data[s];
        pixels[d + 3] = data[s + 3];
        if (data[s + 3] === 0) mask[row * maskStride + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    images.push({ size, data: Buffer.concat([header, pixels, mask]) });
  }

  const dir = Buffer.alloc(6 + 16 * images.length);
  dir.writeUInt16LE(1, 2); // نوع: آیکون
  dir.writeUInt16LE(images.length, 4);
  let offset = dir.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    dir.writeUInt8(size, e);
    dir.writeUInt8(size, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([dir, ...images.map((image) => image.data)]);
}

const outputs = [
  ["app/favicon.ico", await ico([16, 32, 48])],
  ["public/icon.svg", Buffer.from(squareSvg())],
  ["public/icon-192.png", await png({ size: 192, pad: 0.08 })],
  ["public/apple-touch-icon.png", await png({ size: 180, pad: 0.12, background: "#ffffff" })],
];

for (const [path, data] of outputs) {
  await writeFile(join(ROOT, path), data);
  console.log(`  ${path.padEnd(30)} ${(data.length / 1024).toFixed(1)} KB`);
}

console.log("\nآیکون‌ها ساخته شدند. یادتان باشد `npm run build` را دوباره بزنید.");
