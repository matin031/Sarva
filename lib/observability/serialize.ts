/**
 * تبدیل «هر چیزی که throw شده» به یک شیء ثابت‌شکل و امن.
 *
 * سه مسئله را حل می‌کند که هر سه در کد قبلی بودند:
 *
 *   ۱) هر چیزی می‌تواند throw شود، نه فقط Error. `throw "خراب شد"` یا
 *      `throw { code: 500 }` هم قانونی است و `err.message` رویشان undefined
 *      می‌دهد.
 *
 *   ۲) پیام خطا می‌تواند داده لو بدهد — پیام پستگرس، پیام سرویس ایمیل که
 *      آدرس گیرنده را تکرار می‌کند. پس پیام هم باید از scrub رد شود.
 *
 *   ۳) یک خطا نباید دو بار ثبت شود. wrapper، handleError و onRequestError
 *      هر سه ممکن است همان شیء را ببینند؛ نشانِ «ثبت شد» جلوی ردیف تکراری
 *      را می‌گیرد.
 */

import { redactDeep, scrubText } from "./redact";

export type SerializedError = {
  name: string;
  message: string;
  code?: string;
  digest?: string;
  status?: number;
  stack?: string;
  cause?: SerializedError;
};

/** سقف طول stack. جدول app_error_log ۴۰۰۰ نویسه نگه می‌دارد. */
const MAX_STACK = 4000;
const MAX_MESSAGE = 1000;

function readString(source: object, key: string): string | undefined {
  const value = (source as Record<string, unknown>)[key];
  if (typeof value === "string" && value) return scrubText(value, 200);
  if (typeof value === "number") return String(value);
  return undefined;
}

/**
 * stack را از داده پاک می‌کند ولی نمی‌بُرَدش.
 *
 * scrubText معمولی سقف ۳۰۰ نویسه دارد که برای stack یعنی یک خط و نیم. اینجا
 * سقف بزرگ‌تر است ولی همان جایگزینی‌ها انجام می‌شود — یک stack که پیام خطا را
 * در خط اولش دارد می‌تواند همان ایمیل را داشته باشد.
 */
function safeStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return scrubText(stack, MAX_STACK);
}

/**
 * خطا را برای لاگ و برای ستون‌های app_error_log آماده می‌کند.
 *
 * @param withStack در پاسخ به کاربر هرگز؛ در لاگ و جدول همیشه.
 */
export function serializeError(error: unknown, withStack = true): SerializedError {
  if (error instanceof Error) {
    const out: SerializedError = {
      name: error.name || "Error",
      message: scrubText(error.message || "خطای بدون پیام", MAX_MESSAGE),
    };

    const code = readString(error, "code");
    if (code) out.code = code;

    // digest را React/Next روی خطاهای رندر می‌گذارد. تنها راهِ وصل کردنِ
    // خطایی که کاربر در مرورگر می‌بیند به ردیفِ لاگ سرور همین است.
    const digest = readString(error, "digest");
    if (digest) out.digest = digest;

    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") out.status = status;

    if (withStack) {
      const stack = safeStack(error.stack);
      if (stack) out.stack = stack;
    }

    // cause فقط یک سطح دنبال می‌شود: زنجیرهٔ عمیق‌تر در عمل کمکی نمی‌کند و
    // می‌تواند حلقه داشته باشد.
    const cause = (error as { cause?: unknown }).cause;
    if (cause !== undefined && cause !== null) {
      out.cause =
        cause instanceof Error
          ? { name: cause.name, message: scrubText(cause.message, 300) }
          : { name: "NonError", message: scrubText(String(cause), 300) };
    }

    return out;
  }

  // چیزی که Error نیست.
  if (error !== null && typeof error === "object") {
    let body: string;
    try {
      body = JSON.stringify(redactDeep(error, { maxDepth: 3 }));
    } catch {
      body = "«شیء غیرقابل‌سریال»";
    }
    return { name: "NonError", message: scrubText(body ?? "«شیء»", MAX_MESSAGE) };
  }

  return {
    name: "NonError",
    message: scrubText(String(error), MAX_MESSAGE) || "خطای بدون پیام",
  };
}

// ---------------------------------------------------------------------------
// جلوگیری از ثبت تکراری
// ---------------------------------------------------------------------------

/**
 * WeakSet و نه یک پرچم روی خودِ خطا: بعضی خطاها frozen اند و نوشتن روی آن‌ها
 * throw می‌کند — دقیقاً همان چیزی که در مسیر ثبتِ خطا نباید اتفاق بیفتد.
 * WeakSet هم نشتِ حافظه ندارد، چون با جمع‌آوری خطا خودش پاک می‌شود.
 */
const reported = new WeakSet<object>();

export function markReported(error: unknown): void {
  if (error !== null && typeof error === "object") {
    try {
      reported.add(error as object);
    } catch {
      /* هرگز نباید مسیر ثبت خطا را بشکند */
    }
  }
}

export function wasReported(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  try {
    return reported.has(error as object);
  } catch {
    return false;
  }
}
