"use server";

import { requireAdmin } from "@/lib/require-admin";
import { MAX_UPLOAD_BYTES, detectAudioFile, storageAdapter } from "@/lib/storage";
import { rateLimit } from "@/lib/api/rate-limit";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/** آپلود فایل صوتی برای سؤالات کوییز.
 *
 *  امضای این تابع عمداً دست‌نخورده مانده — components/admin/AudioUploadField.tsx
 *  همان `{ ok, data: { url } }` را انتظار دارد و یک خط هم عوض نشده. تنها چیزی
 *  که تغییر کرده جایی است که بایت‌ها می‌روند: قبلاً باکت quiz-audio در
 *  Supabase Storage، حالا دیسک خودِ سرور از راه lib/storage.
 *
 *  نکتهٔ کامنت قبلیِ همین فایل («عوض کردن ذخیره‌سازی فقط یعنی عوض کردن همین یک
 *  تابع») دقیقاً درست از آب درآمد — و حالا حتی همین تابع هم نمی‌داند فایل کجا
 *  می‌رود، چون آداپتر تصمیم می‌گیرد. */
export async function adminUploadQuizAudio(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const admin = await requireAdmin();

  // حتی یک ادمین هم نباید بتواند (تصادفاً یا با حسابِ به‌سرقت‌رفته) دیسک سرور
  // را پر کند. با سقف ۱۵ مگابایتی هر فایل، این یعنی حداکثر ۴۵۰ مگابایت در
  // ساعت — سخاوتمندانه برای کار واقعی، بی‌فایده برای پر کردن دیسک.
  const limit = rateLimit(`upload:${admin.id}`, 30, 60 * 60);
  if (!limit.allowed) {
    return {
      ok: false,
      errors: [`آپلودهای زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`],
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: ["فایلی انتخاب نشده."] };
  }

  // حجم قبل از خواندنِ محتوا بررسی می‌شود: خواندنِ بایت‌های یک فایل ۲ گیگابایتی
  // برای اینکه بعد ردش کنیم، خودش همان حمله‌ای است که می‌خواهیم جلویش را
  // بگیریم.
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024);
    return { ok: false, errors: [`حجم فایل نباید بیشتر از ${mb} مگابایت باشد.`] };
  }

  // نوع فایل از بایت‌های خودش خوانده می‌شود، نه از هدرِ مرورگر — توضیح کامل در
  // lib/storage/index.ts کنار detectAudioFile.
  const detected = await detectAudioFile(file);
  if (!detected.ok) {
    return { ok: false, errors: [detected.error] };
  }

  try {
    // prefix باعث می‌شود پوشهٔ uploads با انواع فایل قاطی نشود؛ وقتی روزی
    // تصویر واژگان هم آپلودی شد، هرکدام جای خودش را دارد.
    const stored = await storageAdapter().put(file, {
      prefix: "quiz-audio",
      extension: detected.extension,
    });
    return { ok: true, data: { url: stored.url } };
  } catch (err) {
    // پیام خام سیستم‌فایل مسیر سرور را لو می‌دهد؛ فقط به لاگ می‌رود.
    console.error("[upload] آپلود فایل صوتی ناموفق بود:", err);
    return { ok: false, errors: ["ذخیرهٔ فایل ناموفق بود. دوباره تلاش کنید."] };
  }
}
