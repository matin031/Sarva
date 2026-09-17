"use client";

import { preloadClips } from "@/lib/poets-shelf/clips";
import { preloadBookAsset } from "./scene/bookAsset";

/* تنها دروازهٔ ورودِ three.js برای این بازی.
 *
 *  ⚠️ همان درسی که در `components/UI/galaxy/runtime.tsx` و
 *  `components/UI/aruz-bridge/runtime.tsx` گرفته شد: اگر چند
 *  `dynamic(() => import(...))` جداگانه به three برسند، بسته‌بند برای هرکدام
 *  یک chunkـِ جدا می‌سازد و یک نسخهٔ کاملِ three (نزدیکِ ۸۰۰ کیلوبایت) در هر
 *  کدام تکرار می‌شود — چیزی که DevTools با نامِ «Duplicated JavaScript»
 *  گزارش می‌کند.
 *
 *  صادرکردنِ همه‌چیز از یک ماژول یعنی هر importـِ تنبل به همان یک chunk
 *  می‌رسد و three یک بار فرستاده می‌شود.
 *
 *  ⚠️⚠️ و به همین دلیل، پیش‌بارگذاریِ دارایی‌ها هم *اینجاست* و نه در
 *  `PoetsShelfGame`.
 *
 *  نسخهٔ اول `preloadClips` و `preloadBookAsset` را از خودِ کامپوننتِ بازی
 *  صدا می‌زد، که منطقی به‌نظر می‌رسید: زودتر شروع کن. ولی هر دو ماژول
 *  `three` را وارد می‌کنند، و `PoetsShelfGame` را صفحه مستقیم وارد می‌کند —
 *  پس کلِ three به بستهٔ *غیرِتنبلِ* صفحه می‌آمد و تمامِ زحمتِ جداکردنِ
 *  مرزِ WebGL بی‌اثر می‌شد.
 *
 *  حالا این فراخوانی‌ها در سطحِ ماژولِ همین chunk‌اند: لحظه‌ای که chunk
 *  می‌رسد — یعنی دقیقاً وقتی که به هر حال به three نیاز داریم — دانلودِ
 *  کلیپ‌ها و کتاب هم‌زمان با ساخته‌شدنِ بوم شروع می‌شود. */

preloadClips();
preloadBookAsset();

export { default as GameCanvas } from "./GameCanvas";
