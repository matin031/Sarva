import type { MetadataRoute } from "next";
import { absoluteUrl, isNoindexEnvironment } from "@/lib/seo/site";
import { GRADES, readyLessonParams } from "@/lib/doroos";

/**
 * sitemap.xml
 *
 * ⚠️ نسخهٔ قبلی چهار آدرس داشت — خانه، about، guide و sarvaclub — همه روی
 * دامنهٔ قدیم. یعنی درسنامه‌ها، عروض، وزن‌یاب و هیچ‌کدام از بازی‌ها اصلاً
 * اعلام نمی‌شدند.
 *
 * ── `lastModified` ────────────────────────────────────────────────────────
 * ⚠️ نسخهٔ قبلی برای *همهٔ* آدرس‌ها `new Date()` می‌گذاشت. یعنی هر بار که
 * sitemap ساخته می‌شد، سایت اعلام می‌کرد تمامِ صفحاتش همین امروز عوض شده‌اند.
 * این نه‌تنها کمکی نمی‌کند، اعتبارِ خودِ فیلد را از بین می‌برد: خزنده‌ای که
 * چند بار ببیند تاریخ عوض شده ولی محتوا نه، دیگر به آن نگاه نمی‌کند.
 *
 * حالا `lastModified` اصلاً نوشته نمی‌شود. تاریخِ واقعیِ آخرین تغییرِ
 * معنادار برای این محتواها در جایی نگهداری نمی‌شود، و نبودنِ فیلد از
 * نوشتنِ تاریخِ ساختگی بهتر است. اگر روزی درس‌ها فیلدِ `updatedAt` واقعی
 * بگیرند، همان‌جا به این فایل وصل می‌شود.
 *
 * ── چه چیزی اینجا نیست و چرا ──────────────────────────────────────────────
 *   • `/quiz`, `/result`, `/exam/[examKey]`  — جلسه و نتیجهٔ شخصی، noindex.
 *   • `/panel/*`, `/admin/*`                 — پشتِ احراز هویت.
 *   • `/auth`, `/reset-password`             — noindex.
 *   • `/exam-preview`                        — noindex.
 *   • درس‌های `ready: false`                 — هنوز محتوایی ندارند.
 *   • تک‌سروده‌های کلاب                       — محتوای کاربر است، می‌آید و
 *     می‌رود؛ خودِ فهرست اعلام می‌شود و لینک‌هایش خزیده می‌شوند. اضافه کردنِ
 *     تک‌تکشان یعنی sitemap پر از آدرسِ ۴۰۴ شود هر بار که سروده‌ای برداشته
 *     یا رد شود.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // پیش‌نمایش و staging هیچ آدرسی اعلام نمی‌کنند.
  if (isNoindexEnvironment()) return [];

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/doroos"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/aruz"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/vazn-yab"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/game"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/exam"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/sarvaclub"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/guide"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.5 },
  ];

  // صفحهٔ هر پایه.
  for (const grade of GRADES) {
    entries.push({
      url: absoluteUrl(`/doroos/${grade.key}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // ⚠️ درس‌ها از همان registry می‌آیند که صفحه‌ها را می‌سازد
  // (`readyLessonParams`). فهرستِ دستیِ موازی نداریم، چون فهرستِ موازی
  // همیشه از محتوا عقب می‌افتد و کسی متوجه نمی‌شود.
  for (const { grade, lesson } of readyLessonParams()) {
    entries.push({
      url: absoluteUrl(`/doroos/${grade}/${lesson}`),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // صفحه‌های عمومیِ بازی‌ها. هرکدام یک ابزارِ آموزشیِ مستقل با مخاطبِ خودش
  // است، پس آدرسِ خودش را دارد.
  for (const slug of [
    "aruz-bridge",
    "aruz-rapid",
    "grammar-circuit",
    "jasoos",
    "ninja",
    "pairs",
    "vocab",
  ]) {
    entries.push({
      url: absoluteUrl(`/game/${slug}`),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
