import type { FootKey } from "./catalog";

/* ═══════════════════════════════════════════════════════════════════════════
   داوریِ یک ترکیب — منطقِ خالص، بدونِ React و بدونِ دیتابیس.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ همان الگوی `lib/plus/skill-buckets.ts` و `lib/aruz-bridge/machine.ts`:
   چیزی که «درست» و «غلط» را تعریف می‌کند باید بدونِ بالا آوردنِ دیتابیس
   قابلِ تست باشد، چون اشتباهش مستقیم به کارنامهٔ دانش‌آموز می‌رود.

   سرور همین توابع را اجرا می‌کند و مرورگر هیچ‌کدامشان را — نه به‌خاطرِ
   معماری، بلکه چون ورودی‌شان (`accepted`) همان پاسخ است.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * جنسِ اشتباه — عمداً فقط دو تا.
 *
 * ⚠️ وسوسهٔ ساختنِ یک رده‌بندیِ ده‌تایی («یک رکن غلط»، «دو رکن غلط»، «جابه‌جاییِ
 * مجاور»، …) هست و رد شد: هیچ‌کدام به بازخوردِ متفاوتی نمی‌رسیدند، و
 * رده‌بندی‌ای که به رفتارِ متفاوت نرسد فقط یک ستونِ دیتابیس است که کسی
 * نمی‌داند با آن چه کند.
 *
 *   ORDER_ONLY    ارکان درست‌اند، ترتیب نه. اینجا دانش‌آموز *ارکان را
 *                 می‌شناسد* و فقط ریتم را نچیده — یک اشتباهِ کاملاً متفاوت،
 *                 و راهنمایی‌اش هم باید متفاوت باشد.
 *   FOOT_CONTENT  دستِ‌کم یک رکن اصلاً در وزن نیست.
 */
export type KimiaErrorType = "ORDER_ONLY" | "FOOT_CONTENT";

export type Judgement =
  | { correct: true; matched: readonly FootKey[] }
  | { correct: false; errorType: KimiaErrorType; nearest: readonly FootKey[] };

/** دو دنباله دقیقاً یکی‌اند؟ */
export function sameSequence(a: readonly FootKey[], b: readonly FootKey[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * چند بار هر رکن آمده.
 *
 * ⚠️ `Set` اینجا **غلط** است و این یکی از آن باگ‌هایی است که فقط با دادهٔ
 * واقعی معلوم می‌شود. `فعولن فعولن فعولن فعولن` یک وزنِ رایج است؛ با `Set`
 * پاسخِ `فعولن` (یک‌بار، بقیه چیزِ دیگر) هم‌مجموعه به نظر می‌رسید و
 * «فقط ترتیب» اعلام می‌شد، در حالی که سه رکنش اصلاً غلط بود.
 */
function frequency(feet: readonly FootKey[]): Map<FootKey, number> {
  const out = new Map<FootKey, number>();
  for (const foot of feet) out.set(foot, (out.get(foot) ?? 0) + 1);
  return out;
}

/** آیا دو دنباله همان ارکان را با همان تعداد دارند (فارغ از ترتیب)؟ */
export function sameMultiset(a: readonly FootKey[], b: readonly FootKey[]): boolean {
  if (a.length !== b.length) return false;
  const fa = frequency(a);
  const fb = frequency(b);
  if (fa.size !== fb.size) return false;
  for (const [foot, count] of fa) if (fb.get(foot) !== count) return false;
  return true;
}

/** تعدادِ جایگاه‌هایی که با هم نمی‌خوانند. طولِ نابرابر = بی‌نهایت. */
export function positionalMismatch(a: readonly FootKey[], b: readonly FootKey[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/**
 * نزدیک‌ترین پاسخِ پذیرفتنی به آنچه بازیکن ساخته.
 *
 * ⚠️ فقط برای *تحلیل* است و هیچ‌وقت به مرورگر نمی‌رود. وقتی یک وزن دو تقطیعِ
 * معتبر دارد، «کدام رکن را با کدام اشتباه گرفت» بی‌معناست مگر اینکه اول
 * معلوم شود بازیکن دنبالِ کدام خوانش بوده. بدونِ این، دانش‌آموزی که خوانشِ
 * دوم را تقریباً درست ساخته، در تحلیل چهار «اشتباه» می‌گرفت.
 *
 * تساوی → دنبالهٔ متعارف (اولین عضوِ `accepted`) برنده است؛ هم نتیجه را
 * قطعی می‌کند و هم پیش‌فرض را روی خوانشی می‌گذارد که منبع اصلی می‌داند.
 */
export function nearestAccepted(
  selected: readonly FootKey[],
  accepted: readonly (readonly FootKey[])[],
): readonly FootKey[] {
  let best = accepted[0] ?? [];
  let bestCost = positionalMismatch(selected, best);
  for (let i = 1; i < accepted.length; i++) {
    const cost = positionalMismatch(selected, accepted[i]);
    if (cost < bestCost) {
      bestCost = cost;
      best = accepted[i];
    }
  }
  return best;
}

/**
 * داوریِ نهایی.
 *
 * ⚠️ «درست» یعنی *دقیقاً* برابر با دستِ‌کم یکی از پاسخ‌های پذیرفتنی. نه
 * «نزدیک»، نه «همان ارکان با ترتیبِ دیگر».
 *
 * ⚠️ و وقتی پاسخ با یک بدیلِ معتبر درست است، هیچ اشتباهی ثبت نمی‌شود — حتی
 * نسبت به خوانشِ متعارف. دانش‌آموز درست جواب داده و تحلیل نباید برایش
 * «سردرگمی» بسازد.
 */
export function judge(
  selected: readonly FootKey[],
  accepted: readonly (readonly FootKey[])[],
): Judgement {
  for (const candidate of accepted) {
    if (sameSequence(selected, candidate)) return { correct: true, matched: candidate };
  }
  const nearest = nearestAccepted(selected, accepted);
  const orderOnly = accepted.some((candidate) => sameMultiset(selected, candidate));
  return {
    correct: false,
    errorType: orderOnly ? "ORDER_ONLY" : "FOOT_CONTENT",
    nearest,
  };
}

/**
 * «کدام رکن را جای کدام گذاشت» — دادهٔ خامِ تحلیلِ سردرگمی.
 *
 * فقط برای *اولین* تلاشِ غلط معنا دارد؛ تلاش‌های بعدی رفتارِ اصلاح‌اند و نه
 * شواهدِ یادگیری. (قاعدهٔ «یک دور = یک شاهد» در `lib/kimia/round.ts`.)
 */
export type Confusion = { index: number; expected: FootKey; selected: FootKey };

export function confusions(
  selected: readonly FootKey[],
  nearest: readonly FootKey[],
): Confusion[] {
  const out: Confusion[] = [];
  const n = Math.min(selected.length, nearest.length);
  for (let i = 0; i < n; i++) {
    if (selected[i] !== nearest[i]) {
      out.push({ index: i, expected: nearest[i], selected: selected[i] });
    }
  }
  return out;
}

/**
 * راهنماییِ بعد از پاسخِ غلط.
 *
 * ⚠️ این متن‌ها عمداً هیچ جایگاهی را نام نمی‌برند و هیچ رکنی را تأیید یا رد
 * نمی‌کنند. قفل کردنِ جایگاه‌های درست یا رو کردنِ «این یکی غلط بود» بازی را
 * به حذفِ تدریجی تبدیل می‌کند: بازیکن بدونِ گوش دادن به ریتم و فقط با
 * آزمون‌وخطا به جواب می‌رسد، و آن دیگر تمرینِ عروض نیست.
 */
export const KIMIA_HINTS: Record<KimiaErrorType, string> = {
  ORDER_ONLY: "رکن‌ها درست‌اند؛ ترتیبشان را دوباره بررسی کن.",
  FOOT_CONTENT: "یکی از ارکان با ریتمِ بیت جور نیست.",
};
