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

export type SettingKey = "mail.from";

type SettingSpec = {
  /** متغیر محیطی که وقتی ردیفی در دیتابیس نیست خوانده می‌شود */
  envVar: string;
  /** برچسب فارسی برای پنل ادمین */
  label: string;
  description: string;
};

export const SETTING_SPECS: Record<SettingKey, SettingSpec> = {
  "mail.from": {
    envVar: "MAIL_FROM",
    label: "آدرس فرستندهٔ ایمیل",
    description:
      'نامی که گیرنده می‌بیند. مثال: «سروا <noreply@example.com>». دامنه باید در سرویس ایمیل تأیید شده باشد.',
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

/** همهٔ تنظیمات با منبعشان — برای نمایش در پنل. */
export async function listSettings(): Promise<
  { key: SettingKey; label: string; description: string; value: string | null; source: "db" | "env" | "none" }[]
> {
  const rows = await queryOne<{ pairs: Record<string, unknown> | null }>(
    `select jsonb_object_agg(key, value) as pairs from app_settings`,
  );
  const stored = (rows?.pairs ?? {}) as Record<string, unknown>;

  return (Object.keys(SETTING_SPECS) as SettingKey[]).map((key) => {
    const spec = SETTING_SPECS[key];
    const dbValue = typeof stored[key] === "string" && stored[key] ? (stored[key] as string) : null;
    const envValue = process.env[spec.envVar]?.trim() || null;

    return {
      key,
      label: spec.label,
      description: spec.description,
      value: dbValue ?? envValue,
      source: dbValue ? "db" : envValue ? "env" : "none",
    };
  });
}
