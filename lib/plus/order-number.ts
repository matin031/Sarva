/**
 * شمارهٔ خواناى سفارش و تیکت.
 *
 * ⚠️ چرا در کد و نه در دیتابیس:
 *
 * در PostgreSQL این یک `sequence` بود و ستون `order_number` مقدارِ
 * پیش‌فرضش را از آن می‌گرفت. در MySQL چنین چیزی نیست:
 *
 *   • MySQL 8 اصلاً `SEQUENCE` ندارد (MariaDB دارد، ولی هر دو باید کار کنند).
 *   • `AUTO_INCREMENT` را نه `DEFAULT` می‌بیند، نه ستونِ تولیدشده، و نه
 *     تریگرِ `BEFORE INSERT` — مقدارش هنوز ساخته نشده.
 *
 * پس عددِ خامِ افزایشی در دیتابیس می‌ماند (`order_seq`) و شکلِ خوانا اینجا
 * ساخته می‌شود. یک تابعِ خالص، با تست — به‌جای یک نوشتنِ دومِ بی‌دلیل بعد از
 * هر INSERT.
 *
 * ⚠️ قالب عمداً همان قالبِ قبلی است («SRV-001040»). کاربرها این شماره را در
 * تیکت می‌نویسند و پشتیبانی با آن می‌گردد؛ عوض کردنش یعنی شکستنِ چیزی که
 * بیرون از سیستم هم استفاده می‌شود.
 */

const ORDER_PREFIX = "SRV-";
const TICKET_PREFIX = "TK-";
const PAD = 6;

function format(prefix: string, seq: number): string {
  if (!Number.isFinite(seq) || seq < 0) return `${prefix}?`;
  return `${prefix}${String(Math.trunc(seq)).padStart(PAD, "0")}`;
}

export function orderNumber(seq: number): string {
  return format(ORDER_PREFIX, seq);
}

export function ticketNumber(seq: number): string {
  return format(TICKET_PREFIX, seq);
}

/**
 * از شمارهٔ خوانا به عدد — برای جست‌وجوی مدیر.
 *
 * null یعنی «این یک شمارهٔ سفارش نیست»، که با «پیدا نشد» فرق دارد: کدِ
 * فراخوان می‌تواند به‌جای یک جست‌وجوی بی‌فایده روی عدد، متن را در ستون‌های
 * دیگر بگردد.
 *
 * پیشوند اختیاری است تا مدیری که فقط «1040» را کپی کرده هم نتیجه بگیرد.
 */
export function parseOrderNumber(raw: string): number | null {
  const cleaned = raw.trim().toUpperCase().replace(ORDER_PREFIX, "");
  if (!/^\d{1,18}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseTicketNumber(raw: string): number | null {
  const cleaned = raw.trim().toUpperCase().replace(TICKET_PREFIX, "");
  if (!/^\d{1,18}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}
