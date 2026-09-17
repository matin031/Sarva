"use server";

import { requireAdmin } from "@/lib/require-admin";
import {
  MAX_UPLOAD_BYTES,
  detectAudioFile,
  detectImageFile,
  storageAdapter,
  type FileTypeCheck,
} from "@/lib/storage";
import { rateLimit } from "@/lib/api/rate-limit";
import { recordAudit, recordError } from "@/lib/admin/audit";
import { logger } from "@/lib/observability";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/** یک نوعِ آپلود: کجا می‌نشیند، چقدر بزرگ می‌تواند باشد، و چه چیزی را
 *  می‌پذیرد.
 *
 *  ⚠️ همهٔ تفاوتِ صوت و تصویر در همین چند خط است و نه در دو مسیرِ جدا.
 *  محدودیتِ نرخ، سنجشِ حجم پیش از خواندنِ محتوا، تشخیصِ نوع از روی بایت‌ها و
 *  پاک‌سازیِ پیامِ خطا — هر چهار، *همان* دفاع‌اند برای هر دو. دو نسخهٔ جدا
 *  یعنی روزی یکی وصله شود و آن یکی نه. */
type UploadKind = {
  prefix: string;
  maxBytes: number;
  detect: (file: File) => Promise<FileTypeCheck>;
  /** برای لاگ و جدولِ رخدادها. */
  auditAction: "upload.audio" | "upload.image";
  noun: string;
};

const AUDIO: UploadKind = {
  prefix: "quiz-audio",
  maxBytes: MAX_UPLOAD_BYTES,
  detect: detectAudioFile,
  auditAction: "upload.audio",
  noun: "فایل صوتی",
};

/** تصویر سقفِ کوچک‌تری دارد: یک نگارهٔ وب هیچ دلیلی ندارد از این بزرگ‌تر
 *  باشد، و هر چه کوچک‌تر، صفحهٔ مرورِ بازی زودتر می‌آید. */
const IMAGE: UploadKind = {
  prefix: "pair-images",
  maxBytes: Math.min(MAX_UPLOAD_BYTES, 8 * 1024 * 1024),
  detect: detectImageFile,
  auditAction: "upload.image",
  noun: "تصویر",
};

async function storeUpload(
  kind: UploadKind,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const admin = await requireAdmin();

  // حتی یک ادمین هم نباید بتواند (تصادفاً یا با حسابِ به‌سرقت‌رفته) دیسک سرور
  // را پر کند. با سقف ۱۵ مگابایتی هر فایل، این یعنی حداکثر ۴۵۰ مگابایت در
  // ساعت — سخاوتمندانه برای کار واقعی، بی‌فایده برای پر کردن دیسک.
  const limit = rateLimit(`upload:${admin.id}`, 30, 60 * 60);
  if (!limit.allowed) {
    logger.warn("آپلود به‌خاطر سقف نرخ رد شد", {
      event: "upload.rate_limited",
      user_id: admin.id,
      retry_after_seconds: limit.retryAfterSeconds,
    });
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
  if (file.size > kind.maxBytes) {
    const mb = Math.floor(kind.maxBytes / 1024 / 1024);
    return { ok: false, errors: [`حجم فایل نباید بیشتر از ${mb} مگابایت باشد.`] };
  }

  // نوع فایل از بایت‌های خودش خوانده می‌شود، نه از هدرِ مرورگر — توضیح کامل در
  // lib/storage/index.ts کنار detectAudioFile.
  const detected = await kind.detect(file);
  if (!detected.ok) {
    // ⚠️ نام فایلِ کاربر لاگ نمی‌شود — می‌تواند هر چیزی باشد، از داده‌های
    // شخصی تا رشته‌ای که خطِ لاگ را گمراه کند. آنچه واقعاً به کار می‌آید
    // حجم و نوعِ *اعلام‌شده* است.
    logger.info("آپلود رد شد: محتوای فایل معتبر نبود", {
      event: "upload.rejected",
      user_id: admin.id,
      size_bytes: file.size,
      declared_mime: (file.type || "").slice(0, 60) || null,
    });
    return { ok: false, errors: [detected.error] };
  }

  try {
    // prefix باعث می‌شود پوشهٔ uploads با انواع فایل قاطی نشود؛ صوتِ کوییز و
    // نگارهٔ جفت‌های ادبی هرکدام جای خودشان را دارند.
    const adapter = storageAdapter();
    const startedAt = performance.now();
    const stored = await adapter.put(file, {
      prefix: kind.prefix,
      extension: detected.extension,
    });

    logger.info(`${kind.noun} آپلود شد`, {
      event: "upload.succeeded",
      user_id: admin.id,
      storage_driver: adapter.name,
      size_bytes: file.size,
      detected_format: detected.extension,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    await recordAudit({
      actor: admin,
      action: kind.auditAction,
      targetType: "file",
      targetId: stored.key,
      summary: `${kind.noun} «${file.name}» آپلود شد`,
      metadata: { size: file.size, format: detected.extension },
    });

    return { ok: true, data: { url: stored.url } };
  } catch (err) {
    // پیام خام سیستم‌فایل مسیر سرور را لو می‌دهد؛ فقط به لاگ و جدول خطا
    // می‌رود، نه به کاربر. recordError خودش خط JSON را هم می‌نویسد.
    await recordError("upload", err, "storeUpload", {
      metadata: {
        storage_driver: storageAdapter().name,
        upload_prefix: kind.prefix,
        size_bytes: file.size,
        detected_format: detected.extension,
      },
    });
    return { ok: false, errors: ["ذخیرهٔ فایل ناموفق بود. دوباره تلاش کنید."] };
  }
}

/** آپلود فایل صوتی برای سؤالات کوییز.
 *
 *  امضای این تابع عمداً دست‌نخورده مانده — components/admin/AudioUploadField.tsx
 *  همان `{ ok, data: { url } }` را انتظار دارد و یک خط هم عوض نشده. تنها چیزی
 *  که تغییر کرده جایی است که بایت‌ها می‌روند: قبلاً باکت quiz-audio در
 *  Supabase Storage، بعد دیسک خودِ سرور از راه lib/storage، و حالا همان مسیر
 *  از داخلِ storeUpload که با آپلودِ تصویر مشترک است.
 *
 *  نکتهٔ کامنت قبلیِ همین فایل («عوض کردن ذخیره‌سازی فقط یعنی عوض کردن همین یک
 *  تابع») دقیقاً درست از آب درآمد — و حالا حتی همین تابع هم نمی‌داند فایل کجا
 *  می‌رود، چون آداپتر تصمیم می‌گیرد. */
export async function adminUploadQuizAudio(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  return storeUpload(AUDIO, formData);
}

/** آپلود نگاره — امروز برای جفت‌های ادبی، فردا برای هر چیزی که تصویر بخواهد.
 *
 *  ⚠️ آنچه برمی‌گردد یک نشانیِ نسبی است (`/uploads/pair-images/…`) و نه یک
 *  مسیرِ دیسک. همان رشته در دیتابیس ذخیره می‌شود و همان در `<img src>`
 *  می‌نشیند؛ هیچ‌کدام نمی‌دانند فایل واقعاً کجاست. */
export async function adminUploadImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  return storeUpload(IMAGE, formData);
}
