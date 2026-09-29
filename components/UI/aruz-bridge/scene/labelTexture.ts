import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   نامِ رکن، پخته روی بافت — یک بار برای هر متن، نه یک بار برای هر مرحله.
   ═══════════════════════════════════════════════════════════════════════════

   چرا canvas و نه متنِ سه‌بعدی: شکل‌دهیِ خطِ فارسی (اتصال، شکلِ آغازی و
   پایانی، راست‌به‌چپ) را همان موتورِ متنی انجام دهد که بقیهٔ سایت را می‌کشد.

   ⚠️ دو ایرادِ نسخهٔ پیشین که هر دو «لگ» می‌ساختند:

     ۱. بافت با هر مرحله از نو ساخته می‌شد — درست در لحظه‌ای که پرسش ظاهر
        می‌شود. یک بومِ ۱۰۲۴ پیکسلی با `shadowBlur` روی گوشی ده‌ها میلی‌ثانیه
        طول می‌کشد، به‌علاوهٔ بارگذاری روی GPU و ساختِ mipmap. یعنی دقیقاً در
        حساس‌ترین لحظهٔ بازی یک فریمِ گمشده.
     ۲. خانوادهٔ قلم با نامِ «Vazirmatn» خواسته می‌شد، ولی next/font نامِ قلم
        را درهم‌سازی می‌کند؛ بوم آن نام را نمی‌شناخت و بی‌صدا به قلمِ سیستم
        برمی‌گشت.

   حالا: متن‌های یک دور پیش از شروع (حینِ شمارشِ معکوس) پخته و به GPU فرستاده
   می‌شوند و در یک کَشِ سطحِ ماژول می‌مانند. قلم از متغیرِ CSSـی خوانده می‌شود
   که next/font تعریف کرده، و تا بارگذاریِ واقعی‌اش صبر می‌شود.

   ── بسته‌بندیِ کانال‌ها ─────────────────────────────────────────────────────
   بوم *مات* است (زمینهٔ سیاه): کانالِ قرمز خودِ حروف است و کانالِ سبز هالهٔ
   نرمِ دورشان. شیدرِ برچسب رنگ‌ها را از uniform می‌گیرد، پس «درست»، «غلط»،
   hover و تمِ روشن/تیره همه با *همین یک بافت* ساخته می‌شوند. زمینهٔ مات هم
   عمدی است: در بافتِ شفاف، مرورگر رنگ را در آلفا ضرب می‌کند و اطلاعاتِ کانالِ
   سبز در لبه‌ها از دست می‌رفت.
   ═══════════════════════════════════════════════════════════════════════════ */

export const LABEL_ASPECT = 2.4;
const WIDTH = 640;
const HEIGHT = Math.round(WIDTH / LABEL_ASPECT);

const cache = new Map<string, THREE.CanvasTexture>();
const pending = new Map<string, Promise<THREE.CanvasTexture | null>>();
/** بیش از این بافت در حافظه نمی‌ماند؛ یک دور حداکثر چند ده متنِ یکتا دارد. */
const MAX_CACHED = 48;

let fontPromise: Promise<string> | null = null;

/** خانوادهٔ قلمِ نمایشی، همان‌طور که next/font نام‌گذاری‌اش کرده. */
function resolveFontFamily(): Promise<string> {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    const style = getComputedStyle(document.body);
    const pick = (v: string) => style.getPropertyValue(v).trim();
    // مربّع: تیترِ ساختاری و خوش‌تراش؛ وزیرمتن اگر مربّع در دسترس نبود.
    const morabba = pick("--font-morabba");
    const vazir = pick("--font-vazirmatn");
    const family = [morabba, vazir, '"Noto Naskh Arabic"', "system-ui", "sans-serif"]
      .filter(Boolean)
      .join(", ");
    try {
      await Promise.race([
        document.fonts.load(`700 96px ${family}`, "فاعلاتن"),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* قلمِ جایگزین هم متن را درست شکل می‌دهد */
    }
    return family;
  })();
  return fontPromise;
}

function draw(text: string, family: string): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // اندازهٔ قلم تا جایی که متن در ۸۴٪ پهنا جا شود؛ چندرکنی‌ها کوچک‌تر می‌شوند.
  let size = Math.round(HEIGHT * 0.58);
  for (let i = 0; i < 16; i++) {
    ctx.font = `700 ${size}px ${family}`;
    if (ctx.measureText(text).width <= WIDTH * 0.84) break;
    size = Math.round(size * 0.92);
  }

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + size * 0.06;

  /* هاله در کانالِ سبز: فقط سایهٔ حروف کشیده می‌شود، خودِ حروف بیرون از بوم‌اند. */
  ctx.save();
  ctx.shadowColor = "rgb(0,255,0)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetX = WIDTH * 4;
  ctx.fillStyle = "#0f0";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0f0";
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, cx - WIDTH * 4, cy);
  ctx.fillText(text, cx - WIDTH * 4, cy);
  ctx.restore();

  // حروف در کانالِ قرمز، روی هاله جمع می‌شوند و آن را پاک نمی‌کنند
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#f00";
  ctx.fillText(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace; // داده است، نه رنگ
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** اگر همین حالا در کَش است، بی‌درنگ برمی‌گردد. */
export function peekLabelTexture(text: string): THREE.CanvasTexture | null {
  return cache.get(text) ?? null;
}

/** بافتِ یک متن؛ اولین بار ساخته و از آن به بعد از کَش خوانده می‌شود. */
export function loadLabelTexture(text: string): Promise<THREE.CanvasTexture | null> {
  const hit = cache.get(text);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(text);
  if (inflight) return inflight;
  if (typeof document === "undefined") return Promise.resolve(null);

  const p = resolveFontFamily().then((family) => {
    pending.delete(text);
    const texture = draw(text, family);
    if (!texture) return null;
    cache.set(text, texture);
    // کهنه‌ترین را بیرون بگذار؛ Map ترتیبِ درج را نگه می‌دارد.
    while (cache.size > MAX_CACHED) {
      const [oldest, old] = cache.entries().next().value as [string, THREE.CanvasTexture];
      cache.delete(oldest);
      old.dispose();
    }
    return texture;
  });
  pending.set(text, p);
  return p;
}

/**
 * متن‌های یک دور را از پیش می‌پزد و روی GPU می‌فرستد.
 *
 * بینِ متن‌ها به مرورگر نفس می‌دهد (`requestIdleCallback` یا یک تایمرِ صفر)،
 * پس شمارشِ معکوس حتی روی گوشیِ ضعیف هم روان می‌ماند.
 */
export function prewarmLabels(texts: readonly string[], renderer?: THREE.WebGLRenderer): () => void {
  let cancelled = false;
  const queue = [...new Set(texts)].filter((t) => !cache.has(t));
  const idle =
    typeof window !== "undefined" && "requestIdleCallback" in window
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 120 })
      : (cb: () => void) => window.setTimeout(cb, 0);

  const next = () => {
    if (cancelled) return;
    const text = queue.shift();
    if (text === undefined) return;
    void loadLabelTexture(text).then((texture) => {
      if (cancelled) return;
      if (texture && renderer) renderer.initTexture(texture);
      idle(next);
    });
  };
  idle(next);
  return () => {
    cancelled = true;
  };
}
