import { z } from "zod";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { checkOtp } from "@/lib/auth/otp";
import { findUserById } from "@/lib/auth/session";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";

const schema = z.object({
  code: z
    .string()
    .trim()
    // ارقام فارسی هم قبول می‌شوند: کاربر ممکن است از صفحه‌کلید فارسی تایپ کند
    // یا کد را از ایمیل کپی کند. پایین‌تر به لاتین تبدیل می‌شوند.
    .regex(/^[0-9۰-۹]{6}$/, "کد باید ۶ رقم باشد"),
});

/** ۰۱۲۳۴۵۶۷۸۹ فارسی → لاتین. */
function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/**
 * POST /api/v1/auth/verify-email — تأیید ایمیل با کد.
 *
 * تفاوت اصلی با نسخهٔ قبلی: آن یکی در پایان فقط {success:true} برمی‌گرداند و
 * منتظر می‌ماند کلاینت باورش کند و خودش تصمیم بگیرد چه کند. اینجا تأیید یک
 * اثر واقعی در دیتابیس دارد — users.email_verified_at ست می‌شود — و نتیجه‌اش
 * از سشن خوانده می‌شود، نه از حرفِ مرورگر.
 */
export const POST = withRoute("/api/v1/auth/verify-email", async (request: Request) => {
  try {
    const user = await requireUser();

    if (user.emailVerified) return ok({ verified: true, alreadyVerified: true });

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const result = await checkOtp(user.email, "signup_verify", toLatinDigits(body.data.code));
    if (!result.ok) return fail(result.error, 400);

    await execute("update users set email_verified_at = now() where id = $1", [user.id]);

    // کاربرِ تازه از دیتابیس خوانده می‌شود تا پاسخ، وضعیت واقعی را نشان بدهد و
    // نه نسخهٔ کهنه‌ای که ابتدای درخواست داشتیم.
    const updated = await findUserById(user.id);
    return ok({ verified: true, user: updated });
  } catch (err) {
    return handleError(err);
  }
});
