import { requireUser } from "@/lib/auth/current-user";
import { issueOtp } from "@/lib/auth/otp";
import { sendMail } from "@/lib/mail";
import { verificationCodeEmail } from "@/lib/mail/templates";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";

/**
 * POST /api/v1/auth/send-verification — ارسال کد تأیید ایمیل.
 *
 * ایمیل از سشنِ خودِ کاربر خوانده می‌شود و نه از بدنهٔ درخواست. این یک تفاوت
 * امنیتی مهم با نسخهٔ قبلی است: /api/send-otp هر آدرسی را که در بدنه می‌آمد
 * قبول می‌کرد، یعنی هرکسی می‌توانست با آن به هر آدرسی در دنیا ایمیل بفرستد و
 * دامنهٔ سایت را به لیست سیاه اسپم برساند.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (user.emailVerified) {
      return ok({ alreadyVerified: true });
    }

    const { ip } = requestMeta(request);
    const issued = await issueOtp(user.email, "signup_verify", ip);

    if (!issued.ok) {
      return fail(issued.error, issued.retryAfterSeconds ? 429 : 400);
    }

    const template = verificationCodeEmail(issued.code, issued.expiresInMinutes);
    await sendMail({ ...template, to: user.email });

    return ok({ sent: true, expiresInMinutes: issued.expiresInMinutes });
  } catch (err) {
    return handleError(err);
  }
}
