import "server-only";
import type { MailMessage } from "./index";

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

/** نشانِ سروا. یک بار تعریف می‌شود چون هر دو ایمیل همان را می‌خواهند. */
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="318.87 491.18 376.80 449.82" width="84" height="100" style="display:block; margin:0 auto;">
                        <g>
                          <path fill="#0DBFC3" d="M461.93 743.5c-1.79-12.95-.46-28.89 1.09-41.5 3.25 1.33 6.49 14.35 10.12 13.03-4.66-20.32-3.77-49.13 1.41-68.25 1.15.99 5.56 12.34 6.46 10.87-.6-16.07 1.51-34.52 5.05-48.15h.81l3.93 8.75c3.03-23.38 6.44-46.35 14.72-64.25H507v.36c6.75 18.22 12.39 39.28 13.25 62.89 2.94.91 2.6-7.17 5.66-7.3 3.81 13.58 4.43 31.01 5.22 47.55l.62-.02 4.69-10.48h.95c4.47 19.45 5.63 46.84 1.61 68 4.79-2.46 5.86-10.52 9.83-13 2.73 20.26 2.05 45.4-2.75 62.5-3.71.49-5.02-2.42-7.58-3.2v-.24c5.5-11.96-.34-7.81-7.25-7.15-18.3 3.52-35.47 2.97-47.39-3.16-9.96-12.37-12-13.7-6.46 5.5-6.96 2.2-4.71-15.02-15.47-12.75Z"></path>
                          <path fill="#0DBFC3" d="M324.38 629.46c52.65-192.58 342.2-183.57 371 24.29l.14 171.84-1.27-.42c-.23-36.71-.16-78.72-.5-115.12-3.51-3.75-3.63-4.86-10.5-3.8-.5.5.32 4.45-1.75 3.86v-47.94c-4.88-93.71-94.65-172.18-203.25-154.22-68.19 11.29-122.72 60.15-139.78 123.55-1.54.61-1.58-2.32-1.89-2.36-4.41-1.51-7.59 1.5-12.2.32Z"></path>
                          <path fill="#00ABB5" d="M338.47 631.5c-1.95 7.58-3.15 16.41-4.67 24.75l-.55 221.17c-.6.68-14.14 2.89-14.23.33l-.01-212.5c1.12-12.28 2.78-25.34 5.37-35.79 4.61 1.18 7.79-1.83 12.2-.32.31.04.35 2.97 1.89 2.36Zm357.05 194.09c-.46 16.97.82 37.18-.65 53.47 0 0-13.53-.38-13.37-1.6V710.11c2.07.59 1.25-3.36 1.75-3.86 6.87-1.06 6.99.05 10.5 3.8.34 36.4.27 78.41.5 115.12l1.27.42ZM546.08 764.5c-.85 4.05-3.24 9.36-2.7 13.25 1.55-.64 9.03-12.76 11.62-13.75-.95 38.85-8.94 71.54-41 78.97v40.45c-.63 3.22-5.55 6.51-7.19 9.1-.55.16-7.24-7.49-8.31-8.5l-.01-40.77c-31.72-7.79-41.54-38.93-41.49-78.75h.94c1.68.56 8.34 13.82 11.25 12.48-3.52-9.73-5.99-21.46-7.26-33.48 10.76-2.27 8.51 14.95 15.47 12.75-5.54-19.2-3.5-17.87 6.46-5.5 11.92 6.13 29.09 6.68 47.39 3.16 6.91-.66 12.75-4.81 7.25 7.15v.24c2.56.78 3.87 3.69 7.58 3.2Z"></path>
                          <path fill="#00ABB5" d="m693.84 892.82-.35 8.28h-48.24c-58.52.3-103.67 14.92-137.74 39.9h-1.89c-32.26-24.49-75.97-38.16-130.87-39.97L320.2 901c-1.78-.72-1.78-7.28 0-8 .57-.23 6.9.05 7.55-.02 71.05-7.61 139.55 3.05 178.5 34.27.61.06 4.07-2.75 5-3.37 40.85-24.52 76.35-34.47 143-32.84 12.77.31 27.25 1.9 39.59 1.78Z"></path>
                          <path fill="#0DBFC3" d="m693.49 901.1.35-8.28c2.56-.18 2.41 9.01-.35 8.28Z"></path>
                          <path fill="#00ABB5" d="M657 855.12v13.84l-2.02 1.08c-62.13-5.76-109.93 12.99-141.84 40.46h-.75c23.78-41.69 76.29-63.7 144.61-55.38ZM499.5 909.5c-1.02 1.02-4.38-3.31-4.75-3.59-31.5-23.65-67.34-37.88-123.5-36.89-2.13.04-13.07 1.51-13.75.37v-14.87c67.98-6.4 118.69 13.17 142 54.98Z"></path>
                        </g>
                      </svg>`;

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
