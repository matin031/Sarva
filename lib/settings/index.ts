import "server-only";
import { query, queryOne, execute } from "@/lib/db";

/* ⚠️ گروه‌ها در یک فایلِ بی‌import جدا هستند تا کامپوننتِ کلاینتِ صفحهٔ
   تنظیمات بتواند بخواندشان بدونِ اینکه این ماژول — و با آن `lib/db` و
   `mysql2` — وارد بستهٔ مرورگر شود. جزئیاتش در `./groups`. */
import { SETTING_GROUPS, type SettingGroup } from "./groups";

export { SETTING_GROUPS, type SettingGroup };

/**
 * تنظیماتی که ادمین بدون deploy عوض می‌کند.
 *
 * ترتیب حل مقدار همیشه یکی است: جدول app_settings → متغیر محیطی → null.
 *
 * چرا این ترتیب: سرورِ تازه بدون هیچ ردیفی در دیتابیس بالا می‌آید و از env
 * کار می‌کند؛ لحظه‌ای که ادمین از پنل مقداری ست کرد، آن مقدار برنده می‌شود و
 * دیگر به deploy نیازی نیست. برای برگشتن به مقدار env کافی است ردیف را پاک
 * کند.
 *
 * انگیزهٔ مستقیمش: آدرس فرستندهٔ ایمیل تا امروز `noreply@aruzino.ir` بود که در
 * app/api/send-otp/route.ts هاردکد شده بود.
 */

export type SettingKey =
  | "mail.from"
  | "sms.driver"
  | "sms.api_key"
  | "sms.sender"
  | "sms.base_url"
  | "home.supporters_enabled"
  | "home.supporters_title"
  | "home.supporters_subtitle"
  | "home.supporters_cta_url"
  | "home.supporters_cta_label"
  | "plus.enabled"
  | "plus.expiring_soon_days"
  | "plus.payment_provider"
  | "plus.purchase_terms"
  | "plus.pilot_grant_enabled";

type SettingSpec = {
  /** متغیر محیطی که وقتی ردیفی در دیتابیس نیست خوانده می‌شود */
  envVar: string;
  /** برچسب فارسی برای پنل ادمین */
  label: string;
  description: string;
  /** گروه‌بندی در صفحهٔ تنظیمات */
  group: SettingGroup;
  /**
   * راز است؟
   *
   * مقدارِ رازها هرگز به مرورگر فرستاده نمی‌شود — پنل فقط می‌بیند که «مقداری
   * ثبت شده» و می‌تواند رویش بنویسد. بدون این، هر کسی که یک لحظه به صفحهٔ باز
   * تنظیمات دسترسی پیدا کند کلید API را می‌خواند.
   */
  secret?: boolean;
  /** ورودی از فهرست، نه متن آزاد. */
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export const SETTING_SPECS: Record<SettingKey, SettingSpec> = {
  "mail.from": {
    envVar: "MAIL_FROM",
    group: "mail",
    label: "آدرس فرستندهٔ ایمیل",
    description:
      'نامی که گیرنده می‌بیند. مثال: «سروا <noreply@example.com>». دامنه باید در سرویس ایمیل تأیید شده باشد.',
    placeholder: "سروا <noreply@example.com>",
  },

  // ── پیامک ───────────────────────────────────────────────────────────────
  // این چهار کلید برای این اضافه شده‌اند که وقتی پنل پیامک خریداری شد، راه‌اندازی
  // «وارد کردن دو مقدار در همین صفحه» باشد و نه «ویرایش .env روی سرور و
  // ری‌استارت کانتینر».
  "sms.driver": {
    envVar: "SMS_DRIVER",
    group: "sms",
    label: "سرویس پیامک",
    description:
      "تا وقتی روی «غیرفعال» باشد هیچ پیامکی فرستاده نمی‌شود و فقط در گزارش ثبت می‌شود. بعد از خرید پنل، سرویس خود را انتخاب کنید.",
    options: [
      { value: "mock", label: "غیرفعال (فقط ثبت در گزارش)" },
      { value: "kavenegar", label: "کاوه‌نگار" },
      { value: "sms_ir", label: "اس‌ام‌اس دات آی‌آر" },
      { value: "melipayamak", label: "ملی‌پیامک" },
      { value: "custom", label: "سرویس دیگر (با آدرس دلخواه)" },
    ],
  },
  "sms.api_key": {
    envVar: "SMS_API_KEY",
    group: "sms",
    label: "کلید API پیامک",
    description:
      "کلیدی که پنل پیامک به شما می‌دهد. بعد از ذخیره دیگر نمایش داده نمی‌شود؛ برای تغییر، مقدار تازه را بنویسید.",
    secret: true,
    placeholder: "کلید را اینجا بچسبانید",
  },
  "sms.sender": {
    envVar: "SMS_SENDER",
    group: "sms",
    label: "شمارهٔ فرستنده",
    description: "شماره‌ای که پیامک از آن ارسال می‌شود — همان که پنل پیامک به شما داده.",
    placeholder: "۱۰۰۰۱۲۳۴",
  },
  "sms.base_url": {
    envVar: "SMS_BASE_URL",
    group: "sms",
    label: "آدرس سرویس پیامک",
    description:
      "فقط وقتی لازم است که سرویس «دیگر» را انتخاب کرده باشید. برای سرویس‌های شناخته‌شده خالی بگذارید.",
    placeholder: "https://api.example.com/send",
  },

  // ── صفحهٔ اصلی ───────────────────────────────────────────────────────────
  // بخش حامیان از همین‌جا روشن و خاموش می‌شود و نه با تغییر کد. تا وقتی
  // خاموش است، هیچ کوئری‌ای هم برای خواندن حامیان زده نمی‌شود.
  "home.supporters_enabled": {
    envVar: "HOME_SUPPORTERS_ENABLED",
    group: "home",
    label: "نمایش بخش حامیان",
    description:
      "وقتی روشن باشد، بخش «حامیان» در صفحهٔ اصلی دیده می‌شود. تا وقتی هیچ حامیِ قابلِ نمایشی ثبت نشده، این بخش خودبه‌خود رندر نمی‌شود — پس روشن بودنش هیچ‌وقت یک بخشِ خالی نمی‌سازد.",
    options: [
      { value: "on", label: "روشن" },
      { value: "off", label: "خاموش (نمایش داده نمی‌شود)" },
    ],
  },
  "home.supporters_title": {
    envVar: "HOME_SUPPORTERS_TITLE",
    group: "home",
    label: "عنوان بخش حامیان",
    description: "تیتری که بالای فهرست حامیان می‌نشیند.",
    placeholder: "با سپاس از حامیان سروا",
  },
  "home.supporters_subtitle": {
    envVar: "HOME_SUPPORTERS_SUBTITLE",
    group: "home",
    label: "زیرعنوان بخش حامیان",
    description: "یک جملهٔ کوتاه زیر تیتر. خالی بگذارید تا نمایش داده نشود.",
    placeholder: "سروا رایگان است و با حمایت شما رایگان می‌ماند.",
  },
  "home.supporters_cta_url": {
    envVar: "HOME_SUPPORTERS_CTA_URL",
    group: "home",
    label: "آدرس دکمهٔ حمایت",
    description:
      "لینکی که دکمهٔ «حمایت می‌کنم» به آن می‌رود — درگاه پرداخت، صفحهٔ توضیح، هرچه. خالی بگذارید تا دکمه‌ای نباشد.",
    placeholder: "https://…",
  },
  "home.supporters_cta_label": {
    envVar: "HOME_SUPPORTERS_CTA_LABEL",
    group: "home",
    label: "متن دکمهٔ حمایت",
    description: "فقط وقتی آدرس بالا پر باشد معنی دارد.",
    placeholder: "حمایت می‌کنم",
  },
  // ── سروا پلاس ────────────────────────────────────────────────────────────
  // ⚠️ کلیدِ اول، همان «یک دکمه» است که کلِ پولی‌بودنِ سایت را روشن و خاموش
  // می‌کند. معنیِ دقیقِ خاموش بودن در lib/plus/config.ts نوشته شده و مهم است:
  // خاموش‌کردن، دسترسیِ کسی را نمی‌گیرد — فروش را می‌بندد و قفل‌ها را باز
  // می‌کند. یعنی اگر روزی چیزی خراب شد، مالک با یک کلیک سایت را به حالتِ
  // «همه‌چیز رایگان» برمی‌گرداند بدون اینکه یک ردیف داده از بین برود.
  "plus.enabled": {
    envVar: "PLUS_ENABLED",
    group: "plus",
    label: "فروش و قفل‌های سروا پلاس",
    description:
      "وقتی خاموش باشد، سایت دقیقاً مثل قبل از پولی‌شدن کار می‌کند: هیچ صفحهٔ خریدی دیده نمی‌شود، هیچ قابلیتی قفل نیست و نشانِ پلاس در هدر نمی‌آید. اشتراک‌های ثبت‌شده پاک نمی‌شوند و با روشن‌کردن دوباره، همان‌طور که بودند برمی‌گردند. ⚠️ اثرِ این کلید تا حدود یک دقیقه طول می‌کشد تا در همهٔ صفحه‌ها دیده شود (تنظیمات یک کش کوتاه دارند)؛ اگر بلافاصله بعد از تغییر، صفحه‌ای هنوز حالت قبل را نشان داد، یک دقیقه بعد دوباره ببینید.",
    options: [
      { value: "on", label: "روشن (پلاس فعال است)" },
      { value: "off", label: "خاموش (همه‌چیز رایگان)" },
    ],
  },
  "plus.expiring_soon_days": {
    envVar: "PLUS_EXPIRING_SOON_DAYS",
    group: "plus",
    label: "هشدارِ «نزدیک پایان» از چند روز مانده",
    description:
      "چند روز مانده به پایانِ اشتراک، به کاربر یادآوری آرام نشان داده شود. عددی بین ۱ تا ۳۰. خالی یعنی ۷ روز.",
    placeholder: "۷",
  },
  "plus.payment_provider": {
    envVar: "PLUS_PAYMENT_PROVIDER",
    group: "plus",
    label: "درگاه پرداخت",
    description:
      "تا وقتی درگاه واقعی وصل نشده روی «آزمایشی» بماند. در حالت آزمایشی هیچ پولی جابه‌جا نمی‌شود و روی سرورِ اصلی هم اصلاً اجازهٔ کار ندارد — پس نمی‌تواند به‌اشتباه یک خریدِ جعلی بسازد.",
    options: [{ value: "test", label: "آزمایشی (بدون پرداخت واقعی)" }],
  },
  "plus.purchase_terms": {
    envVar: "PLUS_PURCHASE_TERMS",
    group: "plus",
    label: "خلاصهٔ شرایط خرید",
    description:
      "یک تا سه جمله که پیش از دکمهٔ پرداخت نشان داده می‌شود (مثلاً دربارهٔ مدت، تمدید و بازپرداخت). ⚠️ سروا متنِ حقوقی برای شما نمی‌نویسد؛ تا وقتی این خالی باشد، صفحهٔ پرداخت صریحاً می‌گوید شرایطی ثبت نشده است.",
    placeholder: "اشتراک پیش‌پرداخت است و تمدید خودکار ندارد.",
  },
  "plus.pilot_grant_enabled": {
    envVar: "PLUS_PILOT_GRANT_ENABLED",
    group: "plus",
    label: "مسیر پایلوت (فعال‌سازی بدون پرداخت)",
    description:
      "وقتی روشن باشد، مدیر می‌تواند یک سفارشِ در انتظار پرداخت را بدون درگاه، به‌عنوان «دسترسی آزمایشی» فعال کند. برای دورهٔ پایلوت است؛ پیش از فروش عمومی خاموشش کنید.",
    options: [
      { value: "off", label: "خاموش" },
      { value: "on", label: "روشن (فقط برای پایلوت)" },
    ],
  },
};


// تنظیمات به‌ندرت عوض می‌شوند ولی در هر ارسال ایمیل خوانده می‌شوند. کش کوتاه
// یعنی یک کوئری اضافه به ازای هر ایمیل نداریم، و چون در set() باطل می‌شود،
// تغییر از پنل بلافاصله دیده می‌شود.
const cache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

/** مقدار تنظیم، با در نظر گرفتن ترتیب بالا. */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  // ⚠️ `key` در MySQL کلمهٔ کلیدی است و بدون backtick خطای نحوی می‌دهد.
  // (در PostgreSQL محفوظ نبود و بی‌مشکل کار می‌کرد.)
  const row = await queryOne<{ value: unknown }>(
    "select value from app_settings where `key` = ?",
    [key],
  );

  // value از نوع JSON است، پس رشته‌ها به‌صورت رشتهٔ JS برمی‌گردند. هر چیز
  // دیگری (عدد، شیء) یعنی کسی دستی ردیف را خراب کرده — نادیده گرفته می‌شود تا
  // یک ردیفِ بد کل ارسال ایمیل را نشکند.
  const fromDb = typeof row?.value === "string" && row.value.trim() ? row.value.trim() : null;
  const value = fromDb ?? process.env[SETTING_SPECS[key].envVar]?.trim() ?? null;

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/** مثل getSetting ولی اگر هیچ‌جا مقداری نبود خطا می‌دهد. */
export async function requireSetting(key: SettingKey): Promise<string> {
  const value = await getSetting(key);
  if (!value) {
    const spec = SETTING_SPECS[key];
    throw new Error(
      `تنظیم «${spec.label}» مقدار ندارد — یا از پنل مدیریت ست کنید یا ${spec.envVar} را در .env بگذارید.`,
    );
  }
  return value;
}

/** ذخیرهٔ مقدار از پنل مدیریت. */
export async function setSetting(
  key: SettingKey,
  value: string,
  updatedBy: string,
): Promise<void> {
  // ⚠️ `to_jsonb($2::text)` یعنی «این رشته را به یک مقدارِ JSON از نوع رشته
  // تبدیل کن» — یعنی 'abc' می‌شود "abc" و نه abc. معادلش در MySQL
  // CAST(? AS JSON) *نیست*: آن، رشتهٔ ورودی را به‌عنوان *متنِ JSON* تفسیر
  // می‌کند و روی مقداری مثل `smtp.example.com` خطا می‌دهد.
  //
  // JSON_QUOTE دقیقاً همان کارِ to_jsonb روی متن را می‌کند: نقل‌قول می‌گذارد
  // و کاراکترهای ویژه را escape می‌کند.
  //
  // ⚠️ ON DUPLICATE KEY UPDATE و نه REPLACE: دومی ردیف را حذف و دوباره درج
  // می‌کند، یعنی created_at و هر ستونِ ننوشته را از دست می‌دهد و تریگرهای
  // حذف را هم به‌راه می‌اندازد.
  //
  // VALUES(col) در MySQL 8 منسوخ است؛ الگوی جدید با alias است.
  await execute(
    "insert into app_settings (`key`, value, updated_by)\n" +
      "     values (?, json_quote(?), ?)\n" +
      "     on duplicate key update\n" +
      "       value = values(value), updated_at = now(6), updated_by = values(updated_by)",
    [key, value, updatedBy],
  );
  cache.delete(key);
}

/** حذف مقدارِ دیتابیس، یعنی برگشت به مقدار env. */
export async function clearSetting(key: SettingKey): Promise<void> {
  await execute("delete from app_settings where `key` = ?", [key]);
  cache.delete(key);
}

export type ListedSetting = {
  key: SettingKey;
  label: string;
  description: string;
  group: SettingSpec["group"];
  secret: boolean;
  options: { value: string; label: string }[] | null;
  placeholder: string | null;
  /** برای رازها همیشه null است — مقدار واقعی هرگز از سرور بیرون نمی‌رود. */
  value: string | null;
  /** فقط برای رازها معنی دارد: «مقداری ثبت شده یا نه». */
  hasValue: boolean;
  source: "db" | "env" | "none";
};

/** همهٔ تنظیمات با منبعشان — برای نمایش در پنل. */
export async function listSettings(): Promise<ListedSetting[]> {
  // ⚠️ jsonb_object_agg معادلِ مستقیم ندارد. JSON_OBJECTAGG هست، ولی روی
  // جدولِ خالی مقدار NULL می‌دهد (مثل خودِ jsonb_object_agg) و اگر کلید
  // تکراری باشد بی‌صدا آخری را نگه می‌دارد.
  //
  // اینجا اصلاً لازم نیست: تعداد تنظیمات انگشت‌شمار است و ساختنِ شیء در
  // TypeScript هم ساده‌تر است و هم از تلهٔ کلیدِ تکراری دور. ضمناً
  // `key` باید backtick بخورد.
  const rows = await query<{ key: string; value: unknown }>(
    "select `key`, value from app_settings",
  );
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;

  return (Object.keys(SETTING_SPECS) as SettingKey[]).map((key) => {
    const spec = SETTING_SPECS[key];
    const dbValue = typeof stored[key] === "string" && stored[key] ? (stored[key] as string) : null;
    const envValue = process.env[spec.envVar]?.trim() || null;
    const resolved = dbValue ?? envValue;

    return {
      key,
      label: spec.label,
      description: spec.description,
      group: spec.group,
      secret: spec.secret ?? false,
      options: spec.options ?? null,
      placeholder: spec.placeholder ?? null,
      // ⚠️ اینجاست که راز از پاسخ حذف می‌شود. اگر روزی کلیدی secret علامت
      // بخورد ولی این شرط را رد کند، مقدارش مستقیم در HTML صفحهٔ تنظیمات
      // می‌نشیند.
      value: spec.secret ? null : resolved,
      hasValue: Boolean(resolved),
      source: dbValue ? "db" : envValue ? "env" : "none",
    };
  });
}
