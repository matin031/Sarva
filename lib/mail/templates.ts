import "server-only";
import type { MailMessage } from "./index";
import { emailUrl } from "@/lib/seo/site";

/** قالب‌های ایمیل.
 *
 *  ⚠️ چرا این‌ها رنگِ پالت را نمی‌گیرند: ایمیل نه متغیرِ CSS دارد و نه
 *  دسترسی به localStorage. پالتِ انتخابیِ کاربر در مرورگرِ خودش زندگی
 *  می‌کند و سرور هنگام فرستادنِ ایمیل اصلاً از آن خبر ندارد. پس ایمیل‌ها
 *  همیشه با هویتِ پایهٔ سروا — فیروزه روی شبِ سرمه‌ای — فرستاده می‌شوند.
 *
 *  ⚠️ و چرا همه‌چیز جدول و استایلِ درون‌خطی است: کلاینت‌های ایمیل (به‌ویژه
 *  اوت‌لوک) `<style>` و چیدمانِ مدرن را یا نادیده می‌گیرند یا خراب
 *  می‌کنند. جدولِ تودرتو با inline style تنها چیزی است که همه‌جا یک‌شکل
 *  می‌ماند. */

/**
 * نشانِ سروا.
 *
 * ⚠️ **تصویرِ PNG با آدرسِ مطلق، و نه SVG درون‌خطی.**
 *
 * نسخهٔ قبل همان `<svg>` صفحهٔ سایت را مستقیم داخلِ ایمیل می‌گذاشت. در
 * پیش‌نمایشِ مرورگر بی‌نقص بود و در ایمیلِ واقعی یک **دایرهٔ خالی**: جی‌میل
 * (و اوت‌لوک و تقریباً هر کلاینتِ دیگری) `<svg>` درون‌خطی را از HTML ایمیل
 * حذف می‌کند. تنها چیزی که باقی می‌ماند همان هالهٔ گرادیانیِ پشتش بود.
 *
 * برای همین هیچ‌وقت نباید ایمیل را در مرورگر تأیید کرد؛ باید واقعاً فرستاده
 * و در خودِ جی‌میل دیده شود.
 *
 * ⚠️ و آدرس باید **مطلق** باشد. `/logo.png` در ایمیل هیچ ریشه‌ای ندارد که
 * نسبت به آن حل شود. `emailUrl` همان تابعی است که لینکِ بازیابیِ رمز هم از
 * آن می‌آید: میزبانِ محلی را رد می‌کند و به دامنهٔ اصلی برمی‌گردد، وگرنه روی
 * ماشینِ توسعه آدرسِ `localhost` داخلِ ایمیل می‌رفت.
 */
const LOGO = `<img src="${emailUrl("/logo.png")}" width="96" height="96" alt="سروا"
                        style="display:block; margin:0 auto; width:96px; height:96px; border:0; outline:none; text-decoration:none;">`;

/** ⚠️ هر چیزی که از بیرون می‌آید پیش از رفتن به HTML از اینجا رد می‌شود.
 *  لینکِ بازنشانی را خودمان می‌سازیم، ولی «خودمان می‌سازیم» ضمانت نیست —
 *  کافی است روزی دامنه از تنظیمات بیاید تا همین رشته به یک تزریق تبدیل
 *  شود. هزینه‌اش صفر است و نبودش یک باگِ امنیتیِ خاموش. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const fa = (n: number) => n.toLocaleString("fa-IR");

/** نوارِ «اعتبار … دقیقه». */
function expiryPill(label: string, minutes: number): string {
  return `<tr>
            <td align="center" style="padding:18px 24px 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#111c29; border-radius:20px; padding:7px 18px;">
                    <span style="font-size:12px; color:#8a97ac;">${label} &nbsp;
                      <span style="color:#2FE0DC; font-weight:700;">${fa(minutes)} دقیقه</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/** پوستهٔ مشترکِ هر دو ایمیل: نوارِ رنگی، نام، نشان، و پاورقی. */
function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#070c14; font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070c14;">
    <tr>
      <td align="center" style="padding:56px 16px;">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height:3px; line-height:3px; font-size:0; background:linear-gradient(90deg,#0a1a1c 0%, #0DBFC3 50%, #0a1a1c 100%); border-radius:3px;">&nbsp;</td>
          </tr>
        </table>

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#0c141f; border-radius:0 0 20px 20px; border:1px solid #16222f; border-top:none; overflow:hidden;">

          <tr>
            <td align="center" style="padding:40px 24px 0 24px;">
              <div style="font-size:22px; font-weight:700; color:#f3f6f9; letter-spacing:0.5px;">سروا</div>
              <div style="font-size:12px; color:#5c6b7f; margin-top:6px;">پلتفرم آموزشی ادبیات پارسی</div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:32px 24px 0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:radial-gradient(circle, rgba(13,191,195,0.16) 0%, rgba(13,191,195,0) 70%); width:150px; height:150px; border-radius:50%;">
                    <div style="padding-top:30px;">
                      ${LOGO}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${body}
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="border-top:1px solid #16222f;"></div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 24px 32px 24px;">
              <div style="font-size:11px; color:#3e4a5c;">
                © سروا — از آهنگ و وزن شعر تا دستور زبان و مفاهیم ادبی
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function verificationCodeEmail(code: string, expiresInMinutes: number): Omit<MailMessage, "to"> {
  const html = shell(
    "کد ورود سروا",
    `          <tr>
            <td align="center" style="padding:20px 32px 0 32px;">
              <div style="font-size:14px; color:#8a97ac; line-height:24px;">
                برای تکمیل ورود به حساب کاربری خود در سروا،<br>کد زیر را وارد کنید
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 24px 4px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0a141f; border:1px solid rgba(13,191,195,0.35); border-radius:14px; box-shadow:0 0 0 1px rgba(13,191,195,0.06);">
                <tr>
                  <td style="padding:20px 36px;">
                    <div style="font-size:36px; font-weight:700; letter-spacing:14px; color:#2FE0DC; direction:ltr; font-family:'Courier New', monospace; text-align:center;">
                      ${esc(code)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

${expiryPill("اعتبار کد", expiresInMinutes)}

          <tr>
            <td align="center" style="padding:26px 40px 8px 40px;">
              <div style="font-size:12px; color:#5c6b7f; line-height:21px;">
                اگر شما درخواست ورود نداده‌اید، نیازی به هیچ اقدامی نیست؛<br>
                فقط کافی است این ایمیل را نادیده بگیرید.
              </div>
            </td>
          </tr>
`,
  );

  return {
    subject: "کد ورود سروا",
    html,
    text: `کد ورود سروا: ${code}\nاعتبار: ${fa(expiresInMinutes)} دقیقه\n\nاگر شما درخواست ورود نداده‌اید، این ایمیل را نادیده بگیرید.`,
  };
}

export function passwordResetEmail(link: string, expiresInMinutes: number): Omit<MailMessage, "to"> {
  const safeLink = esc(link);
  const html = shell(
    "بازنشانی رمز عبور سروا",
    `          <tr>
            <td align="center" style="padding:24px 40px 0 40px;">
              <div style="font-size:16px; color:#f3f6f9; font-weight:700;">
                بازنشانی رمز عبور
              </div>
              <div style="font-size:14px; color:#8a97ac; line-height:24px; margin-top:10px;">
                درخواستی برای بازنشانی رمز عبور حساب کاربری شما در سروا ثبت شده است. برای تعیین رمز جدید روی دکمه زیر کلیک کنید.
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:32px 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px; background-color:#0DBFC3; box-shadow:0 0 0 1px rgba(13,191,195,0.35), 0 8px 24px rgba(13,191,195,0.15);">
                    <a href="${safeLink}" target="_blank" style="display:inline-block; padding:15px 48px; font-size:15px; font-weight:700; color:#04141a; text-decoration:none; border-radius:12px;">
                      تعیین رمز جدید
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

${expiryPill("اعتبار لینک", expiresInMinutes)}

          <tr>
            <td align="center" style="padding:24px 40px 0 40px;">
              <div style="font-size:12px; color:#5c6b7f; line-height:22px;">
                اگر دکمه بالا کار نکرد، این لینک را در مرورگر خود کپی و باز کنید:
              </div>
              <div style="font-size:12px; color:#2FE0DC; direction:ltr; word-break:break-all; margin-top:8px;">
                ${safeLink}
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:26px 40px 8px 40px;">
              <div style="font-size:12px; color:#5c6b7f; line-height:21px;">
                اگر شما درخواست بازنشانی رمز عبور نداده‌اید، نیازی به هیچ اقدامی نیست؛<br>
                رمز عبور فعلی شما همچنان معتبر و امن باقی می‌ماند.
              </div>
            </td>
          </tr>
`,
  );

  return {
    subject: "بازنشانی رمز عبور سروا",
    html,
    text: `برای بازنشانی رمز عبور سروا این لینک را باز کنید:\n${link}\n\nاعتبار: ${fa(expiresInMinutes)} دقیقه\n\nاگر شما این درخواست را نداده‌اید، رمز فعلی‌تان همچنان معتبر است.`,
  };
}
