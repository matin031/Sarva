"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import {
  SETTING_SPECS,
  clearSetting,
  listSettings,
  setSetting,
  type ListedSetting,
  type SettingKey,
} from "@/lib/settings";
import { mailAdapter, sendMail } from "@/lib/mail";
import { smsStatus } from "@/lib/sms";
import { storageAdapter } from "@/lib/storage";
import { recordAudit } from "@/lib/admin/audit";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

/** شکل تنظیمی که به پنل می‌رود. مقدارِ رازها در listSettings حذف شده است. */
export type AdminSetting = ListedSetting;

export async function adminListSettings(): Promise<AdminSetting[]> {
  await requireAdmin();
  return listSettings();
}

/** درایورهای فعال — فقط برای نمایش، تا ادمین بداند ایمیل از کجا می‌رود. */
export type AdapterStatus = {
  mail: { driver: string; label: string; healthy: boolean; note: string };
  sms: { driver: string; label: string; healthy: boolean; note: string };
  storage: { driver: string; label: string; healthy: boolean; note: string };
};

/**
 * وضعیت سرویس‌ها، به زبان آدمیزاد.
 *
 * نسخهٔ قبلی فقط نام فنیِ درایور را می‌داد و کنارش می‌نوشت «با SMS_DRIVER در
 * .env عوض می‌شود» — یعنی دقیقاً همان چیزی که کاربرِ غیرفنی نه می‌فهمد و نه
 * می‌تواند انجام دهد. حالا هر کارت می‌گوید سرویس چه می‌کند و آیا واقعاً آماده
 * است یا نه.
 */
export async function adminAdapterStatus(): Promise<AdapterStatus> {
  await requireAdmin();

  const mailDriver = mailAdapter().name;
  const sms = await smsStatus();
  const storageDriver = storageAdapter().name;

  return {
    mail: {
      driver: mailDriver,
      label: mailDriver === "resend" ? "سرویس Resend" : "سرور ایمیل اختصاصی (SMTP)",
      healthy: true,
      note: "برای اطمینان، از بخش بالا یک ایمیل آزمایشی بفرستید.",
    },
    sms: {
      driver: sms.driver,
      // برچسب فارسی از همان فهرستی می‌آید که کاربر در dropdown می‌بیند — وگرنه
      // کارت وضعیت نام فنیِ «kavenegar» را نشان می‌داد، دقیقاً همان چیزی که
      // قرار بود از این صفحه حذف شود.
      label:
        SETTING_SPECS["sms.driver"].options?.find((o) => o.value === sms.driver)?.label ??
        sms.driver,
      // «سالم» یعنی واقعاً می‌تواند پیامک بفرستد. حالت mock عمداً سالم حساب
      // نمی‌شود، وگرنه یک تیک سبز به مدیر می‌گوید پیامک کار می‌کند در حالی که
      // هیچ پیامکی نمی‌رود.
      healthy: sms.implemented && sms.driver !== "mock" && sms.hasApiKey && sms.hasSender,
      note:
        sms.driver === "mock"
          ? "هیچ پیامکی ارسال نمی‌شود. بعد از خرید پنل پیامک، سرویس را در بخش «پیامک» انتخاب کنید."
          : !sms.implemented
            ? "این سرویس هنوز در سایت پیاده‌سازی نشده — فعلاً پیامکی ارسال نمی‌شود."
            : !sms.hasApiKey
              ? "کلید API وارد نشده."
              : !sms.hasSender
                ? "شمارهٔ فرستنده وارد نشده."
                : "آمادهٔ ارسال.",
    },
    storage: {
      driver: storageDriver,
      label: "دیسک همین سرور",
      healthy: true,
      note: "فایل‌های صوتی آپلودشده روی خودِ سرور ذخیره می‌شوند و از پشتیبان‌گیری سرور جدا نیستند.",
    },
  };
}

export async function adminSetSetting(key: SettingKey, value: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!(key in SETTING_SPECS)) return { ok: false, errors: ["تنظیم ناشناخته."] };

  const trimmed = value.trim();
  if (!trimmed) return { ok: false, errors: ["مقدار نمی‌تواند خالی باشد."] };

  // «سروا <noreply@example.com>» یا «noreply@example.com» — هر دو قبول است،
  // ولی چیزی که هیچ نشانی از یک ایمیل ندارد نه: یک مقدار غلط اینجا یعنی هیچ
  // ایمیلی از سایت بیرون نمی‌رود و کشف کردنش هم سخت است.
  if (key === "mail.from") {
    const address = trimmed.match(/<([^>]+)>/)?.[1] ?? trimmed;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())) {
      return { ok: false, errors: ["آدرس ایمیل معتبر نیست. مثال: سروا <noreply@example.com>"] };
    }
  }

  // تنظیمی که فهرست گزینه دارد، فقط همان گزینه‌ها را می‌پذیرد. بدون این، یک
  // مقدار اشتباه بی‌سروصدا ذخیره می‌شد و بعداً به «هیچ پیامکی نمی‌رود و معلوم
  // نیست چرا» تبدیل می‌شد.
  const options = SETTING_SPECS[key].options;
  if (options && !options.some((o) => o.value === trimmed)) {
    return { ok: false, errors: ["گزینهٔ انتخاب‌شده معتبر نیست."] };
  }

  if (key === "sms.base_url" && !/^https:\/\/[^\s]+$/.test(trimmed)) {
    return { ok: false, errors: ["آدرس سرویس باید با https:// شروع شود."] };
  }

  await setSetting(key, trimmed, admin.id);

  await recordAudit({
    actor: admin,
    action: "setting.update",
    targetType: "setting",
    targetId: key,
    summary: `تنظیم «${SETTING_SPECS[key].label}» تغییر کرد`,
    // مقدار عمداً فرستاده می‌شود ولی redactMetadata کلیدهای حساس (api_key و
    // مانندش) را پنهان می‌کند — پس آدرس ایمیل در لاگ می‌آید و کلید پیامک نه.
    metadata: { [key]: trimmed },
  });

  revalidatePath("/admin/settings");
  return { ok: true, data: null };
}

/** حذف مقدارِ دیتابیس، یعنی برگشت به مقدار .env. */
export async function adminResetSetting(key: SettingKey): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(key in SETTING_SPECS)) return { ok: false, errors: ["تنظیم ناشناخته."] };

  await clearSetting(key);

  await recordAudit({
    actor: admin,
    action: "setting.reset",
    targetType: "setting",
    targetId: key,
    summary: `تنظیم «${SETTING_SPECS[key].label}» به مقدار سرور برگشت`,
  });
  revalidatePath("/admin/settings");
  return { ok: true, data: null };
}

/**
 * ارسال یک ایمیل آزمایشی.
 *
 * بدون این، تنها راه فهمیدن اینکه تنظیمات ایمیل درست است یا نه، ثبت‌نام کردن
 * یک کاربر واقعی و امید داشتن است. اینجا خطای واقعیِ سرویس ایمیل هم نمایش
 * داده می‌شود — این تنها جایی است که آن پیام خام به ادمین نشان داده می‌شود،
 * چون دقیقاً همان چیزی است که برای درست کردنش لازم دارد.
 */
export async function adminSendTestEmail(to: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
    return { ok: false, errors: ["آدرس گیرنده معتبر نیست."] };
  }

  try {
    await sendMail({
      to: to.trim(),
      subject: "ایمیل آزمایشی سروا",
      html: `<div dir="rtl" style="font-family:sans-serif">
               <p>این یک ایمیل آزمایشی از پنل مدیریت سروا است.</p>
               <p style="color:#64748b;font-size:13px">اگر این را می‌بینید، تنظیمات ایمیل درست کار می‌کند.</p>
             </div>`,
      text: "این یک ایمیل آزمایشی از پنل مدیریت سروا است.",
    });
    await recordAudit({
      actor: admin,
      action: "setting.test_email",
      targetType: "setting",
      targetId: "mail.from",
      summary: `ایمیل آزمایشی به ${to.trim()} فرستاده شد`,
    });

    return { ok: true, data: null };
  } catch (err) {
    // این خطا هم به مدیر نشان داده می‌شود و هم در لاگ خطا می‌نشیند: پیامِ روی
    // صفحه با بستن پنجره می‌رود، ولی مشکلِ تنظیمات ایمیل سر جایش می‌ماند.
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("mail", err, "ارسال ایمیل آزمایشی از پنل");
    return { ok: false, errors: [(err as Error).message] };
  }
}
