import "server-only";
import type { MetadataRoute } from "next";
import { GRADES, readyLessonParams } from "@/lib/doroos";
import { isPlusEnabled } from "@/lib/plus/config";
import { SEO_PAGE_LIST } from "./catalog";
import { absoluteUrl } from "./site";

/**
 * همهٔ نشانی‌های عمومی و ایندکس‌پذیرِ سروا.
 *
 * یک تابع، سه مصرف‌کننده: `sitemap.xml`، ارسالِ IndexNow از پنلِ مدیریت، و
 * آزمونِ سلامتِ صفحهٔ «سئو». اگر هرکدام فهرستِ خودش را داشت، دیر یا زود
 * یکی صفحه‌ای را اعلام می‌کرد که دیگری نمی‌شناخت.
 */
export async function publicSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  /* ⚠️ صفحه‌های ثابت از `lib/seo/catalog.ts` می‌آیند — همان فهرستی که
     متادیتای خودِ صفحه‌ها را می‌سازد. نسخهٔ قبل فهرستِ دستیِ خودش را داشت و
     `/learn/tashbih` و `/learn/motammam` (دو صفحهٔ عمومی و ایندکس‌پذیر) در
     آن نبودند. */
  let plusOn = false;
  /* ⚠️ `/plus` فقط وقتی اعلام می‌شود که واقعاً وجود داشته باشد.
     وقتی مالک سروا پلاس را خاموش کرده، آن صفحه ۴۰۴ می‌دهد — و آدرسِ ۴۰۴ در
     sitemap دقیقاً همان چیزی است که بالای app/sitemap.ts دربارهٔ تک‌سروده‌های کلاب
     گفته شده. اگر خواندنِ تنظیمات شکست بخورد، نیامدنِ یک آدرس از اعلامِ یک
     آدرسِ شکسته بهتر است. */
  try {
    plusOn = await isPlusEnabled();
  } catch {
    /* تنظیمات خوانده نشد؛ آدرس اعلام نمی‌شود. */
  }

  const entries: MetadataRoute.Sitemap = SEO_PAGE_LIST.filter(
    (page) => page.conditional !== "plus" || plusOn,
  ).map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

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
  //
  // اولویتِ درس‌ها بالاتر از بازی‌هاست: «معنی درس …» پرجست‌وجوترین
  // عبارتی است که سروا جوابش را دارد.
  for (const { grade, lesson } of readyLessonParams()) {
    entries.push({
      url: absoluteUrl(`/doroos/${grade}/${lesson}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
