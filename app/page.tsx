import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";
import JsonLd from "@/components/seo/JsonLd";
import { catalogMetadata, GOOGLE_SITE_VERIFICATION } from "@/lib/seo/metadata";
import { organizationProfileNode } from "@/lib/seo/entity";
import { readBrandProfile, readVerification } from "@/lib/seo/settings";

/**
 * ⚠️ صفحهٔ خانه حالا ISR است و نه کاملاً ایستا.
 *
 * دو چیز در آن از پنلِ مدیریت می‌آید (صفحهٔ «سئو»): صفحه‌های رسمیِ سروا در
 * شبکه‌های اجتماعی (`sameAs`) و کدِ تأییدِ Bing/Yandex. هر دو فقط روی صفحهٔ
 * خانه معنا دارند، پس فقط همین صفحه دیتابیس را می‌خواند — نه لایوتِ ریشه، که
 * همهٔ صفحه‌ها را پویا می‌کرد.
 *
 * خودِ صفحه همچنان از کش سرو می‌شود؛ ساعتی یک بار در پس‌زمینه تازه می‌شود و
 * ذخیرهٔ هر تنظیمِ سئو هم فوراً تازه‌اش می‌کند (`revalidatePath("/")`). اگر
 * دیتابیس در دسترس نباشد (مثلاً در build داکر)، خواندن‌ها پیش‌فرضِ خالی
 * برمی‌گردانند و صفحه دقیقاً مثل قبل ساخته می‌شود.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const verification = await readVerification();
  const other: Record<string, string> = {};
  if (verification.bing) other["msvalidate.01"] = verification.bing;

  return {
    ...catalogMetadata("/"),
    /* ⚠️ `verification` هم مثلِ بقیهٔ کلیدها *جایگزین* می‌شود و نه ادغام؛
       پس کدِ گوگلِ لایوتِ ریشه باید اینجا هم باشد. */
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
      ...(verification.yandex ? { yandex: verification.yandex } : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

export default async function Home() {
  const profile = organizationProfileNode(await readBrandProfile());
  return (
    <>
      {profile && <JsonLd data={profile} />}
      <HomePage />
    </>
  );
}
