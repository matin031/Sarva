/**
 * قلمِ درسنامه — انتخابِ خودِ خواننده.
 *
 * دوقلوی `lib/theme/palette.ts` است و عمداً همان شکل را دارد: یک فهرست،
 * یک اتریبیوت روی <html>، یک کلیدِ localStorage و یک اسکریپتِ کوچکِ
 * پیش از رنگ‌آمیزی. هر چه آنجا یاد گرفتیم اینجا هم صادق است.
 *
 * ⚠️ خودِ قلم‌ها اینجا نیستند. `app/layout.tsx` آن‌ها را با
 * `next/font/local` تعریف می‌کند و هر کدام یک متغیرِ CSS می‌سازند
 * (`--font-peyda` و …)؛ این فایل فقط *نام* آن متغیرها را می‌داند.
 *
 * ⚠️ این تنظیم فقط درسنامه را عوض می‌کند و نه کلِ سایت. دلیلش ساده است:
 * درسنامه تنها جایی است که کاربر ساعت‌ها *متن می‌خواند*؛ هدر، پنل و
 * بازی‌ها هویتِ تایپوگرافیکِ خودشان را دارند و رها کردنِ آن‌ها به دستِ
 * سلیقهٔ لحظه‌ایِ کاربر یعنی از دست دادنِ آن هویت. قاعدهٔ اعمال در
 * `globals.css` زیرِ `.reading-scope` است و بس.
 */

export const READING_FONTS = [
  {
    id: "site",
    label: "وزیرمتن (پیش‌فرض)",
    /* پیش‌فرضِ سایت؛ نمونه هم با همین قلمِ جاری نشان داده می‌شود. */
    stack: "var(--font-vazirmatn), sans-serif",
  },
  {
    id: "peyda",
    label: "پیدا",
    stack: "var(--font-peyda), var(--font-vazirmatn), sans-serif",
  },
  {
    id: "lahzeh",
    label: "لحظه",
    stack: "var(--font-lahzeh), var(--font-vazirmatn), sans-serif",
  },
  {
    id: "dorna",
    label: "درنا",
    stack: "var(--font-dorna), var(--font-vazirmatn), sans-serif",
  },
  {
    id: "pofak",
    label: "پفک",
    stack: "var(--font-pofak), var(--font-vazirmatn), sans-serif",
  },
] as const;

export type ReadingFontId = (typeof READING_FONTS)[number]["id"];

export const DEFAULT_READING_FONT: ReadingFontId = "site";

export const READING_FONT_STORAGE_KEY = "sarva-reading-font";

/** نمونهٔ متنِ دکمه‌های انتخاب — یک مصرعِ کوتاهِ آشنا، نه «لورم ایپسوم».
 *  قلمِ فارسی را باید با «چشمِ» فارسی دید: کشیده، نقطه و سرکش. */
export const READING_FONT_SAMPLE = "بشنو این نی چون شکایت می‌کند";

export function isReadingFontId(value: unknown): value is ReadingFontId {
  return READING_FONTS.some((font) => font.id === value);
}

/** قلمی که همین حالا روی <html> نشسته است. */
export function readReadingFont(): ReadingFontId {
  if (typeof document === "undefined") return DEFAULT_READING_FONT;
  const current = document.documentElement.dataset.readingFont;
  return isReadingFontId(current) ? current : DEFAULT_READING_FONT;
}

/** برای `useSyncExternalStore`: منبعِ حقیقت خودِ اتریبیوتِ <html> است. */
export function subscribeToReadingFont(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-reading-font"],
  });
  return () => observer.disconnect();
}

/**
 * اعمالِ فوری + ماندگار.
 *
 * مثلِ پالت، نوشتن روی `dataset` کافی است: `--font-reading` یک متغیرِ CSS
 * است و مرورگر خودش درخت را دوباره می‌چیند. هیچ کامپوننتی لازم نیست از
 * قلمِ انتخابی خبر داشته باشد.
 */
export function applyReadingFont(id: ReadingFontId) {
  document.documentElement.dataset.readingFont = id;
  try {
    localStorage.setItem(READING_FONT_STORAGE_KEY, id);
  } catch {
    /* حالتِ خصوصی یا کوکیِ بسته — انتخاب همین نشست اعمال می‌شود و بس. */
  }
}

/**
 * اسکریپتِ مسدودکننده‌ای که پیش از اولین رنگ‌آمیزیِ صفحه اجرا می‌شود.
 *
 * ⚠️ همان دلیلِ `PALETTE_INIT_SCRIPT`، با یک تشدید: پرشِ *قلم* از پرشِ
 * رنگ زشت‌تر است، چون کلِ متن جابه‌جا می‌شود و خط می‌شکند. اگر این تصمیم
 * به یک `useEffect` سپرده می‌شد، خواننده در هر بار باز کردنِ هر درس یک
 * بازچینشِ کاملِ صفحه می‌دید.
 */
export const READING_FONT_INIT_SCRIPT = `(function(){try{var f=localStorage.getItem(${JSON.stringify(
  READING_FONT_STORAGE_KEY,
)});if(${JSON.stringify(
  READING_FONTS.map((font) => font.id),
)}.indexOf(f)>-1)document.documentElement.dataset.readingFont=f}catch(e){}})()`;
