import "server-only";
import { randomUUID } from "node:crypto";
import { execute, isUniqueViolation, queryOne } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { logger } from "@/lib/observability";
import { sendMail } from "@/lib/mail";
import {
  welcomeEmail,
  plusActivatedEmail,
  plusExpiringEmail,
  plusExpiredEmail,
  type NoticeVars,
} from "@/lib/mail/templates";
import { sendSms, sendTemplateSms } from "@/lib/sms";
import { parseTemplateId } from "@/lib/sms/smsir";
import { spendSmsBudget } from "@/lib/sms/spend";
import { jalali } from "@/lib/panel/format";
import { NOTIFY_EVENT_SPECS, smsTemplateSettingKey, type NotifyEvent } from "./events";
import { smsBody, smsParameters, type NotifyVars } from "./messages";

/**
 * =============================================================================
 * پیامِ بیرونی — پیامک و ایمیل — برای رویدادهای حساب و اشتراک
 * =============================================================================
 *
 * ⚠️ **این ماژول هرگز throw نمی‌کند.** هیچ‌کدام از این پیام‌ها لازمهٔ کارِ
 * سایت نیستند: ثبت‌نام بدونِ پیامکِ خوش‌آمد هم ثبت‌نام است، و خریدی که
 * تأیید شده حتی اگر پیامکش نرود، خرید است. اگر شکستِ ارسال بتواند یکی از
 * آن دو را برگرداند، یک سرویسِ بیرونی به مسیرِ حیاتیِ سایت وصل شده که
 * نباید. (همان قاعدهٔ `notify()` در `lib/plus/notifications.ts` — و آن‌جا
 * فقط یک INSERT بود؛ اینجا پای شبکه و یک سرویسِ ثالث در میان است.)
 *
 * ── مرزِ این ماژول با `lib/plus/notifications.ts` ──────────────────────────
 *
 * آن یکی «اعلانِ درون‌سایتی» است: ردیفی که کاربر بعداً در پنل می‌بیند. این
 * یکی پیامی است که *به سراغِ کاربر می‌رود*. هر رویدادِ مهم هر دو را دارد و
 * هیچ‌کدام جای دیگری را نمی‌گیرد:
 *
 *   • اعلانِ درون‌سایتی همیشه ثبت می‌شود — رایگان است و تاریخچه می‌سازد.
 *   • پیامِ بیرونی شرط دارد — رضایت، شمارهٔ تأییدشده، قالبِ ثبت‌شده، بودجه.
 *
 * ── چهار دروازه، به همین ترتیب ─────────────────────────────────────────────
 *
 *   ۱) کلیدِ سراسری (`notify.enabled`) — مالک همه را با هم خاموش می‌کند.
 *   ۲) `dedupe_key` — رزروِ **پیش از ارسال**. (پایین‌تر، مفصل.)
 *   ۳) رضایتِ کاربر، جدا برای هر کانال.
 *   ۴) وجودِ راهِ تماس و — برای پیامک — وجودِ قالبِ تأییدشده.
 *
 * هر ردِ شدن با دلیلش در `outbound_notifications` می‌نشیند. «نرفت چون
 * کاربر خاموشش کرده» و «نرفت چون سرویس خطا داد» دو چیزِ متفاوت‌اند و اگر
 * یک‌شکل ثبت می‌شدند، یک خرابیِ واقعی زیرِ نویزِ رضایت گم می‌شد.
 */

/** وضعیتِ یک کانال در یک ارسال. */
export type ChannelStatus = "sent" | "failed" | "skipped";

export type NotifyResult = {
  sms: { status: ChannelStatus; reason: string | null };
  email: { status: ChannelStatus; reason: string | null };
  /** `true` یعنی این پیام قبلاً برای همین کاربر رفته و چیزی فرستاده نشد. */
  duplicate: boolean;
};

export type NotifyUserParams = {
  userId: string;
  event: NotifyEvent;
  /** تاریخِ پایانِ اشتراک (ISO) — برای رویدادهای اشتراک. */
  endsAt?: string | null;
  /** چند روز تا پایان — برای `plus_expiring`. */
  daysLeft?: number;
  /**
   * کلیدِ یکتاسازی.
   *
   * ⚠️ برای هر پیامی که از یک **کارِ زمان‌بندی‌شده** می‌آید اجباری است.
   * `null` فقط برای پیامی درست است که خودش یک بار در عمر رخ می‌دهد و
   * فراخوانش هم یک بار اجرا می‌شود (ثبت‌نام).
   *
   * قالبِ پیشنهادی: `<event>:<شناسهٔ چیزی که پیام درباره‌اش است>` —
   * مثلاً `plus_expiring:<entitlementId>`.
   */
  dedupeKey?: string | null;
};

/** ستون‌هایی که برای تصمیم‌گیری لازم‌اند و نه بیشتر. */
type RecipientRow = {
  first_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  notify_sms: number;
  notify_email: number;
  is_banned: number;
};

function isOn(value: string | null): boolean {
  if (value === null) return true; // پیش‌فرضِ `notify.enabled` روشن است.
  const v = value.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

/**
 * نامی که در پیام می‌آید.
 *
 * ⚠️ فقط نامِ کوچک، و اگر نبود «کاربر». نامِ کاملِ سه‌کلمه‌ای در یک پیامکِ
 * ۷۰ نویسه‌ای جا نمی‌شود، و «سلام ،» — که خروجیِ یک نامِ خالی است — بدتر از
 * نداشتنِ نام است.
 */
function displayName(row: RecipientRow): string {
  const first = row.first_name?.trim();
  if (first) return first;
  const full = row.full_name?.trim().split(/\s+/)[0];
  return full || "کاربر";
}

/* ───────────────────────────── ایمیلِ هر رویداد ────────────────────────── */

function emailFor(event: NotifyEvent, vars: NoticeVars) {
  switch (event) {
    case "welcome":
      return welcomeEmail(vars);
    case "plus_activated":
      return plusActivatedEmail(vars, false);
    case "plus_renewed":
      return plusActivatedEmail(vars, true);
    case "plus_expiring":
      return plusExpiringEmail(vars);
    case "plus_expired":
      return plusExpiredEmail();
  }
}

/* ────────────────────────────── ارسالِ پیامک ───────────────────────────── */

async function deliverSms(
  event: NotifyEvent,
  to: string,
  vars: NotifyVars,
): Promise<{ status: ChannelStatus; reason: string | null }> {
  const templateId = await getSetting(smsTemplateSettingKey(event));
  const parameters = smsParameters(event, vars);

  if (templateId?.trim()) {
    let id: number;
    try {
      id = parseTemplateId(templateId);
    } catch (err) {
      return { status: "skipped", reason: `no_template: ${(err as Error).message}` };
    }

    /* ⚠️ سقفِ سراسری، از **همان** کیسه‌ای که کدِ ورود خرج می‌کند.
       چراییِ اشتراکی بودنش در `lib/sms/spend.ts` است، ولی نکتهٔ مخصوصِ
       اینجا این است: یادآوریِ پایانِ اشتراک تا ۵۰۰ نفر را در یک اجرا صدا
       می‌زند. بدونِ این خط، یک زمان‌بندیِ اشتباه می‌توانست کلِ اعتبارِ
       پیامکِ ماه را در چند دقیقه خرج کند — و بدتر، کدهای ورودِ فردا را
       بی‌اعتبار بگذارد.

       ⚠️ و درست پیش از ارسال، نه بالای تابع: ردی که به‌خاطر نبودِ قالب یا
       رضایت برمی‌گردد، نباید از سهمیه کم کند. */
    const budget = await spendSmsBudget();
    if (!budget.allowed) return { status: "failed", reason: "sms_budget_exhausted" };

    const spec = NOTIFY_EVENT_SPECS[event];
    await sendTemplateSms({
      to,
      templateId: id,
      /* ⚠️ ترتیب و نام از `spec.smsVariables` می‌آید و نه از کلیدهای شیء.
         یعنی اگر روزی متغیری به قالب اضافه شود ولی `smsParameters` آن را
         نسازد، اینجا رشتهٔ خالی می‌رود — که در پیامک دیده می‌شود — به‌جای
         اینکه بی‌سروصدا حذف شود. */
      parameters: spec.smsVariables.map((name) => ({ name, value: parameters[name] ?? "" })),
    });
    return { status: "sent", reason: null };
  }

  /* ⚠️ متنِ آزاد فقط وقتی، که مدیر «شمارهٔ خط» را ثبت کرده باشد — یعنی
     صریحاً همین را خواسته باشد. بدونِ خط، `sendSms` خودش خطا می‌دهد؛ ما
     پیش از آن جلویش را می‌گیریم تا یک ردیفِ `failed` با پیامِ مبهم ساخته
     نشود. تفاوتش مهم است: این «پیکربندی ناقص» است و نه «ارسال شکست خورد». */
  const line = await getSetting("sms.sender");
  if (!line?.trim()) {
    return { status: "skipped", reason: "no_template" };
  }

  const budget = await spendSmsBudget();
  if (!budget.allowed) return { status: "failed", reason: "sms_budget_exhausted" };

  await sendSms({ to, body: smsBody(event, vars) });
  return { status: "sent", reason: null };
}

/* ──────────────────────────────── ورودیِ اصلی ──────────────────────────── */

/**
 * پیامِ رویداد را برای کاربر می‌فرستد — پیامک و ایمیل، هرکدام که ممکن باشد.
 *
 * هرگز throw نمی‌کند. خروجی برای لاگ و تست است؛ فراخوان لازم نیست به آن
 * نگاه کند و در مسیرِ خرید و ثبت‌نام هم نگاه نمی‌کند.
 */
export async function notifyUser(params: NotifyUserParams): Promise<NotifyResult> {
  const skipped = (reason: string): NotifyResult => ({
    sms: { status: "skipped", reason },
    email: { status: "skipped", reason },
    duplicate: reason === "duplicate",
  });

  try {
    if (!isOn(await getSetting("notify.enabled"))) return skipped("disabled");

    const row = await queryOne<RecipientRow>(
      `select first_name, full_name, email,
              phone, phone_verified_at, notify_sms, notify_email, is_banned
         from users
        where id = ?`,
      [params.userId],
    );
    if (!row) return skipped("no_contact");

    /* ⚠️ کاربرِ مسدود پیام نمی‌گیرد. اشتراکش ممکن است هنوز معتبر باشد و
       یادآوریِ تمدید برایش ساخته شود — ولی فرستادنِ «تمدید کن» به کسی که
       نمی‌تواند وارد شود، دعوت به پرداختی است که به کار نمی‌آید. */
    if (row.is_banned) return skipped("opted_out");

    /* ── دروازهٔ ۲: رزروِ کلید، **پیش** از هر ارسالی ──────────────────────
     *
     * ⚠️ ترتیب حیاتی است و برعکسش یک باگِ گران است.
     *
     * اگر اول می‌فرستادیم و بعد ثبت می‌کردیم، دو اجرای هم‌زمانِ کارِ
     * یادآوری (دو تیکِ کرون، یا یک اجرای دستی روی اجرای خودکار) هر دو
     * ردیفِ «قبلاً رفته» را نمی‌دیدند و هر دو پیامک می‌فرستادند. برخلافِ
     * اعلانِ درون‌سایتی، این یکی هم پول دارد و هم برگشت‌ناپذیر است.
     *
     * پس ردیف با وضعیتِ `pending` نوشته می‌شود و بعد از ارسال به‌روز
     * می‌شود. بهایش یک حالتِ تازه است: ردیفی که روی `pending` مانده یعنی
     * فرایند وسطِ کار مرده. آن ردیف **بازپخش نمی‌شود** — و این عمدی است:
     * «شاید نرفته باشد» دلیلِ کافی برای فرستادنِ دوباره نیست. */
    const rowId = randomUUID();
    if (params.dedupeKey) {
      try {
        /* ستونِ `event` backtick نمی‌خواهد: در MySQL و MariaDB یک کلمهٔ
           کلیدیِ **غیرمحفوظ** است. (برخلافِ `key` در `app_settings` که
           محفوظ است و بدونِ backtick خطایِ نحوی می‌دهد.) */
        await execute(
          `insert into outbound_notifications (id, user_id, event, dedupe_key)
           values (?, ?, ?, ?)`,
          [rowId, params.userId, params.event, params.dedupeKey],
        );
      } catch (err) {
        if (isUniqueViolation(err)) return skipped("duplicate");
        throw err;
      }
    } else {
      await execute(
        `insert into outbound_notifications (id, user_id, event) values (?, ?, ?)`,
        [rowId, params.userId, params.event],
      );
    }

    const vars: NotifyVars = {
      name: displayName(row),
      endsAt: params.endsAt ?? null,
      daysLeft: params.daysLeft,
    };

    /* ── پیامک ──────────────────────────────────────────────────────────
     *
     * ⚠️ شمارهٔ **تأییدنشده** پیامک نمی‌گیرد. شماره‌ای که تأیید نشده،
     * شماره‌ای است که کاربر فقط *ادعا* کرده مالِ اوست؛ فرستادنِ «اشتراکت
     * فعال شد» به آن یعنی فرستادن به یک غریبه. (کدِ ورود استثناست و باید
     * باشد — کارش دقیقاً همین تأیید کردن است.) */
    let sms: { status: ChannelStatus; reason: string | null };
    if (!row.notify_sms) {
      sms = { status: "skipped", reason: "opted_out" };
    } else if (!row.phone || !row.phone_verified_at) {
      sms = { status: "skipped", reason: "no_contact" };
    } else {
      try {
        sms = await deliverSms(params.event, row.phone, vars);
      } catch (err) {
        sms = { status: "failed", reason: (err as Error).message.slice(0, 300) };
      }
    }

    /* ── ایمیل ──────────────────────────────────────────────────────────
     *
     * ⚠️ برخلافِ پیامک، ایمیلِ **تأییدنشده** هم پیام می‌گیرد — و این عمدی
     * است: خودِ ایمیلِ تأیید هم به همان‌جا می‌رود. کاربری که با ایمیل
     * ثبت‌نام کرده و هنوز تأییدش نکرده، باید پیامِ خوش‌آمد و رسیدِ خریدش
     * را بگیرد؛ گره زدنِ این‌ها به تأیید یعنی خریدی که هیچ رسیدی ندارد. */
    let email: { status: ChannelStatus; reason: string | null };
    if (!row.notify_email) {
      email = { status: "skipped", reason: "opted_out" };
    } else if (!row.email) {
      email = { status: "skipped", reason: "no_contact" };
    } else {
      try {
        await sendMail({
          to: row.email,
          ...emailFor(params.event, {
            name: vars.name,
            endsLabel: params.endsAt ? jalali(params.endsAt) : undefined,
            daysLeft: params.daysLeft,
          }),
        });
        email = { status: "sent", reason: null };
      } catch (err) {
        email = { status: "failed", reason: (err as Error).message.slice(0, 300) };
      }
    }

    await execute(
      `update outbound_notifications
          set sms_status = ?, sms_reason = ?, email_status = ?, email_reason = ?
        where id = ?`,
      [sms.status, sms.reason, email.status, email.reason, rowId],
    ).catch(() => {});

    logger.info("پیام رویداد پردازش شد", {
      event: "notify.dispatched",
      notify_event: params.event,
      user_id: params.userId,
      sms_status: sms.status,
      email_status: email.status,
    });

    return { sms, email, duplicate: false };
  } catch (err) {
    /* ⚠️ اینجا آخرِ خط است و هیچ‌چیزی از اینجا بیرون نمی‌رود. تنها چیزهایی
       که به اینجا می‌رسند خرابیِ دیتابیس‌اند (ارسال‌ها خودشان بالاتر
       گرفته شده‌اند) — یعنی یا مهاجرت اجرا نشده یا دیتابیس در دسترس نیست.
       هر دو باید در لاگ **پیدا** شوند. */
    logger.error("ارسال پیام رویداد ناموفق بود", {
      event: "notify.failed",
      err,
      notify_event: params.event,
      user_id: params.userId,
    });
    return skipped("failed");
  }
}
