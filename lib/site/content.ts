import "server-only";
import { query } from "@/lib/db";
import { getSetting } from "@/lib/settings";
// از فایل جدا می‌آید تا بشود بدون بالا آوردنِ لایهٔ سرور تستش کرد.
import { safeExternalUrl } from "@/lib/site/safe-url";

/**
 * محتوایی که سایت عمومی از دیتابیس می‌خواند: نوار اعلان و بخش حامیان.
 *
 * ---------------------------------------------------------------------------
 * چرا از راه یک endpoint و نه مستقیم در صفحه
 * ---------------------------------------------------------------------------
 * صفحهٔ اصلی و بیشتر صفحه‌های سایت **ایستا** ساخته می‌شوند و همین باعث می‌شود
 * سریع باشند. کافی است یک کوئری دیتابیس در layout یا در page بنشیند تا Next
 * آن صفحه را dynamic کند و هر بازدید یک رندرِ کامل بشود.
 *
 * ضمناً مرحلهٔ build داکر اصلاً دیتابیس ندارد (Dockerfile فقط `npm run build`
 * می‌زند)، پس چنین کوئری‌ای همان‌جا شکست می‌خورد.
 *
 * راهِ انتخاب‌شده: صفحه‌ها ایستا می‌مانند و این دو تکه محتوا را یک کامپوننت
 * کلاینت از `/api/v1/site-content` می‌گیرد. یعنی تغییر از پنل، بدون build
 * دوباره و بدون هیچ تأخیری روی سایت دیده می‌شود.
 */

export type AnnouncementTone = "info" | "success" | "warning" | "critical";

export type PublicAnnouncement = {
  id: string;
  /** با هر ویرایش عوض می‌شود، پس اعلانی که کاربر بسته بود دوباره دیده می‌شود
   *  — که درست است: متنِ تازه یعنی خبرِ تازه. */
  version: string;
  title: string | null;
  body: string;
  tone: AnnouncementTone;
  linkUrl: string | null;
  linkLabel: string | null;
  dismissible: boolean;
};

export type PublicSupporter = {
  id: string;
  name: string;
  message: string | null;
  tier: "gold" | "silver" | "bronze" | "supporter";
  amountLabel: string | null;
  linkUrl: string | null;
  avatarUrl: string | null;
};

export type PublicSupportersSection = {
  enabled: boolean;
  title: string;
  subtitle: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  items: PublicSupporter[];
};

export { safeExternalUrl };

export type SiteContent = {
  announcement: PublicAnnouncement | null;
  supporters: PublicSupportersSection;
};

/**
 * اعلانی که همین حالا باید دیده شود.
 *
 * فیلترها همه در SQL‌اند و نه در جاوااسکریپت: با ایندکس جزئیِ
 * `site_announcements_live_idx`، این کوئری حتی با هزار ردیفِ بایگانی هم فقط
 * فعال‌ها را لمس می‌کند.
 */
export async function activeAnnouncement(): Promise<PublicAnnouncement | null> {
  const rows = await query<{
    id: string;
    updated_at: string;
    title: string | null;
    body: string;
    tone: AnnouncementTone;
    link_url: string | null;
    link_label: string | null;
    dismissible: boolean;
  }>(
    `select id, updated_at, title, body, tone, link_url, link_label, dismissible
       from site_announcements
      where is_active
        and (starts_at is null or starts_at <= now())
        and (ends_at   is null or ends_at   >  now())
      order by priority desc, created_at desc
      limit 1`,
  );

  const row = rows[0];
  if (!row) return null;

  const linkUrl = safeExternalUrl(row.link_url);

  return {
    id: row.id,
    // خودِ زمانِ ویرایش کافی است و چیزی از دیتابیس لو نمی‌دهد.
    version: row.updated_at,
    title: row.title,
    body: row.body,
    tone: row.tone,
    // برچسب بدون آدرسِ معتبر یعنی دکمه‌ای که هیچ‌جا نمی‌برد — هر دو با هم
    // می‌روند.
    linkUrl,
    linkLabel: linkUrl ? row.link_label : null,
    dismissible: row.dismissible,
  };
}

/** بخش حامیان صفحهٔ اصلی — با تنظیماتش. */
export async function supportersSection(): Promise<PublicSupportersSection> {
  /** ⚠️ پیش‌فرض «روشن» است و نه «خاموش».
   *
   *  دلیلش این است که خاموشیِ پیش‌فرض یک تلهٔ خاموش می‌ساخت: مدیر چند حامی
   *  در پنل ثبت می‌کرد، به صفحهٔ اصلی می‌رفت و هیچ‌چیز نمی‌دید، بی‌آنکه
   *  چیزی بگوید کجا را باید روشن کند.
   *
   *  خطری هم ندارد: اگر هیچ حامیِ قابلِ نمایشی نباشد، `items` خالی برمی‌گردد
   *  و خودِ کامپوننت چیزی رندر نمی‌کند. یعنی «روشن» هرگز یک بخشِ خالی
   *  نمی‌سازد. خاموش کردنِ صریح از پنل همچنان کار می‌کند. */
  const enabled = (await getSetting("home.supporters_enabled")) !== "off";

  const title = (await getSetting("home.supporters_title")) || "با سپاس از حامیان سروا";
  const subtitle = (await getSetting("home.supporters_subtitle")) || null;
  const ctaUrl = safeExternalUrl(await getSetting("home.supporters_cta_url"));
  const ctaLabel = ctaUrl ? (await getSetting("home.supporters_cta_label")) || "حمایت می‌کنم" : null;

  // وقتی بخش خاموش است اصلاً کوئری نمی‌زنیم.
  if (!enabled) {
    return { enabled: false, title, subtitle, ctaUrl, ctaLabel, items: [] };
  }

  const rows = await query<{
    id: string;
    display_name: string;
    message: string | null;
    tier: PublicSupporter["tier"];
    amount_label: string | null;
    link_url: string | null;
    avatar_url: string | null;
  }>(
    `select id, display_name, message, tier, amount_label, link_url, avatar_url
       from site_supporters
      where is_visible
      order by sort_index, created_at desc
      limit 200`,
  );

  return {
    enabled: true,
    title,
    subtitle,
    ctaUrl,
    ctaLabel,
    items: rows.map((r) => ({
      id: r.id,
      name: r.display_name,
      message: r.message,
      tier: r.tier,
      amountLabel: r.amount_label,
      linkUrl: safeExternalUrl(r.link_url),
      avatarUrl: safeExternalUrl(r.avatar_url),
    })),
  };
}

/**
 * هر دو با هم.
 *
 * یک درخواست به‌جای دو تا: نوار اعلان بالای صفحه است و بخش حامیان پایین‌تر،
 * ولی هر دو در همان بارگذاری اول لازم می‌شوند.
 */
export async function siteContent(): Promise<SiteContent> {
  const [announcement, supporters] = await Promise.all([
    activeAnnouncement(),
    supportersSection(),
  ]);
  return { announcement, supporters };
}
