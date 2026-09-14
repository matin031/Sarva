import { requireUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/auth/session";
import { fail, handleError, ok } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import {
  detectImageFile,
  storageAdapter,
  storageKeyFromUrl,
} from "@/lib/storage";
import { updateAvatar } from "@/lib/profile/queries";
import { logger } from "@/lib/observability";

/**
 * تصویر پروفایل — آپلود (POST) و حذف (DELETE).
 *
 * ⚠️ بر خلافِ حکمِ کارگزینی، این فایل **عمومی** است و باید باشد: تصویرِ
 * پروفایل کنارِ نامِ کاربر در سروا کلاب و در فهرستِ اعضای کلاس دیده می‌شود،
 * یعنی دیگران هم بازش می‌کنند. پس همان انبارِ همیشگیِ `lib/storage` و همان
 * مسیرِ `/uploads`.
 *
 * (تفاوتش با `lib/teacher/documents.ts` دقیقاً همین است و ارزش دارد صریح
 * نوشته شود: آنجا «فقط مدیر» یک الزام بود، اینجا «همه» یک نیاز است.)
 *
 * ⚠️ سقفِ حجم کوچک‌تر از سقفِ عمومیِ سایت است. یک تصویرِ پروفایل که در ۹۶
 * پیکسل نمایش داده می‌شود هیچ دلیلی ندارد دو مگابایت باشد، و هر مگابایتِ
 * اضافه هم روی دیسک می‌ماند و هم در هر بارگذاریِ صفحهٔ کلاب دانلود می‌شود.
 */

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const POST = withRoute("/api/v1/auth/profile/avatar", async (request: Request) => {
  try {
    const user = await requireUser();

    // سقفِ نرخ سخت‌گیرانه‌تر از فرمِ متنی: هر تلاش یک فایل روی دیسک
    // می‌گذارد و نسخهٔ قبلی را پاک می‌کند — کاری که نباید بشود در حلقه زد.
    const limit = rateLimit(`avatar:${user.id}`, 10, 60 * 60);
    if (!limit.allowed) {
      return fail(`آپلودهای زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("فایلی انتخاب نشده.", 400);
    }

    // ⚠️ حجم *پیش از* خواندنِ محتوا سنجیده می‌شود. خواندنِ بایت‌های یک فایلِ
    // دویست‌مگابایتی برای اینکه بعد ردش کنیم، خودش همان حمله‌ای است که
    // می‌خواهیم جلویش را بگیریم. (همان استدلالِ `lib/admin/upload-actions.ts`.)
    if (file.size > MAX_AVATAR_BYTES) {
      return fail("حجم تصویر نباید بیشتر از ۲ مگابایت باشد.", 400);
    }

    // نوعِ واقعی از بایت‌های خودِ فایل — نه از هدرِ مرورگر. چراییِ کاملش
    // کنارِ `detectImageFile` در `lib/storage` نوشته شده؛ خلاصه‌اش اینکه
    // `file.type` را فرستنده می‌نویسد و یک `x.html` با هدرِ جعلیِ
    // `image/png` می‌توانست روی دامنهٔ خودِ سایت به‌عنوان HTML سرو شود.
    const detected = await detectImageFile(file);
    if (!detected.ok) return fail(detected.error, 400);

    const adapter = storageAdapter();
    const stored = await adapter.put(file, { prefix: "avatars", extension: detected.extension });

    // ⚠️ نشانیِ تازه *قبل* از حذفِ قدیمی نوشته می‌شود.
    //
    // ترتیبِ برعکس یک پنجره می‌ساخت که در آن ردیفِ کاربر به فایلی اشاره
    // می‌کرد که دیگر وجود نداشت — یعنی تصویرِ شکسته. این ترتیب بدترین
    // حالتش یک فایلِ یتیم روی دیسک است، که به‌مراتب بی‌ضررتر است.
    await updateAvatar(user.id, stored.url);

    const previous = storageKeyFromUrl(user.avatarUrl);
    if (previous && previous !== stored.key) {
      await adapter.remove(previous).catch((err) => {
        // نرفتنِ فایلِ قبلی نباید آپلودِ موفق را به خطا تبدیل کند.
        logger.warn("حذف تصویر پروفایل قبلی ناموفق بود", {
          event: "profile.avatar.cleanup_failed",
          user_id: user.id,
          err,
        });
      });
    }

    const updated = await findUserById(user.id);
    return ok({ user: updated });
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/profile/avatar");
  }
});

/** برداشتنِ تصویر — تصویرِ پروفایل اختیاری است (بند ۲)، پس پس گرفتنش هم
 *  باید ممکن باشد. */
export const DELETE = withRoute("/api/v1/auth/profile/avatar", async () => {
  try {
    const user = await requireUser();

    await updateAvatar(user.id, null);

    const key = storageKeyFromUrl(user.avatarUrl);
    if (key) await storageAdapter().remove(key).catch(() => {});

    const updated = await findUserById(user.id);
    return ok({ user: updated });
  } catch (err) {
    return handleError(err, "DELETE /api/v1/auth/profile/avatar");
  }
});

export const dynamic = "force-dynamic";
