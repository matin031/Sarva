import "server-only";
import type { MailMessage } from "./index";

/** قالب‌های ایمیل.
 *
 *  طرحِ ایمیل کد تأیید عیناً همان چیزی است که در app/api/send-otp/route.ts بود —
 *  فقط از داخل route بیرون کشیده شده تا قالب و منطق قاطی نباشند و ایمیل دوم
 *  (بازنشانی رمز) بتواند همان ظاهر را داشته باشد. */

function shell(title: string, intro: string, body: string, footer: string): string {
  return `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;direction:rtl;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
          <p style="font-size:22px;font-weight:700;color:#fff;margin:0;">سروا</p>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="font-size:18px;color:#e2e8f0;margin-bottom:8px;">${title}</h2>
          <p style="font-size:14px;color:#94a3b8;margin-bottom:24px;">${intro}</p>
          ${body}
          <p style="font-size:12px;color:#475569;text-align:center;">${footer}</p>
        </div>
      </div>
    `;
}

export function verificationCodeEmail(code: string, expiresInMinutes: number): Omit<MailMessage, "to"> {
  const html = shell(
    "کد تأیید ایمیل",
    "کد زیر را برای تأیید ایمیل خود وارد کنید:",
    `<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
       <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#a78bfa;font-family:monospace;">${code}</span>
     </div>`,
    `⏱ اعتبار: ${expiresInMinutes} دقیقه`,
  );

  return {
    subject: "کد تأیید سروا",
    html,
    text: `کد تأیید سروا: ${code}\nاعتبار: ${expiresInMinutes} دقیقه`,
  };
}

export function passwordResetEmail(link: string, expiresInMinutes: number): Omit<MailMessage, "to"> {
  const html = shell(
    "بازنشانی رمز عبور",
    "برای انتخاب رمز تازه روی دکمهٔ زیر بزنید. اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.",
    `<div style="text-align:center;margin-bottom:24px;">
       <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">انتخاب رمز تازه</a>
     </div>
     <p style="font-size:11px;color:#475569;word-break:break-all;text-align:center;direction:ltr;">${link}</p>`,
    `⏱ این لینک ${expiresInMinutes} دقیقه معتبر است و فقط یک بار کار می‌کند.`,
  );

  return {
    subject: "بازنشانی رمز عبور سروا",
    html,
    text: `برای بازنشانی رمز عبور سروا این لینک را باز کنید:\n${link}\n\nاعتبار: ${expiresInMinutes} دقیقه`,
  };
}
