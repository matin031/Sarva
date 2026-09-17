"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   رنگ‌های صحنه، از توکن‌های خودِ سروا.
   ═══════════════════════════════════════════════════════════════════════════

   ── مسئله ────────────────────────────────────────────────────────────────

   سروا دو تم و هشت پالت دارد — شانزده ترکیب. رنگ‌ها در `app/globals.css` و
   به‌صورتِ `oklch()` و `color-mix()` نوشته شده‌اند و بعضی‌شان *فرمول*اند و
   نه مقدار.

   three هیچ‌کدام از این‌ها را نمی‌فهمد: `THREE.Color` فقط hex و rgb و نامِ
   رنگ‌های CSS را می‌شناسد. نوشتنِ یک جدولِ رنگِ دوم در TypeScript هم دقیقاً
   همان چیزی است که صورت‌مسئله منع کرده — و در عمل یعنی هر تغییرِ پالت باید
   دو جا انجام شود و یکی‌شان جا می‌ماند.

   ── راهکار ───────────────────────────────────────────────────────────────

   مرورگر خودش حساب کند.

   هر رنگِ صحنه به‌صورتِ یک *عبارتِ CSS* تعریف می‌شود که به توکن‌های سروا
   ارجاع می‌دهد (مثلاً `color-mix(in oklch, var(--card) 88%, var(--foreground))`).
   بعد یک عنصرِ آزمایشی آن عبارت را می‌گیرد، `getComputedStyle` آن را به یک
   رنگِ مطلق تبدیل می‌کند، و یک بومِ ۱×۱ همان را به سه بایتِ sRGB می‌پزد.

   ⚠️ چرا بوم و نه تجزیهٔ رشته: مقدارِ محاسبه‌شده در مرورگرهای امروز
   `oklab(…)` یا `color(srgb …)` برمی‌گردد و نه همیشه `rgb(…)`. نوشتنِ
   تجزیه‌گر برای آن‌ها یعنی پیاده‌سازیِ دوبارهٔ فضای رنگِ CSS. بوم همان کار
   را با موتورِ خودِ مرورگر می‌کند و برای هر نحوی که مرورگر بفهمد جواب
   می‌دهد — از جمله هر نحوِ تازه‌ای که فردا اضافه شود.

   نتیجه: پالتِ جدید در CSS اضافه شود، بازی بدونِ یک خط تغییر با آن هماهنگ
   است.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";

/** هر کلید یک نقشِ دیداری در صحنه است، نه یک رنگِ خاص. */
export interface ScenePalette {
  /** رویهٔ آجرها. */
  wallFace: string;
  /** بندکشیِ فرورفتهٔ بینِ آجرها. */
  wallMortar: string;
  /** لبهٔ روشنِ بالای هر آجر — همان چیزی که دیوار را برجسته نشان می‌دهد. */
  wallHighlight: string;
  /** کنارهٔ ضخامتِ دیوار. */
  wallEdge: string;
  /** طاقچه. */
  shelf: string;
  /** کف. */
  floor: string;
  /** جوهرِ نشانِ کنده‌کاری‌شده. */
  logoInk: string;
  /** ذراتِ معلق. */
  particle: string;
  /** هالهٔ کتابِ زیرِ اشاره‌گر. */
  hover: string;
  /** پاسخِ درست. */
  correct: string;
  /** پاسخِ نادرست. */
  wrong: string;
  /** نورِ اصلی. */
  keyLight: string;
  /** نورِ پرکننده و محیطی. */
  fillLight: string;
  /** مهِ عمق — همرنگِ زمینه، وگرنه لبهٔ دیوار لو می‌رود. */
  fog: string;
  /** آیا تمِ تیره فعال است؟ شدتِ نور از این تصمیم می‌گیرد. */
  dark: boolean;
}

/* ── عبارت‌های CSS ─────────────────────────────────────────────────────────

   ⚠️ هیچ هگزی اینجا نیست و این عمدی است. هر مقدار یا خودِ یک توکنِ سرواست
   یا ترکیبی از دو توکن. پس «تمِ تیره» جداگانه تعریف نشده — همان فرمول‌ها
   وقتی `--background` و `--foreground` جا عوض می‌کنند، خودشان برمی‌گردند.

   دو جا از `--gold` استفاده شده و نه از `--primary`: طلایی در هر هشت پالت
   یک لهجهٔ گرم است و کتاب‌های قهوه‌ایِ چرمی را بهتر از رنگِ اصلی می‌نشاند. */
const EXPRESSIONS: Record<keyof Omit<ScenePalette, "dark">, string> = {
  /* دیوار کمی از کارت تیره‌تر است تا کتاب‌ها روی آن جدا شوند، ولی جنسش
     همان کاغذِ سروا می‌ماند. */
  wallFace: "color-mix(in oklch, var(--card) 84%, var(--foreground))",
  /* بند باید محسوس باشد وگرنه دیوار یک سطحِ یکدست می‌شود، ولی نه آن‌قدر
     که به شبکهٔ سیاه تبدیل شود. */
  wallMortar: "color-mix(in oklch, var(--card) 58%, var(--foreground))",
  wallHighlight: "color-mix(in oklch, var(--card) 96%, var(--background))",
  wallEdge: "color-mix(in oklch, var(--card) 70%, var(--foreground))",
  shelf: "color-mix(in oklch, var(--paper) 80%, var(--foreground))",
  floor: "color-mix(in oklch, var(--background) 93%, var(--foreground))",
  /* نشان از توکنِ خودش می‌آید، پس با پالت عوض می‌شود — دقیقاً مثلِ نشانِ
     بالای صفحه. */
  logoInk: "var(--logo-2)",
  particle: "color-mix(in oklch, var(--primary) 70%, var(--gold))",
  hover: "var(--primary)",
  correct: "var(--primary)",
  /* ⚠️ `--destructive` عمداً استفاده *نشده*. زمین‌خوردنِ این بازی کمدی است و
     نه خطا؛ قرمزِ هشدار لحنش را عوض می‌کرد. طلاییِ تیره‌تر همان «آخ» را
     می‌گوید بدونِ آنکه بازیکن حس کند چیزی خراب شده. */
  wrong: "color-mix(in oklch, var(--gold) 76%, var(--foreground))",
  keyLight: "color-mix(in oklch, var(--background) 30%, white)",
  fillLight: "color-mix(in oklch, var(--primary) 26%, var(--background))",
  fog: "var(--background)",
};

/** اگر مرورگر عبارتی را نفهمید، صحنه نباید سیاه شود. */
const FALLBACK: ScenePalette = {
  wallFace: "#d9d3c6",
  wallMortar: "#a89f8e",
  wallHighlight: "#efeae0",
  wallEdge: "#c2bbac",
  shelf: "#c9c0ad",
  floor: "#e8e3d8",
  logoInk: "#00abb5",
  particle: "#3fa8a8",
  hover: "#008687",
  correct: "#008687",
  wrong: "#a98338",
  keyLight: "#fffaf0",
  fillLight: "#cfe0e0",
  fog: "#f5f2ea",
  dark: false,
};

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * عبارت‌ها را به هگز تبدیل می‌کند.
 *
 * یک بار در هر تغییرِ تم اجرا می‌شود و نه در هر فریم — همهٔ رنگ‌ها با یک
 * عنصرِ آزمایشی و یک بوم حل می‌شوند.
 */
export function readScenePalette(host?: HTMLElement | null): ScenePalette {
  if (typeof document === "undefined") return FALLBACK;

  const probe = document.createElement("span");
  /* ⚠️ `display:none` نه: بعضی مرورگرها برای عنصرِ بدونِ جعبه `color` را
     حل نمی‌کنند. پنهان‌کردنِ بی‌خطر یعنی عنصری که جا نمی‌گیرد و دیده
     نمی‌شود ولی هنوز سبک می‌گیرد. */
  probe.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
  probe.setAttribute("aria-hidden", "true");
  (host ?? document.body).appendChild(probe);

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    ctx = null;
  }

  const out: Record<string, string> = {};
  for (const [key, expression] of Object.entries(EXPRESSIONS)) {
    out[key] = FALLBACK[key as keyof typeof EXPRESSIONS];
    if (!ctx) continue;
    try {
      probe.style.color = "";
      probe.style.color = expression;
      const computed = getComputedStyle(probe).color;
      if (!computed) continue;

      /* اگر مرورگر نحوِ رنگ را نشناسد، `fillStyle` بی‌صدا مقدارِ قبلی را
         نگه می‌دارد. با نشاندنِ یک نگهبانِ شناخته‌شده پیش از آن، می‌شود
         فهمید که واقعاً چیزی نوشته شد یا نه. */
      ctx.fillStyle = "#000000";
      ctx.fillStyle = computed;
      if (ctx.fillStyle === "#000000" && !/^(rgba?\(0,\s*0,\s*0|#000)/.test(computed)) continue;

      ctx.clearRect(0, 0, 1, 1);
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      out[key] = rgbToHex(r, g, b);
    } catch {
      /* مقدارِ پیش‌فرض سرِ جایش می‌ماند. */
    }
  }

  probe.remove();

  return {
    ...(out as unknown as Omit<ScenePalette, "dark">),
    dark: document.documentElement.classList.contains("dark"),
  };
}

/* ── اشتراکِ تغییرِ تم ─────────────────────────────────────────────────────

   ⚠️ چرا `useSyncExternalStore` و نه یک effect با `setState`:
   تمِ سروا می‌تواند *پیش از* سوارشدنِ بازی عوض شده باشد (اسکریپتِ کوچکِ
   `lib/theme/palette.ts` آن را در `<head>` می‌نشاند). خواندن در effect یعنی
   یک فریمِ اولِ با رنگِ غلط و بعد یک رندرِ دوم. این قلّاب همان اولین رندر
   مقدارِ درست را می‌دهد.

   همان الگوی `lib/immersive-mode.ts` و `lib/theme/palette.ts`. */

let snapshot: ScenePalette | null = null;
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function invalidate() {
  snapshot = null;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!observer && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(invalidate);
    /* هر دو محورِ تم روی همین یک عنصرند: کلاسِ `dark` و صفتِ `data-palette`.
       صفت‌های دیگر نادیده گرفته می‌شوند تا هر تغییرِ بی‌ربطِ DOM، شانزده
       رنگ را دوباره حساب نکند. */
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-palette"],
    });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
      snapshot = null;
    }
  };
}

function getSnapshot(): ScenePalette {
  /* ⚠️ حافظه لازم است و اختیاری نیست: `useSyncExternalStore` هر بار که
     React همگام‌سازی می‌کند این را صدا می‌زند و باید *همان شیء* برگردد،
     وگرنه هر رندر یک شیء تازه است و حلقهٔ بی‌پایان می‌شود. */
  if (!snapshot) snapshot = readScenePalette();
  return snapshot;
}

function getServerSnapshot(): ScenePalette {
  return FALLBACK;
}

/** رنگ‌های صحنه، همگام با تم و پالتِ جاری. */
export function useScenePalette(): ScenePalette {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
