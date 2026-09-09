import type { OrderStatus, PaymentState, TicketCategory, TicketStatus } from "./types";

/**
 * برچسب‌های فارسیِ نمایشی.
 *
 * ⚠️ عمداً در فایلِ خودش و بدونِ "server-only": هم صفحه‌های سروری و هم
 * فرم‌های کلاینت به این‌ها نیاز دارند. اگر کنارِ کوئری‌ها می‌ماندند، اولین
 * کامپوننتِ کلاینتی که واردشان می‌کرد، کلِ لایهٔ دیتابیس را به باندلِ مرورگر
 * می‌کشید — و build با خطای «server-only» می‌شکست.
 *
 * ⚠️ و چرا اینجا و نه در دیتابیس: تغییرِ یک عبارتِ فارسی نباید به migration
 * نیاز داشته باشد. همان قاعده‌ای که `AUDIT_ACTION_LABELS` هم دارد.
 */

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  payment: "پرداخت و خرید",
  plus: "سروا پلاس",
  account: "حساب و ورود",
  technical: "مشکل فنی",
  content: "مشکل آموزشی / محتوا",
  other: "سایر",
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "باز",
  waiting_for_support: "در انتظار پاسخ پشتیبانی",
  waiting_for_user: "در انتظار پاسخ شما",
  resolved: "حل شد",
  closed: "بسته شد",
};

/**
 * وضعیتِ سفارش، آن‌طور که کاربر می‌بیند.
 *
 * ⚠️ وضعیتِ خامِ داخلی هرگز نمایش داده نمی‌شود. مهم‌ترین تفکیک این است:
 *   • «در انتظار پرداخت» → هنوز کاری نکرده‌ای.
 *   • «در حال بررسی»     → پول ممکن است کم شده باشد؛ دوباره پرداخت نکن.
 *   • «پرداخت ناموفق»    → قطعاً انجام نشده.
 * قاطی‌کردنِ دو تای آخر یعنی کاربری که پولش کم شده، دوباره پول می‌دهد.
 */
export function orderStatusLabel(status: OrderStatus, attempt: PaymentState | null): string {
  if (status === "paid") return "پرداخت موفق";
  if (status === "refunded") return "بازپرداخت‌شده";
  if (status === "cancelled") return "لغوشده";
  if (status === "expired") return "منقضی‌شده";

  if (attempt === "unknown" || attempt === "pending" || attempt === "redirected") {
    return "در حال بررسی";
  }
  if (attempt === "failed") return "پرداخت ناموفق";
  if (attempt === "cancelled") return "لغوشده";
  return "در انتظار پرداخت";
}

export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  created: "ساخته شد",
  redirected: "به درگاه رفت",
  pending: "در انتظار درگاه",
  verified: "تأیید شد",
  failed: "ناموفق",
  cancelled: "لغو شد",
  unknown: "نامعلوم",
};
