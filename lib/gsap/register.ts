"use client";

/**
 * ثبتِ پلاگین‌های GSAP — یک بار، در مرورگر.
 *
 * ⚠️ چرا یک فایل جدا: `gsap.registerPlugin` باید *قبل* از ساختنِ هر تایم‌لاینی
 * اجرا شده باشد، و اگر هر کامپوننت خودش صدایش بزند، ترتیب به ترتیبِ mount
 * شدنِ کامپوننت‌ها گره می‌خورد — یعنی به چیزی که نه پیدا است و نه پایدار.
 *
 * ⚠️ و هیچ‌کدام از این‌ها روی سرور import نمی‌شوند: ScrollTrigger در بارگذاری
 * سراغِ `window` می‌رود. هر جایی که این فایل را می‌آورد باید `"use client"`
 * باشد.
 *
 * ⚠️ از GSAP 3.13 به بعد ScrollSmoother و MotionPathPlugin — که پیش‌تر پشتِ
 * عضویتِ Club بودند — در همان پکیجِ عمومیِ npm هستند. یعنی `npm install gsap`
 * کافی است و هیچ توکن یا رجیستریِ خصوصی‌ای لازم نیست.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";

let done = false;

export function registerGsap(): void {
  if (done || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, MotionPathPlugin, Observer);
  done = true;
}

export { gsap, ScrollTrigger, ScrollSmoother, MotionPathPlugin, Observer };
