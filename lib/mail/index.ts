import "server-only";
import { requireSetting } from "@/lib/settings";
import { logger } from "@/lib/observability";

/**
 * ارسال ایمیل، پشت یک واسط.
 *
 * دو پیاده‌سازی دارد و انتخابشان با MAIL_DRIVER است:
 *
 *   • resend — همان چیزی که تا امروز استفاده می‌شد.
 *   • smtp   — هر سرور ایمیلی. این گزینه وجود دارد چون Resend از داخل ایران
 *     در دسترس نیست و مقصد نهاییِ این پروژه یک سرور ایران است. بدون آن،
 *     مهاجرت به سرور یعنی از کار افتادن تأیید ایمیل.
 *
 * آدرس فرستنده از lib/settings می‌آید (دیتابیس → env)، نه از این فایل.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface MailAdapter {
  readonly name: string;
  send(message: MailMessage & { from: string }): Promise<void>;
}

// ---------------------------------------------------------------- Resend --

class ResendAdapter implements MailAdapter {
  readonly name = "resend";

  async send(message: MailMessage & { from: string }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY تنظیم نشده است.");

    // با fetch خام و نه SDK: یک وابستگی کمتر، و پاسخ خطا را خودمان می‌بینیم.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend پاسخ ${response.status} داد: ${detail.slice(0, 300)}`);
    }
  }
}

// ------------------------------------------------------------------ SMTP --

class SmtpAdapter implements MailAdapter {
  readonly name = "smtp";

  async send(message: MailMessage & { from: string }): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) throw new Error("SMTP_HOST تنظیم نشده است.");

    // import پویا تا nodemailer فقط وقتی واقعاً از SMTP استفاده می‌شود بار
    // شود — روی نصبی که Resend دارد، این ماژول اصلاً لمس نمی‌شود.
    const nodemailer = (await import("nodemailer")).default;

    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      // secure یعنی TLS از همان ابتدا (پورت ۴۶۵). روی ۵۸۷ باید false باشد و
      // ارتقا با STARTTLS انجام می‌شود — که nodemailer خودکار انجامش می‌دهد.
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
        : undefined,
    });

    await transport.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

// --------------------------------------------------------------- انتخاب --

let cached: MailAdapter | null = null;

export function mailAdapter(): MailAdapter {
  if (cached) return cached;

  const driver = (process.env.MAIL_DRIVER ?? "smtp").toLowerCase();
  cached = driver === "resend" ? new ResendAdapter() : new SmtpAdapter();

  if (driver !== "resend" && driver !== "smtp") {
    logger.warn("MAIL_DRIVER ناشناخته بود؛ از smtp استفاده شد", {
      event: "mail.driver.unknown",
      mail_driver: driver,
    });
  }

  return cached;
}

/**
 * ارسال، با آدرس فرستنده‌ای که از تنظیمات می‌آید.
 *
 * ⚠️ چه چیزی لاگ می‌شود و چه چیزی نه:
 *
 *   • **می‌شود**: سرویس، مدت، موفق/ناموفق، و طولِ موضوع. با همین‌ها می‌شود
 *     فهمید «ایمیل‌ها امروز کند شده‌اند» یا «از دیروز هیچ ایمیلی نرفته».
 *
 *   • **نمی‌شود**: آدرس گیرنده، موضوع، متن. یک ایمیلِ تأیید یا بازنشانی رمز
 *     لینکِ توکن‌دار داخلش دارد؛ لاگ کردن متن یعنی گذاشتن آن توکن در
 *     `docker compose logs`.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const from = await requireSetting("mail.from");
  const adapter = mailAdapter();
  const startedAt = performance.now();

  try {
    await adapter.send({ ...message, from });
    logger.info("ایمیل ارسال شد", {
      event: "mail.send.succeeded",
      mail_driver: adapter.name,
      duration_ms: Math.round(performance.now() - startedAt),
    });
  } catch (err) {
    logger.error("ارسال ایمیل ناموفق بود", {
      event: "mail.send.failed",
      err,
      mail_driver: adapter.name,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    throw err;
  }
}
