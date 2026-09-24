/**
 * نوع‌های سروا پلاس — مشترکِ سرور و کلاینت.
 *
 * عمداً بدون "server-only": کامپوننت‌های کلاینت (نشانِ هدر، صفحهٔ اشتراک،
 * جدولِ خریدها) باید بتوانند همین شکل‌ها را تایپ کنند. هیچ‌چیز محرمانه‌ای
 * اینجا نیست — نه کلیدِ درگاه، نه شناسهٔ داخلیِ پرداخت.
 */

import type { Currency } from "./money";

/* ─────────────────────────── وضعیت دسترسی ─────────────────────────────── */

/**
 * وضعیتِ حسابِ کاربر از دیدِ پلاس.
 *
 * ⚠️ چهار حالتِ اول را هرگز با هم قاطی نکنید — به‌خصوص `unavailable`:
 *
 *   • `off`         — کلِ سروا پلاس از پنل مدیریت خاموش است. سایت رایگان
 *                     است، هیچ‌چیز قفل نیست، هیچ صفحهٔ خریدی وجود ندارد.
 *   • `free`        — پلاس روشن است و این کاربر اشتراک ندارد.
 *   • `active`      — اشتراکِ معتبر دارد.
 *   • `expired`     — داشت و تمام شد. (سابقه‌اش دست‌نخورده می‌ماند.)
 *   • `revoked`     — مدیر دسترسی را لغو کرده.
 *   • `unavailable` — **نمی‌دانیم.** دیتابیس در دسترس نبود یا کوئری شکست
 *                     خورد.
 *
 * ⚠️ `unavailable` هرگز نباید به «اشتراک نداری، بخر» ترجمه شود. آن پیام به
 * کاربری که همین دیروز پول داده، می‌گوید پولش را دور ریخته — و بدتر، ممکن
 * است دوباره بخرد. رابط کاربری در این حالت باید بگوید «در بررسی وضعیت
 * اشتراک مشکلی پیش آمد» و دکمهٔ «تلاش دوباره» بدهد.
 *
 * برای *دسترسی* اما fail-closed هستیم: `unavailable` قابلیتِ پولی را باز
 * نمی‌کند. یعنی «نمی‌دانم» نه در را باز می‌کند و نه کاربر را متهم می‌کند.
 */
export type PlusState = "off" | "free" | "active" | "expired" | "revoked" | "unavailable";

/**
 * از کجا دسترسی آمده — برای اینکه هدیهٔ مدیر «پرداخت موفق» جا زده نشود.
 *
 * ⚠️ `teacher_verified` از مهاجرت ۰۰۹ اضافه شد و عمداً یک مقدارِ سوم است و
 * نه یک `manual_grant` با `reason` خاص. دلیلش را `isTrial` پایین نشان
 * می‌دهد: اگر همان `manual_grant` بود، صفحهٔ اشتراکِ هر دبیرِ تأییدشده
 * می‌نوشت «دسترسی آزمایشی» — برای چیزی که نه آزمایشی است و نه تمام می‌شود.
 *
 * برچسبِ فارسیِ هر کدام در `PLUS_SOURCE_LABEL` است.
 */
export type PlusSource = "purchase" | "manual_grant" | "teacher_verified";

export type PlusStatus = {
  state: PlusState;
  /** فقط `state === "active"` را باور کنید؛ این میان‌بُرِ خوانایی است. */
  isActive: boolean;
  /** رشتهٔ ISO. برای دسترسیِ دائمی null است. */
  expiresAt: string | null;
  startsAt: string | null;
  /** null یعنی دائمی؛ در غیر این صورت روزهای کاملِ باقی‌مانده. */
  daysRemaining: number | null;
  /** «نزدیک پایان» — آستانه‌اش از تنظیمات می‌آید و در UI هاردکد نیست. */
  expiringSoon: boolean;
  source: PlusSource | null;
  /**
   * فقط `manual_grant` — یعنی هدیهٔ دستیِ مدیر.
   *
   * ⚠️ «خریداری‌نشده» نیست. اشتراکِ دبیرِ تأییدشده هم خریداری نشده ولی
   * آزمایشی هم نیست. برای نمایشِ منبع از `PLUS_SOURCE_LABEL[source]`
   * استفاده کنید و نه از این بولی؛ این یکی فقط همان یک حالت را می‌گوید.
   */
  isTrial: boolean;
};

/** خلاصهٔ کوچکی که در هر بار بارگذاری صفحه همراهِ کاربر می‌رود.
 *
 *  عمداً کوچک است: هدر نباید برای کشیدنِ یک نشان، سه جدول را join کند. */
export type PlusSummary = {
  state: PlusState;
  expiresAt: string | null;
  expiringSoon: boolean;
  isTrial: boolean;
  /** تعداد اعلان‌های خوانده‌نشده — نقطهٔ کوچکِ کنارِ منوی پنل. */
  unreadNotifications: number;
  /** تیکت‌هایی که پشتیبانی پاسخ داده و کاربر هنوز ندیده. */
  unreadTickets: number;
};

/* ─────────────────────────────── محصول ─────────────────────────────────── */

export type PlusPlanOffer = {
  planId: string;
  code: string;
  title: string;
  subtitle: string | null;
  durationDays: number;
  planVersionId: string;
  version: number;
  amountRials: number;
  currency: Currency;
  /** برای نمایشِ «معادلِ ماهانه» روی پلن‌های بلندتر. محاسبه سمت سرور. */
  monthlyEquivalentRials: number | null;
  /** درصدِ صرفه‌جویی نسبت به ارزان‌ترین پلن بر حسب روز — یا null. */
  savingPercent: number | null;
  /**
   * قیمتِ پیش از تخفیف (ریال) — یا null وقتی تخفیفی در کار نیست.
   *
   * ⚠️ این عدد را مدیر ثبت می‌کند و باید قیمتِ *واقعیِ* قبلی باشد. دیتابیس
   * فقط تضمین می‌کند از قیمتِ فعلی بزرگ‌تر است؛ واقعی بودنش با مدیر است.
   */
  compareAtRials: number | null;
  /** درصدِ تخفیف نسبت به `compareAtRials`. از همان دو عدد حساب می‌شود. */
  discountPercent: number | null;
};

/* ─────────────────────────────── سفارش ─────────────────────────────────── */

export type OrderStatus = "pending" | "paid" | "cancelled" | "expired" | "refunded";

export type PaymentState =
  | "created"
  | "redirected"
  | "pending"
  | "verified"
  | "failed"
  | "cancelled"
  | "unknown";

export type PlusOrderSummary = {
  id: string;
  orderNumber: string;
  planTitle: string;
  durationDays: number;
  amountRials: number;
  currency: Currency;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  /** وضعیتِ تازه‌ترین تلاشِ پرداخت — برای تشخیص «در حال بررسی» از «ناموفق». */
  latestPaymentState: PaymentState | null;
};

export type PlusOrderDetail = PlusOrderSummary & {
  planCode: string;
  planVersion: number;
  trackingId: string | null;
  /** بازهٔ دسترسی‌ای که این سفارش ساخته — فقط برای سفارشِ پرداخت‌شده. */
  accessFrom: string | null;
  accessTo: string | null;
  /** دورهٔ این سفارش به انتهای اشتراکِ قبلی اضافه شده (تمدید). */
  isRenewal: boolean;
  attempts: {
    id: string;
    provider: string;
    state: PaymentState;
    trackingId: string | null;
    errorMessage: string | null;
    createdAt: string;
  }[];
};

/* ────────────────────────────── پشتیبانی ───────────────────────────────── */

export type TicketCategory =
  | "payment"
  | "plus"
  | "account"
  | "technical"
  | "content"
  | "other";

export type TicketStatus =
  | "open"
  | "waiting_for_support"
  | "waiting_for_user"
  | "resolved"
  | "closed";

export type TicketSummary = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  lastActivityAt: string;
  createdAt: string;
  hasUnread: boolean;
  orderNumber: string | null;
  /** برای لینکِ «سفارش …» به فاکتورش. */
  orderId: string | null;
};

export type TicketMessage = {
  id: string;
  authorRole: "user" | "admin";
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type TicketDetail = TicketSummary & { messages: TicketMessage[] };

/* ───────────────────────────── اعلان‌ها ────────────────────────────────── */

export type PlusNotificationKind =
  | "plus_activated"
  | "plus_renewed"
  | "plus_expiring"
  | "plus_expired"
  | "plus_revoked"
  | "ticket_reply"
  | "payment_action_needed"
  /**
   * ⚠️ دو نوعِ تازه از مهاجرت ۰۰۹، و عمداً جدا از `plus_*`.
   *
   * `plus_activated` کارتِ خوش‌آمدگوییِ پلاس را روشن می‌کند
   * (`getUnreadWelcome`)، پس استفاده از آن برای تأییدِ دبیری یعنی دبیرِ تازه
   * به‌جای پیامِ خودش، onboardingِ خریدِ پلاس را می‌بیند.
   */
  | "teacher_approved"
  | "teacher_rejected"
  /** «مدارکت را اصلاح کن» — نه تأیید است و نه رد؛ پرونده باز می‌ماند.
   *  استفادهٔ دوباره از `teacher_rejected` یعنی کاربری که فقط باید یک عکسِ
   *  واضح‌تر بفرستد، پیامِ «رد شد» بگیرد و دیگر تلاش نکند. */
  | "teacher_needs_revision"
  /** خوش‌آمدِ حسابِ تازه (مهاجرت ۰۲۰).
   *
   *  ⚠️ عمداً `plus_activated` نیست: آن یکی کارتِ خوش‌آمدگوییِ *پلاس* را
   *  روشن می‌کند (`getUnreadWelcome`)، پس استفاده‌اش برای ثبت‌نام یعنی هر
   *  کاربرِ تازه onboardingِ خریدِ اشتراک را ببیند بی‌آنکه چیزی خریده باشد. */
  | "welcome"
  /**
   * ⚠️ چهار نوعِ تازه از مهاجرت ۰۱۲ — کلاس و بازخورد.
   *
   * جدولِ تازه‌ای برای اعلان ساخته نشد: `plus_notifications` با وجودِ
   * نامش عمومی است و یک سیستمِ دومِ موازی یعنی دانش‌آموز باید دو جا را
   * نگاه کند و زنگولهٔ شمارنده یکی‌شان را جا بیندازد.
   */
  | "teacher_viewed_student"
  | "teacher_feedback"
  | "class_joined"
  | "class_removed"
  /**
   * ⚠️ مهاجرت ۰۱۵ — «دسترسیِ دبیری‌ات لغو شد».
   *
   * `plus_revoked` عمداً دوباره استفاده نشد: در این رویداد اشتراک هم لغو
   * می‌شود ولی آن عارضه است و نه خودِ خبر. کاربری که «اشتراک پلاس شما
   * لغو شد» می‌بیند سراغِ پشتیبانیِ خرید می‌رود، در حالی که چیزی که
   * واقعاً عوض شده نقشِ اوست.
   */
  | "teacher_revoked"
  /** مهاجرت ۰۲۳ — دبیر تکلیف یا آزمونِ عروض گذاشت. */
  | "teacher_assignment";

export type PlusNotification = {
  id: string;
  kind: PlusNotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
