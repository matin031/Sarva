import { ARKAN, METERS } from "@/lib/aruz/meters";

/* ═══════════════════════════════════════════════════════════════════════════
   آنچه روی شیشه نوشته می‌شود: نامِ رکن‌ها، نه خط‌کشیِ هجایی.
   ═══════════════════════════════════════════════════════════════════════════

   بازیکن باید روی شیشه «فاعلاتن» یا «مفاعلن» ببیند — همان چیزی که در کلاس
   می‌گوید و در کتاب می‌خواند — و نه ردیفی از `U` و `ـ` که باید در ذهن دوباره
   به رکن ترجمه‌اش کند. در یک پنجرهٔ چندثانیه‌ای، همان ترجمهٔ ذهنی یعنی باختن.

   دادهٔ بانک بیشتر به‌صورتِ نامِ رکن است، ولی هیچ قیدی در جدول نیست که
   نشانه‌گذاریِ هجایی را رد کند؛ ردیف‌هایی که از پنلِ مدیر یا بانک‌های دیگر
   آمده‌اند می‌توانند `U - -` یا `ـ ∪ ـ ـ` باشند. این تابع هر دو را به یک شکل
   درمی‌آورد.

   ⚠️ فقط *نمایش* است. مقایسهٔ پاسخ (سمتِ سرور، `answers/route.ts`) با همان
   رشتهٔ خامِ دیتابیس انجام می‌شود و این تابع هیچ‌وقت نباید در مسیرِ آن باشد.
   ═══════════════════════════════════════════════════════════════════════════ */

/** همهٔ نشانه‌هایی که برای هجای کوتاه دیده شده‌اند. */
const SHORT = new Set(["U", "u", "∪", "ᴗ", "⏑", "˘", "◡", "υ", "v", "V"]);
/** و برای هجای بلند — از خطِ تیرهٔ لاتین تا کشیدهٔ فارسی. */
const LONG = new Set(["-", "–", "—", "−", "ـ", "¯", "_", "‒", "―", "⏤"]);
/** جداکنندهٔ رکن‌ها، وقتی نویسنده صریحاً مرز گذاشته. */
const SEPARATOR = new Set(["/", "|", "،", ",", "+", "·"]);

/* وقتی یک الگو به چند رکن می‌خورد، کدام نام را بگوییم.
   `U---` هم «مفاعیلن» است هم «فعولان»؛ `--U` هم «مفعول» است هم «مستفعل».
   نامِ رایج‌تر در پیکرهٔ گنجور برنده است — همان نامی که بازیکن در کتاب می‌بیند. */
const PREFERRED: Record<string, string> = {
  "U---": "مفاعیلن",
  "--U": "مفعول",
  "-": "فع",
};

const FOOT_BY_PATTERN: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [name, pattern] of Object.entries(ARKAN)) {
    if (!map.has(pattern)) map.set(pattern, name);
  }
  for (const [pattern, name] of Object.entries(PREFERRED)) map.set(pattern, name);
  return map;
})();

/* رکن‌های رایجِ چهار و سه‌هجایی جلوترند: در شکستنِ یک رشتهٔ بلند، اولویت با
   رکنی است که در بحورِ اصلی می‌آید. */
const SEGMENT_FEET: readonly string[] = [
  "فاعلاتن", "مفاعیلن", "مستفعلن", "فعلاتن", "مفاعلن", "مفتعلن", "فعولن",
  "فاعلن", "مفعول", "مفاعیل", "فاعلات", "فعلات", "مفعولن", "فعلن", "فعل", "فع",
];

/** الگوی هجاییِ «-U-U» به رکن‌ها. `null` یعنی راهِ معقولی برای شکستن نبود. */
function segment(pattern: string): string[] | null {
  // اول: آیا کلِ رشته دقیقاً یکی از بحورِ شناخته‌شده است؟
  const meter = METERS.find((m) => m.pat === pattern);
  if (meter) return meter.ark.split(/\s+/);

  const single = FOOT_BY_PATTERN.get(pattern);
  if (single) return [single];

  /* برنامه‌ریزیِ پویا: کمترین تعدادِ رکن، و در تساوی رکن‌های رایج‌تر. هر رکنِ
     یک‌هجایی جریمه دارد تا «فع فع فع» جای یک رکنِ واقعی را نگیرد. */
  const n = pattern.length;
  const best: ({ cost: number; feet: string[] } | null)[] = Array(n + 1).fill(null);
  best[0] = { cost: 0, feet: [] };
  for (let i = 0; i < n; i++) {
    const here = best[i];
    if (!here) continue;
    SEGMENT_FEET.forEach((foot, rank) => {
      const p = ARKAN[foot];
      if (!p || !pattern.startsWith(p, i)) return;
      const cost = here.cost + 10 + rank * 0.1 + (p.length === 1 ? 25 : 0);
      const j = i + p.length;
      if (!best[j] || best[j]!.cost > cost) best[j] = { cost, feet: [...here.feet, foot] };
    });
  }
  return best[n]?.feet ?? null;
}

/**
 * متنِ نمایشیِ یک گزینهٔ وزنی.
 *
 * نامِ رکن همان‌طور که هست برمی‌گردد (فقط فاصله‌ها یکدست می‌شوند). نشانه‌گذاریِ
 * هجایی به نامِ رکن ترجمه می‌شود. هر چیزِ ناشناخته‌ای دست‌نخورده برمی‌گردد —
 * نشان‌دادنِ دادهٔ خام بهتر از حدس‌زدنِ غلط است.
 */
export function meterLabel(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return raw;
  /* هر حرفِ فارسی یعنی خودِ نویسنده نامِ رکن را نوشته. ⚠️ کشیده (U+0640) از
     این بازه بیرون است: «ـ» حرف نیست، نشانهٔ هجای بلند است. */
  if (/[ء-ؿف-يپچژکگی]/.test(text)) return text;

  const groups: string[] = [""];
  for (const ch of text) {
    if (SHORT.has(ch)) groups[groups.length - 1] += "U";
    else if (LONG.has(ch)) groups[groups.length - 1] += "-";
    else if (SEPARATOR.has(ch)) groups.push("");
    else if (/\s|‌|‏|‎/.test(ch)) continue;
    else return text;
  }

  const feet: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    const part = segment(group);
    if (!part) return text;
    feet.push(...part);
  }
  return feet.length ? feet.join(" ") : text;
}
