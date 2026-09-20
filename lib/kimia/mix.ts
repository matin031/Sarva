/* ═══════════════════════════════════════════════════════════════════════════
   ترکیبِ رنگِ جوهرها — قطعی، مشتق، و فقط نمایشی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ سه چیزی که این فایل **نیست**:

     • ادعای علمی. این یک شبیه‌سازیِ رنگ‌دانه‌ای ساده است، نه فیزیکِ رنگ.
     • دادهٔ آموزشی. هیچ رنگی در جدولِ پاسخ‌ها ذخیره نمی‌شود؛ آن‌جا فقط
       کلیدِ متعارفِ رکن می‌نشیند. عوض شدنِ پالت در آینده نباید یک ردیفِ
       تاریخچه را هم خراب کند.
     • سرنخ. رنگِ حاصل فقط *بعد* از داوریِ سرور ساخته می‌شود.

   ⚠️ چرا میانگینِ ساده یا `linear-gradient` رد شد:

   میانگینِ خامِ RGB (و بدتر، میانگینِ فامِ HSL) دو رنگِ مکمل را خاکستری
   می‌کند و سه رنگِ روشن را سفید — یعنی دقیقاً حسی که نمی‌خواهیم: «رنگ‌ها
   شسته شدند». آنچه چشم از ترکیبِ *جوهر* انتظار دارد، جمعِ نور نیست، جمعِ
   *جذب* است: هر جوهر بخشی از طیف را می‌خورد و آنچه می‌ماند رنگِ ترکیب است.

   مدلِ اینجا همان را به ساده‌ترین شکلِ ممکن می‌گیرد (الهام‌گرفته از
   Kubelka–Munk، بدونِ ادعای آن):

       sRGB → linear → A = -ln(channel)  → میانگینِ A → exp(-Ā) → sRGB

   خاصیت‌هایی که از این مدل می‌خواستیم و دارد:
     • قطعی است: یک دنباله همیشه یک رنگ.
     • `A|A|A|A` دقیقاً همان `A` می‌ماند و خاکستری نمی‌شود — که برای وزنی
       مثل «فعولن فعولن فعولن فعولن» حیاتی است.
     • جابه‌جاییِ ترتیب رنگ را عوض نمی‌کند (میانگین جابه‌جایی‌پذیر است) —
       و این درست است: ترتیب را *داوری* می‌سنجد، نه شیمی.
   ═══════════════════════════════════════════════════════════════════════════ */

/** کف برای لگاریتم: جلوی `-ln(0) = ∞` را می‌گیرد. */
const EPSILON = 1 / 255;

export type Rgb = { r: number; g: number; b: number };

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** `#rrggbb` یا `#rgb` → مؤلفه‌های ۰..۱. ورودیِ نامعتبر → مشکی. */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/* ─────────────────────────── OKLab، برای مهارِ نتیجه ───────────────────── */

type Oklab = { L: number; a: number; b: number };

function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearRgb({ L, a, b }: Oklab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function hexToOklab(hex: string): Oklab {
  const { r, g, b } = parseHex(hex);
  return linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

/**
 * OKLab → هگز، با جا دادنِ رنگ در گاموتِ sRGB.
 *
 * ⚠️ بریدنِ خامِ کانال‌ها (`clamp01` روی هر سه) کارِ درستی نیست و این را با
 * تست فهمیدیم: یک آبیِ روشن که کمی بیرونِ گاموت بیفتد، با بریدنِ کانال‌ها
 * *فامش* جابه‌جا می‌شود — یعنی سطحِ روشنِ مایع رنگِ دیگری از خودِ مایع
 * می‌شد. راهِ درست، کم کردنِ اشباع تا جایی است که رنگ داخلِ گاموت بیاید؛
 * آن‌وقت فام و روشنایی سرِ جایشان می‌مانند و فقط شدت کم می‌شود.
 */
function oklabToHex(lab: Oklab): string {
  const inGamut = ([r, g, b]: [number, number, number]) =>
    r >= -0.0015 && r <= 1.0015 && g >= -0.0015 && g <= 1.0015 && b >= -0.0015 && b <= 1.0015;

  let scale = 1;
  let rgb = oklabToLinearRgb(lab);
  // بیست گام ۴٪ یعنی تا ~۴۴٪ اشباعِ باقی‌مانده؛ فراتر از آن هیچ رنگی لازم نشد.
  for (let i = 0; i < 20 && !inGamut(rgb); i++) {
    scale *= 0.96;
    rgb = oklabToLinearRgb({ L: lab.L, a: lab.a * scale, b: lab.b * scale });
  }

  const [r, g, b] = rgb;
  return toHex({
    r: linearToSrgb(clamp01(r)),
    g: linearToSrgb(clamp01(g)),
    b: linearToSrgb(clamp01(b)),
  });
}

/* ─────────────────────────────── خودِ ترکیب ────────────────────────────── */

/**
 * ترکیبِ جذبی — هستهٔ مدل.
 *
 * وزنِ همهٔ اجزا برابر است: مخزن چهار جایگاهِ هم‌اندازه دارد و هیچ رکنی
 * «بیشتر» از دیگری نیست. تکرارِ یک رکن خودبه‌خود وزنش را بالا می‌برد، که
 * همان رفتارِ درست است.
 */
export function subtractiveMix(colors: readonly string[]): string {
  if (colors.length === 0) return "#000000";

  let ar = 0;
  let ag = 0;
  let ab = 0;
  for (const hex of colors) {
    const { r, g, b } = parseHex(hex);
    ar += -Math.log(Math.max(srgbToLinear(r), EPSILON));
    ag += -Math.log(Math.max(srgbToLinear(g), EPSILON));
    ab += -Math.log(Math.max(srgbToLinear(b), EPSILON));
  }
  const n = colors.length;
  return toHex({
    r: linearToSrgb(clamp01(Math.exp(-ar / n))),
    g: linearToSrgb(clamp01(Math.exp(-ag / n))),
    b: linearToSrgb(clamp01(Math.exp(-ab / n))),
  });
}

/**
 * پنجرهٔ روشناییِ نتیجه روی زمینهٔ شبِ سروا.
 *
 * ⚠️ فقط *مهار* است و نه جایگزینی: فام و ته‌رنگِ حاصل دست‌نخورده می‌مانند و
 * تنها روشنایی به بازه‌ای برده می‌شود که هم روی زمینهٔ تیره دیده شود و هم
 * مخزن را به یک چراغِ سفید تبدیل نکند. بدونِ این، ترکیبِ چهار رنگِ روشن
 * تقریباً سفید می‌شد و ترکیبِ چهار رنگِ تیره تقریباً نامرئی.
 */
const RESULT_MIN_L = 0.58;
const RESULT_MAX_L = 0.84;

/**
 * ⚠️ و یک کفِ اشباع، که لازم بودنش فقط با دادهٔ واقعی معلوم شد.
 *
 * ترکیبِ جذبیِ چند فامِ دور (مثلاً `مفعول مفاعیل مفاعیل فعل`) ذاتاً کم‌رنگ
 * درمی‌آید — همان کاری که جوهرِ واقعی هم می‌کند. ولی این رنگ *پاداشِ* پاسخِ
 * درست است، و پاداشی که خاکستریِ گِلی باشد حس می‌دهد «انگار باز هم خراب
 * شد». اندازه‌گیری روی هر ۲۹ وزنِ مخزن نشان داد نُه‌تایشان زیر این کف
 * می‌افتند.
 *
 * پس فام **دست‌نخورده** می‌ماند و فقط شدتش به یک بازهٔ قابلِ‌دیدن روی
 * زمینهٔ شب برده می‌شود. هویتِ مشتق حفظ می‌شود: هر وزن هنوز دقیقاً یک رنگ
 * دارد و دو وزنِ متفاوت دو رنگ. سقف هم هست تا نتیجه هیچ‌وقت نئون نشود.
 */
const RESULT_MIN_C = 0.085;
const RESULT_MAX_C = 0.155;

export function clampForDarkStage(hex: string): string {
  const lab = hexToOklab(hex);
  const L = Math.min(RESULT_MAX_L, Math.max(RESULT_MIN_L, lab.L));
  const chroma = Math.hypot(lab.a, lab.b);
  const targetC = Math.min(RESULT_MAX_C, Math.max(RESULT_MIN_C, chroma));
  if (L === lab.L && targetC === chroma) return hex;
  /* ⚠️ دو مقیاسِ جدا و نه یکی: روشنایی نباید فام را بکشد و اشباع نباید
     روشنایی را. ضریبِ اشباع روی a و b برابر است، پس زاویهٔ فام — یعنی
     «این رنگِ کدام وزن است» — عوض نمی‌شود. */
  const k = chroma > 1e-6 ? targetC / chroma : 0;
  return oklabToHex({ L, a: lab.a * k, b: lab.b * k });
}

/**
 * رنگِ «کیمیای کامل» — پاداشِ پاسخِ درست.
 *
 * قطعی، مشتق از خودِ موادِ انتخاب‌شده، و تکرارپذیر: همان دنباله همیشه همان
 * رنگ. بازیکن باید بتواند بگوید «این رنگ، رنگِ *این وزن* است».
 */
export function resultantMix(colors: readonly string[]): string {
  return clampForDarkStage(subtractiveMix(colors));
}

/**
 * رنگِ «ترکیبِ ناپایدار» — پاسخِ غلط.
 *
 * ⚠️ یک قهوه‌ایِ ثابت نیست. اگر بود، بازیکن بعد از دومین اشتباه دیگر نگاهش
 * نمی‌کرد؛ و مهم‌تر، رنگِ گل‌آلود باید *ردِ موادِ خودش* را داشته باشد تا حس
 * «ترکیبِ من خراب شد» بدهد و نه «برنامه یک تصویرِ خطا نشان داد».
 *
 * پس از همان ترکیبِ جذبی شروع می‌شود و سه کار رویش انجام می‌شود:
 *   ۱) اشباع به‌شدت پایین می‌آید (ولی صفر نمی‌شود — ته‌رنگ می‌ماند)
 *   ۲) روشنایی به یک بازهٔ تیره‌تر و باریک‌تر می‌رود
 *   ۳) کمی به‌سمتِ خنثایِ گرم کشیده می‌شود، چون رسوبِ گِل‌مانند در ذهنِ
 *      همه گرم است و نه سرد
 */
const MUD_CHROMA_KEEP = 0.3;
/** کف و سقفِ اشباعِ حالتِ گل‌آلود. کف صفر نیست — ته‌رنگِ مواد باید بماند. */
const MUD_MIN_C = 0.028;
const MUD_MAX_C = 0.055;
const MUD_MIN_L = 0.36;
const MUD_MAX_L = 0.5;
/** خنثای گرم در OKLab — a و b کوچک و مثبت. */
const MUD_TINT = { a: 0.009, b: 0.013 };

export function muddyMix(colors: readonly string[]): string {
  const lab = hexToOklab(subtractiveMix(colors));
  const L = Math.min(MUD_MAX_L, Math.max(MUD_MIN_L, lab.L * 0.72));

  /* ⚠️ اول اشباع به بازهٔ گل‌آلود برده می‌شود و *بعد* ته‌رنگِ گرم اضافه
     می‌شود، نه برعکس. نسخهٔ اول این دو را میانگین می‌گرفت و برای رنگ‌هایی
     که فامشان مقابلِ ته‌رنگ بود، دو جمله همدیگر را حذف می‌کردند و نتیجه
     خاکستریِ کامل می‌شد — همان «قهوه‌ایِ ثابت»ی که نمی‌خواستیم. */
  const chroma = Math.hypot(lab.a, lab.b);
  const target = Math.min(MUD_MAX_C, Math.max(MUD_MIN_C, chroma * MUD_CHROMA_KEEP));
  const k = chroma > 1e-6 ? target / chroma : 0;

  return oklabToHex({ L, a: lab.a * k + MUD_TINT.a, b: lab.b * k + MUD_TINT.b });
}

/**
 * سطحِ روشن‌ترِ مایع (هلال/منیسک) و کفِ تیره‌ترش.
 *
 * ⚠️ چرا اینجا و نه در CSS با `color-mix`: `color-mix(in oklch, …)` بینِ دو
 * فامِ دور از کوتاه‌ترین کمان رد می‌شود و یک فامِ سومِ بی‌ربط می‌سازد —
 * همان اشتباهی که `--pattern-color` در `globals.css` یک بار مرتکب شد و
 * الگوی طلاییِ سایت را زیتونی کرد. اینجا فقط روشنایی عوض می‌شود و فام
 * دست‌نخورده می‌ماند.
 */
export function liquidShades(hex: string): { top: string; base: string; deep: string } {
  const lab = hexToOklab(hex);
  const shift = (dl: number) => oklabToHex({ L: clamp01(lab.L + dl), a: lab.a, b: lab.b });
  return { top: shift(0.09), base: hex, deep: shift(-0.13) };
}
