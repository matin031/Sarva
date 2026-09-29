import "server-only";
import { after } from "next/server";
import { query } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendMail } from "@/lib/mail";
import { adminAlertEmail } from "@/lib/mail/templates";
import { logger } from "@/lib/observability";
import { clock, jalali } from "@/lib/panel/format";
import {
  ADMIN_ALERT_SPECS,
  HourlyThrottle,
  adminAlertSettingKey,
  alertSettingOn,
  parseAlertRecipients,
  MAX_ALERT_RECIPIENTS,
  type AdminAlertEvent,
} from "./admin-alert-events";

/**
 * =============================================================================
 * ایمیلِ خبر برای مدیرِ سایت
 * =============================================================================
 *
 * ⚠️ **این ماژول هرگز throw نمی‌کند و هرگز منتظر نمی‌ماند.** همان قاعدهٔ
 * `./index.ts`، یک قدم سخت‌تر: آنجا دستِ‌کم پیامِ خودِ کاربر در مسیرِ
 * درخواست است؛ اینجا خبری است که فقط مدیر می‌خواهد. ثبت‌نامِ یک دانش‌آموز
 * نباید حتی یک میلی‌ثانیه پشتِ سرورِ SMTPِ مدیر منتظر بماند.
 *
 * پس ارسال با `after()` بعد از فرستادنِ پاسخ انجام می‌شود. بیرون از یک
 * درخواست (اسکریپت، کرون) `after` در دسترس نیست و همان کار بدونِ انتظار
 * شروع می‌شود.
 *
 * ── گیرنده‌ها ───────────────────────────────────────────────────────────────
 *
 *   • اگر `alerts.recipients` پر باشد، همان نشانی‌ها.
 *   • اگر خالی باشد، ایمیلِ **همهٔ مدیرانِ** سایت. یعنی بدونِ هیچ تنظیمی،
 *     کسی که مدیر است خبرها را می‌گیرد — همان چیزی که مالکِ سایت خواسته.
 *
 * ── سه دروازه ──────────────────────────────────────────────────────────────
 *
 *   ۱) کلیدِ سراسریِ `alerts.enabled`.
 *   ۲) کلیدِ همان رویداد (`alerts.signup`، …).
 *   ۳) سقفِ ساعتی — چرایی‌اش کنارِ `hourlyCap`.
 */

const throttle = new HourlyThrottle();

export type AdminAlert = {
  event: AdminAlertEvent;
  /** تیترِ ایمیل — «کاربرِ تازه: سارا احمدی». */
  heading: string;
  rows: { label: string; value: string | null | undefined }[];
  /** مسیرِ نسبی در پنل. */
  href?: string;
};

/** گیرنده‌ها — از تنظیمات، وگرنه همهٔ مدیران. */
async function recipients(): Promise<string[]> {
  const configured = parseAlertRecipients(await getSetting("alerts.recipients")).valid;
  if (configured.length) return configured.slice(0, MAX_ALERT_RECIPIENTS);

  const admins = await query<{ email: string }>(
    `select email from users
      where role = 'admin' and email is not null and not is_banned
      order by created_at
      limit ?`,
    [MAX_ALERT_RECIPIENTS],
  );
  return admins.map((a) => a.email);
}

/** آیا این رویداد الان ایمیل می‌شود؟ (بدونِ مصرفِ سقف) */
async function enabled(event: AdminAlertEvent): Promise<boolean> {
  if (!alertSettingOn(await getSetting("alerts.enabled"), true)) return false;
  return alertSettingOn(await getSetting(adminAlertSettingKey(event)), true);
}

/**
 * ارسالِ واقعی. برای «ایمیلِ آزمایشی» پنل هم از همین‌جا می‌رود، تا آزمون
 * همان مسیری را بسنجد که خبرهای واقعی از آن می‌روند.
 *
 * @returns شمارِ گیرنده‌هایی که ایمیل برایشان رفت.
 */
export async function deliverAdminAlert(alert: AdminAlert, opts: { force?: boolean } = {}): Promise<number> {
  if (!opts.force) {
    if (!(await enabled(alert.event))) return 0;
    if (!throttle.take(alert.event, ADMIN_ALERT_SPECS[alert.event].hourlyCap)) {
      logger.warn("سقفِ ساعتیِ ایمیلِ مدیر پر شد", {
        event: "admin_alert.throttled",
        alert_event: alert.event,
      });
      return 0;
    }
  }

  const to = await recipients();
  if (!to.length) return 0;

  const now = new Date().toISOString();
  const message = adminAlertEmail({
    eventLabel: ADMIN_ALERT_SPECS[alert.event].label,
    heading: alert.heading,
    rows: [
      ...alert.rows.map((r) => ({ label: r.label, value: r.value ?? "" })),
      // زمانِ تهران، نه زمانِ سرور — مدیر «کِی» را به ساعتِ خودش می‌خواند.
      { label: "زمان", value: `${jalali(now)} · ساعت ${clock(now)}` },
    ],
    href: alert.href,
  });

  /* ⚠️ یک ایمیل برای هر گیرنده و نه یک ایمیل با ده گیرنده: نشانیِ هر مدیر
     نباید در سربرگِ ایمیلِ مدیرِ دیگر دیده شود، و شکستِ یک صندوق نباید بقیه
     را هم بیندازد. */
  let sent = 0;
  for (const address of to) {
    try {
      await sendMail({ to: address, ...message });
      sent++;
    } catch {
      /* `sendMail` خودش شکست را لاگ کرده؛ گیرندهٔ بعدی. */
    }
  }

  logger.info("ایمیلِ خبرِ مدیر پردازش شد", {
    event: "admin_alert.dispatched",
    alert_event: alert.event,
    recipients: to.length,
    sent,
  });
  return sent;
}

/**
 * خبر برای مدیر — بعد از پاسخ، بی‌صدا در شکست.
 *
 * فراخوان‌ها `await` نمی‌کنند و لازم هم نیست؛ خروجی `void` است تا کسی
 * وسوسه نشود.
 */
export function alertAdmins(
  event: AdminAlertEvent,
  /** یا خودِ خبر، یا تابعی که آن را می‌سازد — تا کوئریِ جزئیات هم بعد از
   *  پاسخ زده شود و نه در مسیرِ درخواست. `null` یعنی «چیزی برای گفتن نیست». */
  build: AdminAlert | (() => Promise<AdminAlert | null>),
): void {
  const run = async () => {
    try {
      const alert = typeof build === "function" ? await build() : build;
      if (alert) await deliverAdminAlert(alert);
    } catch (err) {
      logger.error("ایمیلِ خبرِ مدیر ناموفق بود", {
        event: "admin_alert.failed",
        err,
        alert_event: event,
      });
    }
  };

  try {
    after(run);
  } catch {
    // بیرون از یک درخواست — اسکریپت یا کرون.
    void run();
  }
}
