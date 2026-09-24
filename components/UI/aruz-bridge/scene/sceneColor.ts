import * as THREE from "three";

/* رنگِ صحنه از توکنِ سایت.
 *
 * three رنگِ CSS را نمی‌فهمد و پالتِ سروا در `oklch` نوشته شده، پس
 * `useTokenRgb` اول آن را به «r,g,b» حل می‌کند و این تابع از آنجا به بعد را
 * می‌سازد.
 *
 * ⚠️ چرا سه پارامتر و نه فقط یک ضریب: نسخهٔ اولِ این کار هر رنگ را فقط در یک
 * عددِ کوچک‌تر از یک ضرب می‌کرد. نتیجه این شد که کلِ پل *یک فام* گرفت —
 * تیرها، شیشه، کاراکتر و مه همه یک سبزِ تیره — و عمقی که صحنه از تضادِ
 * «سازهٔ سردِ کم‌فام / شیشهٔ فیروزه‌ای / طلاییِ چراغ» می‌گرفت از بین رفت.
 * ضرب فقط بلد است تیره کند.
 *
 *   k  < ۱ → تیره‌تر.   k > ۱ → به‌سمتِ سفید (نور و مه، نه یک فامِ پررنگ‌تر).
 *   desat  → به‌سمتِ خاکستریِ هم‌روشنایی؛ همان چیزی که فلز را فلز نشان می‌دهد.
 */
export function sceneColor(rgb: string, k = 1, desat = 0): THREE.Color {
  const [r, g, b] = rgb.split(",").map(Number);
  const c = new THREE.Color(r / 255, g / 255, b / 255);
  if (desat > 0) {
    const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
    c.lerp(new THREE.Color(l, l, l), desat);
  }
  if (k > 1) c.lerp(new THREE.Color(1, 1, 1), Math.min(1, k - 1));
  else c.multiplyScalar(k);
  return c.convertSRGBToLinear();
}

/** همان منطق، ولی خروجیِ `rgba()` برای بومِ 2D نقشهٔ محیطی. */
export function cssColor(rgb: string, k = 1, desat = 0, alpha = 1): string {
  const c = sceneColor(rgb, k, desat).convertLinearToSRGB();
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${alpha})`;
}
