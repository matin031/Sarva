import "server-only";
import { notify } from "@/lib/plus/notifications";
import { queryOne } from "@/lib/db";
import { notifyUser } from "./index";
import { alertAdmins } from "./admin-alerts";

/**
 * خوش‌آمدِ حسابِ تازه — هر دو کانال، در یک فراخوان.
 *
 * ⚠️ این تابع وجود دارد چون **سه** مسیر حساب می‌سازند و هر سه باید یک کار
 * را بکنند: ثبت‌نام با ایمیل، ورود/ثبت‌نام با کدِ پیامکی، و بازگشت از گوگل.
 * نوشتنِ دو فراخوانِ کنارِ هم در سه فایل یعنی مسیرِ چهارم — هر چه باشد —
 * یکی‌شان را جا می‌گذارد. (همان استدلالِ `authUserColumns` و همان اشتباهی
 * که آنجا دو بار تکرار شد.)
 *
 * ⚠️ هرگز throw نمی‌کند: هیچ‌کدام از دو کارِ داخلش لازمهٔ ساختِ حساب نیستند.
 * حسابی که ساخته شده و پیامِ خوش‌آمدش نرفته، حسابِ سالمی است؛ ثبت‌نامی که
 * به‌خاطر یک پیامک برگردد، نیست.
 *
 * ⚠️ فقط برای حسابِ **تازه**. مسیرِ پیامکی و مسیرِ گوگل هر دو هم ورودند و
 * هم ثبت‌نام، پس فراخوان باید خودش شرطِ «تازه ساخته شد» را بگذارد. کلیدِ
 * یکتاسازی نگهبانِ دومش است و نه اولش.
 */
export async function sendWelcome(userId: string): Promise<void> {
  const dedupeKey = `welcome:${userId}`;

  /* اعلانِ درون‌سایتی: اولین چیزی که کاربرِ تازه در زنگولهٔ پنل می‌بیند.
     ⚠️ نوعش `welcome` است و نه `plus_activated`. آن یکی کارتِ خوش‌آمدگوییِ
     *پلاس* را روشن می‌کند (`getUnreadWelcome`)، یعنی هر کاربرِ تازه
     onboardingِ خریدِ اشتراک را می‌دید بی‌آنکه چیزی خریده باشد. */
  await notify({
    userId,
    kind: "welcome",
    title: "به سروا خوش آمدی",
    body: "درس‌ها، آزمون‌ها و بازی‌ها از همین حالا در دسترس‌اند.",
    href: "/panel",
    dedupeKey,
  }).catch(() => {});

  await notifyUser({ userId, event: "welcome", dedupeKey });

  /* خبرِ ثبت‌نام برای مدیر — همین‌جا چون این تنها نقطه‌ای است که هر سه
     مسیرِ ساختِ حساب از آن رد می‌شوند (همان استدلالِ بالای تابع). جزئیات
     بعد از پاسخ خوانده می‌شوند، نه در مسیرِ ثبت‌نام. */
  alertAdmins("signup", async () => {
    const u = await queryOne<{
      email: string | null;
      phone: string | null;
      full_name: string | null;
      desired_role: string | null;
      total: number;
    }>(
      `select email, phone, full_name, desired_role,
              (select count(*) from users) as total
         from users where id = ?`,
      [userId],
    );
    if (!u) return null;
    return {
      event: "signup",
      heading: `کاربرِ تازه: ${u.full_name || u.email || u.phone || "بدون نام"}`,
      rows: [
        { label: "نام", value: u.full_name },
        { label: "ایمیل", value: u.email },
        { label: "موبایل", value: u.phone },
        { label: "روشِ ثبت‌نام", value: u.email && !u.phone ? "ایمیل" : u.phone && !u.email ? "موبایل" : null },
        { label: "می‌خواهد", value: u.desired_role === "teacher" ? "دبیر" : "دانش‌آموز" },
        { label: "کلِ کاربران", value: Number(u.total).toLocaleString("fa-IR") },
      ],
      href: `/admin/users/${userId}`,
    };
  });
}
