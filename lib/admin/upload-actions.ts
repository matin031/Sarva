"use server";

import { requireAdmin } from "@/lib/require-admin";
import { MAX_UPLOAD_BYTES, storageAdapter } from "@/lib/storage";

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
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: ["فایلی انتخاب نشده."] };
  }
  if (!file.type.startsWith("audio/")) {
    return { ok: false, errors: ["فقط فایل صوتی مجاز است."] };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024);
    return { ok: false, errors: [`حجم فایل نباید بیشتر از ${mb} مگابایت باشد.`] };
  }

  try {
    // prefix باعث می‌شود پوشهٔ uploads با انواع فایل قاطی نشود؛ وقتی روزی
    // تصویر واژگان هم آپلودی شد، هرکدام جای خودش را دارد.
    const stored = await storageAdapter().put(file, { prefix: "quiz-audio" });
    return { ok: true, data: { url: stored.url } };
  } catch (err) {
    // پیام خام سیستم‌فایل مسیر سرور را لو می‌دهد؛ فقط به لاگ می‌رود.
    console.error("[upload] آپلود فایل صوتی ناموفق بود:", err);
    return { ok: false, errors: ["ذخیرهٔ فایل ناموفق بود. دوباره تلاش کنید."] };
  }
}
