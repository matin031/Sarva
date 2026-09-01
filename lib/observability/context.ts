/**
 * زمینهٔ درخواست — همان چیزی که یک خط لاگ را به یک درخواست وصل می‌کند.
 *
 * مسئله: `logger.info(...)` در عمقِ lib/db یا lib/mail هیچ راهی ندارد بفهمد
 * برای کدام درخواست کار می‌کند. رساندنِ دستیِ requestId از route تا آنجا یعنی
 * عوض کردن امضای ده‌ها تابع.
 *
 * راه‌حل استاندارد Node برای همین کار AsyncLocalStorage است: یک مقدار که در
 * تمام زنجیرهٔ async یک اجرا دیده می‌شود و بین اجراهای همزمان قاطی نمی‌شود.
 *
 * ⚠️ یک فرضِ غلط که عمداً اینجا نداریم: زمینهٔ اجرای `proxy.ts` **خودکار** وارد
 * Route Handler نمی‌شود. آن‌ها دو فراخوانِ جدا از سمت سرورِ Next اند. تنها
 * چیزی که بین این دو رد می‌شود، هدر است — پس proxy هدر `x-request-id` را
 * می‌نویسد و withRoute (یا Server Action) آن را می‌خواند و از نو زمینه
 * می‌سازد.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestContext = {
  requestId: string;
  route?: string;
  method?: string;
  /** فقط uuid کاربر. هرگز ایمیل یا نام. */
  userId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

/** uuid v4 — کوتاه، یکتا، و بدونِ هیچ اطلاعاتی از خودِ درخواست. */
export function newRequestId(): string {
  return randomUUID();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * مقدارِ آمده در هدر را فقط وقتی می‌پذیرد که واقعاً uuid باشد.
 *
 * چرا اعتبارسنجی لازم است: Caddy هدرهای ناشناخته را حذف نمی‌کند، پس هر
 * کلاینتی می‌تواند `x-request-id` بفرستد. یک مقدارِ دلخواه یعنی امکانِ تزریق
 * خط تازه در لاگ (`\n{"level":"info"...`)، یا یک رشتهٔ ده‌کیلوبایتی در هر خط،
 * یا حتی رساندنِ داده به لاگ برای کسی که بعداً آن را می‌خواند.
 *
 * uuid هیچ‌کدام را ممکن نمی‌کند: طولش ثابت است و فقط hex و خط تیره دارد.
 */
export function normalizeRequestId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return UUID.test(value) ? value.toLowerCase() : null;
}

/** اجرای یک کار داخل یک زمینهٔ تازه. */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  // نسخهٔ تازه از شیء گرفته می‌شود تا فراخوان نتواند بعداً زمینهٔ یک درخواستِ
  // در جریان را از بیرون عوض کند.
  return storage.run({ ...context }, fn);
}

export function currentRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}

export function currentRequestId(): string | null {
  return storage.getStore()?.requestId ?? null;
}

/**
 * uuid کاربر را به زمینهٔ جاری اضافه می‌کند.
 *
 * بعد از احراز هویت صدا زده می‌شود: قبل از آن هنوز نمی‌دانیم کاربر کیست، و
 * لاگ‌های بعدیِ همان درخواست باید بدانند.
 *
 * اگر زمینه‌ای نباشد (مثلاً یک اسکریپت)، بی‌صدا رد می‌شود.
 */
export function attachUserId(userId: string | null | undefined): void {
  const store = storage.getStore();
  if (store && userId) store.userId = userId;
}
