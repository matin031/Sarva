#!/usr/bin/env node
/**
 * تصویرِ Open Graph را یک بار می‌سازد و به‌صورت PNG در `app/` می‌گذارد.
 *
 *     npm run seo:og
 *
 * =============================================================================
 * ⚠️ چرا این تصویر دیگر در زمانِ اجرا ساخته نمی‌شود
 * =============================================================================
 *
 * تا امروز `app/opengraph-image.tsx` بود: یک Route با `runtime = "edge"` که
 * در هر درخواست فونتِ وزیرمتن را از `fonts.googleapis.com` می‌گرفت و بعد
 * تصویر را رندر می‌کرد. دو چیز درش خراب بود و هر دو فقط روی هاست دیده
 * می‌شدند:
 *
 *   • **Edge روی این هاست پایدار نیست.** لاگِ production سی‌وسه بار این را
 *     ثبت کرده بود:
 *
 *         Error: failed to pipe response
 *             at pipeToNodeResponse (…/server/pipe-readable.js:135:37)
 *             at async NextNodeServer.runEdgeFunction (…)
 *         route: /opengraph-image/route   method: GET
 *
 *     یعنی جریانِ پاسخ نیمه‌کاره می‌مرد. هر کسی لینکِ سایت را در تلگرام یا
 *     واتساپ می‌فرستاد، پیش‌نمایشِ خالی می‌گرفت.
 *
 *   • **فونت از گوگل می‌آمد.** روی سرورِ ایرانی یا کند است یا اصلاً نمی‌رسد؛
 *     کدِ قبلی با `AbortSignal.timeout(4000)` شکست را بی‌صدا رد می‌کرد و
 *     تصویر را *بدونِ* فونتِ فارسی می‌ساخت — یعنی «سروا» به‌شکلِ چند مربع.
 *     پس در بهترین حالت چهار ثانیه به هر درخواست اضافه می‌شد و در بدترین
 *     حالت تصویر غلط بود.
 *
 * هیچ‌کدامِ این‌ها لازم نبود: تصویر هیچ ورودیِ پویایی ندارد. یک PNGِ ثابت
 * همان خروجی را می‌دهد، بدونِ Edge، بدونِ شبکه، و بدونِ هیچ کاری در زمانِ
 * درخواست — Next خودش آن را مثلِ یک فایلِ ایستا با هدرِ کشِ بلند سِرو می‌کند.
 *
 * ⚠️ فونت هم دیگر دانلود نمی‌شود: `scripts/seo/assets/Vazirmatn-Bold.ttf` در
 * خودِ مخزن است (وزیرمتن، مجوزِ SIL OFL 1.1). این اسکریپت تنها جایی است که
 * به آن نیاز دارد و فقط موقعِ ساختِ تصویر اجرا می‌شود، نه در build و نه در
 * زمانِ اجرا.
 *
 * ⚠️ اگر متن یا رنگِ تصویر را عوض کردید، **باید دوباره این را اجرا کنید**
 * وگرنه تغییر هیچ‌جا دیده نمی‌شود. خروجی در گیت است تا همین اتفاق در
 * بازبینی پیدا شود.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const SIZE = { width: 1200, height: 630 };

const font = await readFile(join(HERE, "assets", "Vazirmatn-Bold.ttf"));

/* ⚠️ همان طرحِ قبلی، مو‌به‌مو. این تغییر دربارهٔ *کجا* ساخته شدنِ تصویر است
   و نه دربارهٔ ظاهرش؛ عوض کردنِ همزمانِ هر دو یعنی اگر چیزی بد شد، معلوم
   نیست کدامش بوده. */
const element = {
  type: "div",
  props: {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f1115",
      backgroundImage:
        "radial-gradient(circle at 25% 20%, rgba(212,175,55,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(212,175,55,0.15), transparent 45%)",
      padding: 80,
    },
    children: [
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            fontSize: 92,
            fontWeight: 700,
            color: "#f5ecd7",
            fontFamily: "Vazirmatn",
          },
          children: "سروا",
        },
      },
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            marginTop: 28,
            fontSize: 38,
            color: "#d4af37",
            fontFamily: "Vazirmatn",
            textAlign: "center",
          },
          children: "درسنامه، عروض و بازی‌های ادبیات فارسی",
        },
      },
    ],
  },
};

const response = new ImageResponse(element, {
  ...SIZE,
  fonts: [{ name: "Vazirmatn", data: font, weight: 700, style: "normal" }],
});

const png = Buffer.from(await response.arrayBuffer());

/* ⚠️ دو فایل و نه یکی.

   Next تگِ `og:image` را از `opengraph-image.*` می‌سازد و `twitter:image`
   را فقط از `twitter-image.*`. بدونِ فایلِ دوم، کارتِ توییتر/ایکس بی‌تصویر
   می‌ماند — و همان کارت را چند پیام‌رسانِ دیگر هم می‌خوانند. */
for (const name of ["opengraph-image.png", "twitter-image.png"]) {
  const target = join(ROOT, "app", name);
  await writeFile(target, png);
  console.log(`  ${name}  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log("\nتصویرها ساخته شدند. یادتان باشد `npm run build` را دوباره بزنید.");
