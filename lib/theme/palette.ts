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
  { id: "lilac", label: "یاسی" },
  { id: "mint", label: "نعنایی" },
  { id: "sky", label: "آسمانی" },
  { id: "pistachio", label: "پسته‌ای" },
  { id: "peach", label: "هلویی" },
  { id: "rose", label: "رز" },
  { id: "saffron", label: "زعفرانی" },
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
 * عوض کردنِ پالت با جلوه: رنگِ تازه مثلِ جوهر از نقطهٔ کلیک روی صفحه پخش
 * می‌شود و صفحهٔ قبلی زیرش کمی محو و بی‌رنگ می‌شود.
 *
 * ⚠️ عمداً همان دایرهٔ تیزِ کلیدِ روشن/تاریک نیست. آن جلوه مالِ تم است؛ اگر
 * پالت هم همان را داشت، کاربر دو کلید با یک حس می‌دید. اینجا لبهٔ دایره نرم
 * است (ماسکِ radial با لبهٔ محو) و به‌جای clip-path، اندازهٔ ماسک بزرگ می‌شود.
 *
 * بی‌جلوه، همان `applyPalette` است: مرورگرِ بدونِ View Transitions، کاربرِ
 * reduced-motion، و انتخابِ دوبارهٔ پالتِ فعلی.
 */
export function switchPalette(id: PaletteId, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  if (readPalette() === id) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) {
    applyPalette(id);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  // قطری که دورترین گوشه را هم بپوشاند، به‌اضافهٔ لبهٔ نرم.
  const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const size = reach * 2 / 0.7;

  root.dataset.paletteSwitching = "";
  const transition = document.startViewTransition(() => applyPalette(id));

  transition.ready
    .then(() => {
      const timing = { duration: 850, easing: "cubic-bezier(.65,0,.35,1)" };
      root.animate(
        {
          maskSize: ["0px 0px", `${size}px ${size}px`],
          maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`],
        },
        { ...timing, pseudoElement: "::view-transition-new(root)" },
      );
      root.animate(
        { filter: ["none", "saturate(0.4) blur(2px)"] },
        { ...timing, pseudoElement: "::view-transition-old(root)" },
      );
    })
    .catch(() => {});

  transition.finished.finally(() => {
    delete root.dataset.paletteSwitching;
  });
}

/**
 * رنگ‌های پالتِ فعلی به هگز، برای کتابخانه‌هایی مثلِ canvas-confetti که
 * متغیرِ CSS نمی‌فهمند. بدونِ این، کاغذرنگی‌ها در هر پالتی فیروزه‌ای بودند.
 */
export function paletteHexColors(extra: string[] = []): string[] {
  const fallback = ["#008687", "#00a5a6", "#d4a941", "#f1d38a"];
  if (typeof document === "undefined") return [...fallback, ...extra];
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [...fallback, ...extra];
  const cs = getComputedStyle(document.documentElement);
  const toHex = (token: string, fb: string) => {
    const css = cs.getPropertyValue(token).trim();
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = fb;
    if (css) ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  return [
    toHex("--primary", fallback[0]),
    toHex("--logo-1", fallback[1]),
    toHex("--gold", fallback[2]),
    toHex("--gold-light", fallback[3]),
    toHex("--lapis-light", fallback[0]),
    ...extra,
  ];
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
