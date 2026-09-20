import { ARKAN, METERS } from "@/lib/aruz/meters";
import { AVAILABLE_AUDIO_ARKAN } from "@/lib/audioManifest";

/* ═══════════════════════════════════════════════════════════════════════════
   «کیمیای وزن» — کاتالوگِ ارکان
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ اینجا هیچ بانکِ حقیقتِ تازه‌ای ساخته نمی‌شود، و این مهم‌ترین قاعدهٔ این
   فایل است.

   سه منبعِ موجودِ مخزن با هم یک کاتالوگ می‌سازند و هر سه از قبل وجود داشتند:

     `lib/aruz/meters.ts` → `ARKAN`   رکن → الگوی هجایی (`مفاعیلن` = `U---`)
     `lib/aruz/meters.ts` → `METERS`  ارکانِ متعارفِ هر وزن + نامِ آن
     `lib/audioManifest.ts`           اوزانی که فایلِ ریتمِ واقعی دارند

   بازی «شنیدنِ ریتم» را هستهٔ تجربه گذاشته، پس دامنه‌اش دقیقاً همان اوزانی
   است که صدای ضبط‌شده دارند. یعنی کاتالوگ **مشتق** است و نه دست‌نویس: اگر
   فردا یک فایلِ صوتیِ تازه اضافه شود، وزنش خودبه‌خود وارد بازی می‌شود و
   ارکانِ تازه‌اش خودبه‌خود به رَک اضافه می‌شوند. هیچ فهرستی جایی از قلم
   نمی‌افتد چون هیچ فهرستِ دومی وجود ندارد.

   ⚠️ تنها چیزی که دست‌نویس است، *ظاهرِ* هر رکن است (`visuals.ts`) — رنگ و
   نشانه. و تستِ `tests/kimia/catalog.test.ts` تضمین می‌کند آن فایل هیچ‌وقت
   از این یکی عقب نماند.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * کلیدِ متعارفِ یک رکن — همان رشته‌ای که `ARKAN` می‌شناسد.
 *
 * ⚠️ این «برچسبِ فارسی» نیست حتی اگر شبیهش باشد. هر مقایسه‌ای در منطق، داده و
 * دیتابیس روی همین کلید انجام می‌شود و هیچ‌جا روی متنی که کاربر می‌بیند —
 * چون برچسبِ نمایشی روزی ممکن است عوض شود و کلیدْ قراردادِ داده است.
 */
export type FootKey = string;

/**
 * یک‌سان‌سازیِ نویسه‌ها پیش از هر مقایسه.
 *
 * ⚠️ چرا لازم است: «مفاعیلن» با یای فارسی (U+06CC) و «مفاعيلن» با یای عربی
 * (U+064A) دو رشتهٔ متفاوت‌اند و `===` بینشان نادرست است. همین برای کافِ
 * فارسی/عربی، نیم‌فاصله، اعراب و فاصله‌های تکراری هم صادق است. داده از سه
 * جا می‌آید — جدولِ اوزان، نامِ فایلِ صوتی، و بدنهٔ درخواستِ مرورگر — و هیچ
 * تضمینی نیست که هر سه یک شکلِ یونیکد داشته باشند.
 *
 * (همان تابعی که `scripts/seed-aruz.ts` برای اثرانگشتِ سؤال‌ها دارد؛ اینجا
 *  نیم‌فاصله و تنوینِ عربی هم اضافه شده چون ورودیِ این یکی از مرورگر می‌آید.)
 */
export function normalizeFoot(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[يۍى]/g, "ی") // یای عربی/کشمیری/مقصوره → یای فارسی
    .replace(/ك/g, "ک") // کافِ عربی → کافِ فارسی
    .replace(/[ً-ْٰٕٔ]/g, "") // اعراب و تنوین
    .replace(/[​-‏‪-‮⁦-⁩]/g, "") // نیم‌فاصله و کنترل‌های دوسویه
    .replace(/\s+/g, " ")
    .trim();
}

/** رشتهٔ ارکان («فاعلاتن فاعلاتن فاعلن») → آرایهٔ کلید. */
export function splitArk(ark: string): FootKey[] {
  const clean = normalizeFoot(ark);
  return clean.length === 0 ? [] : clean.split(" ");
}

/** آرایهٔ کلید → رشتهٔ ارکان. شکلِ ذخیره‌سازی در دیتابیس همین است. */
export function joinArk(feet: readonly FootKey[]): string {
  return feet.join(" ");
}

/** نگاشتِ نرمال‌شدهٔ رکن → الگوی هجایی، ساخته‌شده از `ARKAN`. */
const FOOT_PATTERN: ReadonlyMap<FootKey, string> = new Map(
  Object.entries(ARKAN).map(([foot, pattern]) => [normalizeFoot(foot), pattern]),
);

/** الگوی هجاییِ یک رکن (`U---`)، یا `null` اگر رکن ناشناخته است. */
export function footPattern(foot: FootKey): string | null {
  return FOOT_PATTERN.get(normalizeFoot(foot)) ?? null;
}

/** آیا این کلید در جدولِ ارکانِ مخزن هست؟ */
export function isKnownFoot(foot: string): boolean {
  return FOOT_PATTERN.has(normalizeFoot(foot));
}

/** الگوی هجاییِ یک دنبالهٔ کامل، یا `null` اگر رکنی ناشناخته باشد. */
export function sequencePattern(feet: readonly FootKey[]): string | null {
  let out = "";
  for (const foot of feet) {
    const p = FOOT_PATTERN.get(normalizeFoot(foot));
    if (p === null || p === undefined) return null;
    out += p;
  }
  return out;
}

/* ───────────────────────────── دامنهٔ بازی ────────────────────────────── */

/**
 * کف و سقفِ تعدادِ جایگاه‌های مخزن.
 *
 * ⚠️ سقف یک نگهبانِ تدافعی است و نه یک باورِ محصولی: بدونش، یک ردیفِ خرابِ
 * دیتابیس می‌توانست مخزنی با چهل جایگاه بسازد، و بدنهٔ درخواستی که سرور
 * اعتبارسنجی می‌کند کران نداشت.
 *
 * ⚠️ کف دو است و نه یک: `/audio/مفتعلن.mp3` واقعاً وجود دارد و ارکانش یک
 * رکن است — یعنی یک مخزنِ تک‌جایگاهی که «ساختنِ دنباله» در آن معنا ندارد.
 * آن وزن عمداً از این بازی بیرون می‌ماند (و در عروضِ سماعی سرِ جایش هست).
 */
export const MIN_SLOTS = 2;
export const MAX_SLOTS = 8;

export type KimiaMeter = {
  /** ارکانِ متعارف — همان رشته‌ای که نامِ فایلِ صوتی از آن ساخته شده. */
  readonly ark: string;
  /** نامِ وزن در جدولِ `METERS`. فقط *بعد از* پاسخِ درست نشان داده می‌شود. */
  readonly name: string;
  /** دنبالهٔ متعارف، شکسته به کلید. */
  readonly canonical: readonly FootKey[];
  /**
   * همهٔ تقطیع‌های پذیرفتنی — متعارف اول.
   *
   * ⚠️ فرضِ «هر وزن یک ارکانِ درست» غلط است. سه وزنِ همین دامنه ارکانِ
   * *هم‌الگو* دارند و هر دو خوانشْ در منابعِ عروضی معتبرند:
   *
   *     مستفعلن فعلن مستفعلن فعلن  ≡  مفعول مفتعلن مفعول مفتعلن
   *     فعلات فاعلاتن فعلات فاعلاتن ≡  متفاعلن فعولن متفاعلن فعولن
   *     مفاعلن فعلاتن مفاعلن فعلن   ≡  مفاعلن فعلن فاعلات مفتعلن
   *
   * دانش‌آموزی که دومی را بسازد، *درست* ساخته. پذیرفته نشدنش یعنی آموزشِ
   * غلط، و بدتر: در تحلیل به‌عنوان «ضعف» ثبت می‌شد.
   *
   * ⚠️ فقط بدیل‌های هم‌طول پذیرفته می‌شوند. مخزن پیش از پاسخ تعدادِ جایگاهش
   * را نشان می‌دهد و عوض کردنش بعد از پاسخ یعنی زمین زیرِ پای بازیکن تکان
   * بخورد. بدیلی با تعدادِ رکنِ متفاوت (مثلاً `مستفعلتن مستفعلتن` در برابر
   * `مفعول فعل مفعول فعل`) کنار گذاشته می‌شود و نمایندهٔ متعارف — همانی که
   * منبع با نامِ فایلِ صوتی‌اش تعیین کرده — می‌ماند.
   */
  readonly accepted: readonly (readonly FootKey[])[];
};

/** نگاشتِ الگوی هجایی → همهٔ اوزانِ جدول با همان الگو. */
const METERS_BY_PATTERN = new Map<string, { name: string; ark: string }[]>();
for (const meter of METERS) {
  const list = METERS_BY_PATTERN.get(meter.pat);
  if (list) list.push({ name: meter.name, ark: meter.ark });
  else METERS_BY_PATTERN.set(meter.pat, [{ name: meter.name, ark: meter.ark }]);
}

const METER_BY_ARK = new Map<string, { name: string; pat: string }>(
  METERS.map((m) => [normalizeFoot(m.ark), { name: m.name, pat: m.pat }]),
);

/**
 * یک رشتهٔ ارکان → وزنِ قابل‌بازیِ کیمیا، یا `null`.
 *
 * `null` یعنی «این را نمی‌دانیم»، و آن‌وقت سؤال از مخزنِ بازی بیرون می‌ماند.
 * ⚠️ هیچ حدسی جایگزینِ `null` نمی‌شود؛ تقطیعِ حدسی بدترین چیزی است که یک
 * تمرینِ عروض می‌تواند به دانش‌آموز بدهد.
 */
export function resolveMeter(ark: string): KimiaMeter | null {
  const key = normalizeFoot(ark);
  const found = METER_BY_ARK.get(key);
  if (!found) return null;

  const canonical = splitArk(key);
  if (canonical.length < MIN_SLOTS || canonical.length > MAX_SLOTS) return null;
  // از `METERS` آمده، پس همهٔ ارکانش در `ARKAN` هستند — ولی تکیه به آن
  // یعنی یک تغییرِ آیندهٔ آن فایل اینجا بی‌صدا بشکند.
  if (canonical.some((f) => !FOOT_PATTERN.has(f))) return null;

  const accepted: FootKey[][] = [canonical];
  for (const sibling of METERS_BY_PATTERN.get(found.pat) ?? []) {
    const siblingKey = normalizeFoot(sibling.ark);
    if (siblingKey === key) continue;
    const feet = splitArk(siblingKey);
    if (feet.length !== canonical.length) continue; // بالا توضیح داده شد
    if (feet.some((f) => !FOOT_PATTERN.has(f))) continue;
    accepted.push(feet);
  }

  return { ark: key, name: found.name, canonical, accepted };
}

/**
 * اوزانی که «کیمیای وزن» می‌تواند بپرسد.
 *
 * شرط: فایلِ ریتمِ واقعی دارد، در جدولِ اوزان شناخته شده است، و تعدادِ
 * ارکانش در بازهٔ قابل‌بازی است.
 */
export const KIMIA_METERS: readonly KimiaMeter[] = (() => {
  const out: KimiaMeter[] = [];
  for (const ark of AVAILABLE_AUDIO_ARKAN) {
    const meter = resolveMeter(ark);
    if (meter) out.push(meter);
  }
  return out;
})();

const METER_BY_KEY = new Map(KIMIA_METERS.map((m) => [m.ark, m]));

/** وزنِ قابلِ‌بازی با این ارکان، یا `null` اگر بیرونِ دامنهٔ بازی است. */
export function kimiaMeterFor(ark: string): KimiaMeter | null {
  return METER_BY_KEY.get(normalizeFoot(ark)) ?? null;
}

/**
 * ارکانی که روی رَک گذاشته می‌شوند.
 *
 * ⚠️ هر رکنی که در *هر* پاسخِ پذیرفتنیِ *هر* وزنِ دامنه ظاهر می‌شود اینجاست
 * — نه فقط ارکانِ پاسخِ همین دور به‌علاوهٔ چند فریب‌دهنده.
 *
 * دو دلیل، و هیچ‌کدام سلیقه‌ای نیست:
 *
 *   ۱) اگر رَک هر دور عوض شود، حافظهٔ دیداری‌ای که کلِ بازی رویش بنا شده
 *      (رکن → رنگ → نشانه → جایگاه → صدا) هیچ‌وقت شکل نمی‌گیرد. رَکِ ثابت
 *      یعنی «جدولِ تناوبیِ من» و نه «گزینه‌های این سؤال».
 *   ۲) رَکی که فقط پاسخ و چند فریب‌دهنده دارد، خودش نیمی از پاسخ است.
 *
 * ⚠️ و ترتیب ثابت است (هجا، سپس الگو) و هر دور درهم نمی‌ریزد — به همان
 * دلیلِ اول. جای هر ماده روی رَک بخشی از یاد گرفتنِ آن است.
 */
export const KIMIA_FOOT_CATALOG: readonly FootKey[] = (() => {
  const seen = new Set<FootKey>();
  for (const meter of KIMIA_METERS) {
    for (const sequence of meter.accepted) {
      for (const foot of sequence) seen.add(foot);
    }
  }
  return [...seen].sort((a, b) => {
    const pa = FOOT_PATTERN.get(a) ?? "";
    const pb = FOOT_PATTERN.get(b) ?? "";
    return pa.length - pb.length || (pa < pb ? -1 : pa > pb ? 1 : 0);
  });
})();

const CATALOG_SET = new Set(KIMIA_FOOT_CATALOG);

/** آیا این رکن روی رَکِ بازی هست؟ ورودیِ مرورگر با همین سنجیده می‌شود. */
export function isCatalogFoot(foot: string): boolean {
  return CATALOG_SET.has(normalizeFoot(foot));
}

/**
 * ورودیِ خامِ مرورگر → آرایهٔ کلیدِ معتبر، یا `null`.
 *
 * ⚠️ سرور هیچ‌وقت آرایه‌ای را که از شبکه آمده مستقیم به منطق نمی‌دهد:
 * طولش کران دارد، هر عضوش باید رشته و در کاتالوگ باشد، و نرمال‌سازی همین‌جا
 * انجام می‌شود تا «مفاعيلن» عربی هم درست خوانده شود.
 *
 * ⚠️ تکرارِ یک رکن **رد نمی‌شود**: `فعولن فعولن فعولن فعولن` یک وزنِ واقعی
 * است و مخزنی که تکرار را نپذیرد، آن را غیرقابلِ‌پاسخ می‌کند.
 */
export function parseSelection(raw: unknown, slotCount: number): FootKey[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length !== slotCount) return null;
  if (slotCount < MIN_SLOTS || slotCount > MAX_SLOTS) return null;
  const out: FootKey[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const foot = normalizeFoot(item);
    if (!CATALOG_SET.has(foot)) return null;
    out.push(foot);
  }
  return out;
}
