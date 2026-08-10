import "server-only";
import { queryOne, execute } from "@/lib/db";

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
  | "sms.base_url";

type SettingSpec = {
  /** متغیر محیطی که وقتی ردیفی در دیتابیس نیست خوانده می‌شود */
  envVar: string;
  /** برچسب فارسی برای پنل ادمین */
  label: string;
  description: string;
  /** گروه‌بندی در صفحهٔ تنظیمات */
  group: "mail" | "sms";
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
};

/** برچسب فارسی هر گروه، برای عنوان بخش‌ها در صفحهٔ تنظیمات. */
export const SETTING_GROUPS: Record<SettingSpec["group"], { title: string; description: string }> = {
  mail: {
    title: "ایمیل",
    description: "کد تأیید حساب و لینک بازیابی رمز از این آدرس فرستاده می‌شوند.",
  },
  sms: {
    title: "پیامک",
    description:
      "هنوز هیچ بخشی از سایت پیامک نمی‌فرستد. این تنظیمات برای وقتی است که پنل پیامک بخرید — با پر کردن آن‌ها، ورود با موبایل بدون هیچ تغییری در کد فعال می‌شود.",
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

  const row = await queryOne<{ value: unknown }>("select value from app_settings where key = $1", [
    key,
  ]);

  // value از نوع jsonb است، پس رشته‌ها به‌صورت رشتهٔ JS برمی‌گردند. هر چیز
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
  await execute(
    `insert into app_settings (key, value, updated_by)
     values ($1, to_jsonb($2::text), $3)
     on conflict (key) do update
       set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [key, value, updatedBy],
  );
  cache.delete(key);
}

/** حذف مقدارِ دیتابیس، یعنی برگشت به مقدار env. */
export async function clearSetting(key: SettingKey): Promise<void> {
  await execute("delete from app_settings where key = $1", [key]);
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
  const rows = await queryOne<{ pairs: Record<string, unknown> | null }>(
    `select jsonb_object_agg(key, value) as pairs from app_settings`,
  );
  const stored = (rows?.pairs ?? {}) as Record<string, unknown>;

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
