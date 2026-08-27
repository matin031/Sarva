"use client";

/** تنها دروازهٔ ورودِ three.js برای این بازی.
 *
 *  همان درسی که در `components/UI/galaxy/runtime.tsx` گرفته شد: اگر چند
 *  `dynamic(() => import(...))` جداگانه به three برسند، بسته‌بند برای هرکدام
 *  یک chunkـِ جدا می‌سازد و یک نسخهٔ کاملِ three (نزدیکِ ۸۰۰ کیلوبایت) در هر
 *  کدام تکرار می‌شود — چیزی که DevTools با نامِ «Duplicated JavaScript» گزارش
 *  می‌کند. صادرکردنِ همه‌چیز از یک ماژول یعنی هر importـِ تنبل به همان یک
 *  chunk می‌رسد و three یک بار فرستاده می‌شود. */

export { default as GameCanvas } from "./GameCanvas";
