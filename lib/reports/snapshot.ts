/**
 * متنِ خواندنیِ یک محتوای ساختاریافته، برای `snapshot`ِ گزارش.
 *
 * ⚠️ چرا بازگشتی و نه یک `switch` روی نوعِ محتوا:
 *
 * `questionPartContentSchema` هجده شاخه دارد و شاخهٔ تازه هم اضافه می‌شود.
 * یک `switch` که یک شاخه را جا بیندازد بی‌سروصدا `"[object Object]"` در
 * پایگاه‌داده می‌نویسد — و آن‌وقت مدیر نمی‌تواند سؤال را با نوشتنِ یک مصراع
 * پیدا کند، که کلِ فایدهٔ این ستون بود. جمع‌کنندهٔ عمومی هیچ شاخه‌ای را جا
 * نمی‌اندازد.
 *
 * فقط رشته‌ها برداشته می‌شوند: `type`، شمارنده‌ها و پرچم‌ها متنِ خواندنی
 * نیستند و فقط snapshot را شلوغ می‌کنند.
 */

/** کلیدهایی که مقدارشان رشته است ولی متنِ محتوا نیست. */
const SKIP_KEYS = new Set(["type", "inputVariant", "displayVariant", "kind", "id"]);

export function extractReadableText(value: unknown, maxLength = 600): string {
  const parts: string[] = [];
  let total = 0;

  const walk = (v: unknown, key?: string) => {
    if (total >= maxLength || v == null) return;
    if (typeof v === "string") {
      if (key && SKIP_KEYS.has(key)) return;
      const t = v.trim();
      if (!t) return;
      parts.push(t);
      total += t.length + 3;
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v === "object") {
      for (const [k, item] of Object.entries(v as Record<string, unknown>)) {
        walk(item, k);
      }
    }
  };

  walk(value);
  const joined = parts.join(" / ");
  return joined.length > maxLength ? `${joined.slice(0, maxLength - 1)}…` : joined;
}
