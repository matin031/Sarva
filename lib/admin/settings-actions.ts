"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { SETTING_SPECS, clearSetting, listSettings, setSetting, type SettingKey } from "@/lib/settings";
import { mailAdapter, sendMail } from "@/lib/mail";
import { smsAdapter } from "@/lib/sms";
import { storageAdapter } from "@/lib/storage";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

export type AdminSetting = {
  key: SettingKey;
  label: string;
  description: string;
  value: string | null;
  /** از کجا آمده: ردیف دیتابیس، متغیر محیطی، یا هیچ‌جا */
  source: "db" | "env" | "none";
};

export async function adminListSettings(): Promise<AdminSetting[]> {
  await requireAdmin();
  return listSettings();
}

/** درایورهای فعال — فقط برای نمایش، تا ادمین بداند ایمیل از کجا می‌رود. */
export async function adminAdapterStatus(): Promise<{
  mail: string;
  sms: string;
  storage: string;
}> {
  await requireAdmin();
  return {
    mail: mailAdapter().name,
    sms: smsAdapter().name,
    storage: storageAdapter().name,
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

  await setSetting(key, trimmed, admin.id);
  revalidatePath("/admin/settings");
  return { ok: true, data: null };
}

/** حذف مقدارِ دیتابیس، یعنی برگشت به مقدار .env. */
export async function adminResetSetting(key: SettingKey): Promise<ActionResult> {
  await requireAdmin();
  if (!(key in SETTING_SPECS)) return { ok: false, errors: ["تنظیم ناشناخته."] };

  await clearSetting(key);
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
  await requireAdmin();

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
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, errors: [(err as Error).message] };
  }
}
