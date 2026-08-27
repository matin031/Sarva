import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   پختنِ متنِ فارسی روی یک بافت.
   ═══════════════════════════════════════════════════════════════════════════

   چرا canvas و نه یک راهکارِ متنِ سه‌بعدی مثلِ troika؟ چون شکل‌دهیِ خطِ فارسی
   کارِ ساده‌ای نیست: حروف باید به هم بچسبند، شکلِ آغازین/میانی/پایانی بگیرند
   و راست‌به‌چپ چیده شوند. `canvas.fillText` این کار را به موتورِ متنِ خودِ
   سیستم می‌سپارد — همان موتوری که بقیهٔ سایت با آن درست رندر می‌شود — پس
   خروجی همیشه درست شکل گرفته است.

   نتیجه یک بافت است که می‌شود آن را *روی خودِ شیشه* گذاشت: با پرسپکتیوِ کاشی
   کج می‌شود، با آن حرکت می‌کند، و دیگر یک کارتِ شناور در فضای صفحه نیست.

   برای خوانایی در زاویهٔ مورب چند کار انجام می‌شود: رزولوشنِ بالا،
   anisotropy، هالهٔ تیره پشتِ حروف، و کششِ عمودیِ بافت (نگاه کنید به
   `GlassLabel`) که کوتاه‌شدنِ ناشی از پرسپکتیو را جبران می‌کند.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TextTextureOptions {
  text: string;
  /** پهنای بافت به پیکسل. ارتفاع از روی `aspect` حساب می‌شود. */
  width?: number;
  /** نسبتِ پهنا به ارتفاعِ بافت. */
  aspect?: number;
  color?: string;
  /** هالهٔ پشتِ حروف — روی شیشهٔ شفاف بدونِ آن، متن گم می‌شود. */
  glow?: string;
  fontWeight?: number;
  fontFamily?: string;
}

/**
 * متن را در یک بافت می‌پزد و اندازهٔ منطقیِ آن را هم برمی‌گرداند.
 *
 * فراخوان باید `dispose()` را صدا بزند؛ بافت روی GPU می‌ماند.
 */
export function createTextTexture({
  text,
  width = 1024,
  aspect = 2.6,
  color = "#f2fdff",
  glow = "rgba(2, 18, 26, 0.92)",
  fontWeight = 800,
  fontFamily = 'Vazirmatn, "Noto Naskh Arabic", system-ui, sans-serif',
}: TextTextureOptions): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const height = Math.round(width / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  // راست‌به‌چپ را به خودِ موتورِ متن می‌سپاریم؛ `center` هم قرینه‌سازیِ
  // دستیِ مختصات را لازم نمی‌کند.
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // اندازهٔ قلم را تا جایی بزرگ می‌کنیم که متن در پهنای بافت جا شود.
  let fontSize = Math.round(height * 0.62);
  const maxTextWidth = width * 0.86;
  for (let i = 0; i < 14; i++) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxTextWidth) break;
    fontSize = Math.round(fontSize * 0.92);
  }

  const cx = width / 2;
  const cy = height / 2;

  /* هاله در چند لایه کشیده می‌شود: روی شیشهٔ شفاف که پشتش تهیِ تاریک یا
     بازتابِ روشن است، یک سایهٔ تک‌لایه کافی نیست و متن جاهایی گم می‌شود. */
  ctx.shadowColor = glow;
  ctx.shadowBlur = fontSize * 0.55;
  ctx.fillStyle = glow;
  for (let i = 0; i < 3; i++) ctx.fillText(text, cx, cy);

  // خطِ دورِ حروف، برای جداکردنِ قطعیِ متن از هر پس‌زمینه‌ای
  ctx.shadowBlur = 0;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, fontSize * 0.075);
  ctx.strokeStyle = "rgba(3, 22, 30, 0.95)";
  ctx.strokeText(text, cx, cy);

  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // بافت در زاویهٔ مورب دیده می‌شود؛ بدونِ این، حروف در دوردست له می‌شوند.
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
