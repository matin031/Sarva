/**
 * پالت‌های رنگیِ سروا.
 *
 * رنگ‌ها اینجا نیستند — در `app/globals.css` زیرِ `[data-palette="…"]`
 * زندگی می‌کنند. این فایل فقط *فهرست* است: چه پالت‌هایی هست، اسمِ فارسی‌شان
 * چیست، و مقدارِ ذخیره‌شده چطور خوانده و نوشته می‌شود.
 *
 * ⚠️ چرا رنگ اینجا تکرار نشده: اگر هم در CSS و هم در TS می‌بود، هر تغییرِ
 * رنگ دو جا لازم داشت و دیر یا زود یکی‌شان جا می‌ماند. تنها استثنا
 * دایره‌های نمونهٔ دکمهٔ انتخاب است که ناچار در CSS تکرار شده‌اند
 * (`.pal-swatch[data-pal]`) چون باید رنگِ پالتِ *غیرفعال* را نشان بدهند.
 */

export const PALETTES = [
  { id: "turquoise", label: "فیروزه‌ای" },
  { id: "mint", label: "نعنایی" },
  { id: "lilac", label: "یاسی" },
  { id: "peach", label: "هلویی" },
  { id: "pistachio", label: "پسته‌ای" },
  { id: "sky", label: "آسمانی" },
  { id: "galaxy", label: "کهکشانی" },
  { id: "sunset", label: "غروب" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "turquoise";

export const PALETTE_STORAGE_KEY = "sarva-palette";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}

/** پالتی که همین حالا روی <html> نشسته است. */
export function readPalette(): PaletteId {
  if (typeof document === "undefined") return DEFAULT_PALETTE;
  const current = document.documentElement.dataset.palette;
  return isPaletteId(current) ? current : DEFAULT_PALETTE;
}

/** برای `useSyncExternalStore`: منبعِ حقیقت خودِ اتریبیوتِ <html> است. */
export function subscribeToPalette(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-palette"],
  });
  return () => observer.disconnect();
}

/**
 * اعمالِ فوری + ماندگار.
 *
 * نوشتن روی `dataset` کافی است: کلِ رنگ‌ها متغیرِ CSS‌اند و مرورگر خودش
 * درخت را دوباره رنگ می‌کند. هیچ رندرِ دوبارهٔ ری‌اکتی لازم نیست و هیچ
 * کامپوننتی نباید از پالت خبر داشته باشد.
 */
export function applyPalette(id: PaletteId) {
  document.documentElement.dataset.palette = id;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    /* حالتِ خصوصی یا کوکیِ بسته — انتخاب همین نشست اعمال می‌شود و بس. */
  }
}

/**
 * اسکریپتِ مسدودکننده‌ای که پیش از اولین رنگ‌آمیزیِ صفحه اجرا می‌شود.
 *
 * ⚠️ بدونِ این، سرور همیشه `turquoise` می‌فرستد و پالتِ ذخیره‌شده تازه بعد
 * از hydration اعمال می‌شد — یعنی یک پرشِ رنگِ کاملاً قابلِ دیدن در هر بار
 * باز کردنِ هر صفحه. رشته عمداً کوچک و بدونِ وابستگی است تا در همان
 * `<script>` درون‌خطی جا شود.
 *
 * در `try` است چون در حالتِ خصوصیِ بعضی مرورگرها صرفِ *خواندنِ*
 * localStorage استثنا پرت می‌کند؛ آن‌وقت بی‌سروصدا روی پیش‌فرض می‌ماند.
 */
export const PALETTE_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  PALETTE_STORAGE_KEY,
)});if(${JSON.stringify(
  PALETTES.map((palette) => palette.id),
)}.indexOf(p)>-1)document.documentElement.dataset.palette=p}catch(e){}})()`;
