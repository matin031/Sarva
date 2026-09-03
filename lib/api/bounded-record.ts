import { z } from "zod";

/**
 * یک شیءِ آزاد (`Record<string, unknown>`) که مرز دارد.
 *
 * ⚠️ چرا لازم است:
 *
 * دو جا در این پروژه شیءِ دلخواهِ کاربر را در ستون `jsonb` می‌ریزند —
 * `user_bookmarks.payload` و `content_reports.target_ref`. هر دو با
 * `z.record(z.string(), z.unknown())` اعتبارسنجی می‌شدند، که یعنی *هیچ* مرزی:
 * نه تعداد کلید، نه عمق، نه اندازه.
 *
 * سقفِ بدنه (`readJson`) جلوی بدنهٔ چندمگابایتی را می‌گیرد، ولی داخلِ همان
 * سقف هم می‌شود چیزی ساخت که پایین‌دست دردسر شود: یک شیء با هزاران کلید، یا
 * تودرتوییِ عمیق که هر کدِ بازگشتی‌ای (از جمله `JSON.stringify` و
 * redaction خودمان) را روی پشته می‌برد.
 *
 * پس این سه مرز، مستقل از سقفِ بدنه:
 *
 *   • تعداد کلید در هر سطح
 *   • عمقِ تودرتویی
 *   • اندازهٔ سریال‌شده
 *
 * پیام‌ها عمداً به کاربر نمی‌گویند سقف دقیقاً چند است: این‌ها ورودی‌هایی‌اند
 * که هیچ کاربر واقعی‌ای به آن‌ها نمی‌خورد، پس پیام کوتاه کافی است.
 */

export type RecordBounds = {
  /** بیشترین تعداد کلید در هر سطح */
  maxKeys: number;
  /** بیشترین عمقِ تودرتویی؛ ۱ یعنی فقط مقادیرِ ساده */
  maxDepth: number;
  /** بیشترین اندازهٔ سریال‌شده به بایت */
  maxBytes: number;
};

export const DEFAULT_RECORD_BOUNDS: RecordBounds = {
  maxKeys: 50,
  maxDepth: 4,
  maxBytes: 4 * 1024,
};

/** آیا این مقدار از مرزها رد می‌شود؟ پیامِ فارسی برمی‌گرداند یا null. */
export function recordBoundsError(
  value: unknown,
  bounds: RecordBounds = DEFAULT_RECORD_BOUNDS,
): string | null {
  // اندازه اول: ارزان‌ترین سد، و همان چیزی که واقعاً در ستون می‌نشیند.
  let serialized: string;
  try {
    serialized = JSON.stringify(value) ?? "";
  } catch {
    // حلقه در شیء — JSON.stringify استثنا می‌دهد. همان‌جا رد می‌شود.
    return "ساختار این داده معتبر نیست.";
  }
  if (Buffer.byteLength(serialized, "utf8") > bounds.maxBytes) {
    return "این داده بیش از حد بزرگ است.";
  }

  // عمق و تعداد کلید، با پیمایشِ صریح و نه بازگشتی: خودِ محافظ نباید روی
  // ورودیِ عمیق پشته را سرریز کند.
  const stack: { node: unknown; depth: number }[] = [{ node: value, depth: 1 }];
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (node === null || typeof node !== "object") continue;
    if (depth > bounds.maxDepth) return "ساختار این داده بیش از حد تودرتوست.";

    const entries = Array.isArray(node) ? node : Object.values(node as Record<string, unknown>);
    if (entries.length > bounds.maxKeys) return "این داده کلیدهای بیش از حد دارد.";

    for (const child of entries) stack.push({ node: child, depth: depth + 1 });
  }

  return null;
}

/** شِمای زاد برای یک شیءِ آزادِ مرزدار. */
export function boundedRecord(bounds: RecordBounds = DEFAULT_RECORD_BOUNDS) {
  return z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
    const problem = recordBoundsError(value, bounds);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });
}
