import { test } from "node:test";
import assert from "node:assert/strict";

import { clampForDarkStage, liquidShades, muddyMix, parseHex, resultantMix, subtractiveMix, toHex } from "@/lib/kimia/mix";
import { KIMIA_METERS } from "@/lib/kimia/catalog";
import { sequenceColors } from "@/lib/kimia/visuals";

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function oklab(hex: string): { L: number; a: number; b: number } {
  const { r, g, b } = parseHex(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const chroma = (hex: string) => {
  const { a, b } = oklab(hex);
  return Math.hypot(a, b);
};
const hue = (hex: string) => {
  const { a, b } = oklab(hex);
  return Math.atan2(b, a);
};
/** اختلافِ زاویهٔ فام، با پیچشِ درست دورِ ‎±π. */
function hueGap(x: string, y: string): number {
  let d = Math.abs(hue(x) - hue(y));
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

test("رفت‌وبرگشتِ هگز", () => {
  assert.equal(toHex(parseHex("#58d7f1")), "#58d7f1");
  assert.equal(toHex(parseHex("58D7F1")), "#58d7f1");
  assert.equal(toHex(parseHex("#abc")), "#aabbcc");
  assert.equal(toHex(parseHex("نه‌هگز")), "#000000");
});

test("قطعی است: همان دنباله همیشه همان رنگ", () => {
  for (const meter of KIMIA_METERS) {
    const colors = sequenceColors(meter.canonical);
    assert.equal(resultantMix(colors), resultantMix(colors));
    assert.equal(muddyMix(colors), muddyMix(colors));
  }
});

test("تکرارِ یک ماده همان ماده می‌ماند و خاکستری نمی‌شود", () => {
  /* ⚠️ تستِ محوریِ مدل. «فعولن فعولن فعولن فعولن» و «مفاعیلن ×۴» وزن‌های
     واقعی‌اند؛ اگر ترکیبشان خاکستری می‌شد، پاداشِ درست‌ترین پاسخِ ممکن یک
     لجنِ بی‌رنگ بود. */
  for (const color of ["#58d7f1", "#c75750", "#9a9258", "#e1cb83"]) {
    for (const n of [1, 2, 3, 4, 8]) {
      const same = Array.from({ length: n }, () => color);
      assert.equal(subtractiveMix(same), color, `${n}× ${color} باید دقیقاً همان بماند`);

      const shown = resultantMix(same);
      // مهارِ نمایشی ممکن است کمی اشباع را بالا ببرد، ولی فام تکان نمی‌خورد.
      assert.ok(hueGap(shown, color) < 0.02, `${n}× ${color}: فام جابه‌جا شد`);
      assert.ok(chroma(shown) >= chroma(color) - 1e-6, `${n}× ${color}: بی‌رنگ شد`);
    }
  }
});

test("ترتیب رنگ را عوض نمی‌کند — ترتیب را داوری می‌سنجد، نه شیمی", () => {
  const a = ["#58d7f1", "#c75750", "#69b054"];
  const b = ["#69b054", "#58d7f1", "#c75750"];
  assert.equal(subtractiveMix(a), subtractiveMix(b));
});

test("هیچ وزنی رنگِ شسته یا نئون نمی‌دهد", () => {
  for (const meter of KIMIA_METERS) {
    const result = resultantMix(sequenceColors(meter.canonical));
    const c = chroma(result);
    const { L } = oklab(result);
    assert.ok(c >= 0.08, `${meter.ark}: نتیجه بی‌رنگ است (${c.toFixed(3)})`);
    assert.ok(c <= 0.17, `${meter.ark}: نتیجه نئون است (${c.toFixed(3)})`);
    assert.ok(L >= 0.55 && L <= 0.86, `${meter.ark}: روشناییِ نتیجه بیرونِ بازه است`);
  }
});

test("دو وزنِ با موادِ متفاوت، دو رنگِ متفاوت", () => {
  /* ⚠️ «مواد»ِ متفاوت و نه «وزن»ِ متفاوت، و این یک محدودیتِ پذیرفته‌شده
     است: `مفاعیلن ×۳` و `مفاعیلن ×۴` از یک مادهٔ واحد ساخته شده‌اند و
     ترکیبشان لاجرم یکی است — همان‌طور که سه قطره و چهار قطره از یک جوهر
     یک رنگ‌اند. تعدادِ جایگاه‌های مخزن خودش آن دو را از هم جدا می‌کند.
     چیزی که *نباید* پیش بیاید، یکی شدنِ رنگِ دو ترکیبِ واقعاً متفاوت است. */
  const seen = new Map<string, string>();
  for (const meter of KIMIA_METERS) {
    const ingredients = [...new Set(meter.canonical)].sort().join("+");
    const color = resultantMix(sequenceColors(meter.canonical));
    const clash = seen.get(color);
    if (clash !== undefined && clash !== ingredients) {
      assert.fail(`${ingredients} و ${clash} رنگِ یکسان می‌دهند`);
    }
    seen.set(color, ingredients);
  }
});

test("ترکیبِ ناپایدار: کم‌اشباع، تیره‌تر، ولی نه یک قهوه‌ایِ ثابت", () => {
  const seen = new Set<string>();
  for (const meter of KIMIA_METERS) {
    const colors = sequenceColors(meter.canonical);
    const mud = muddyMix(colors);
    const clean = resultantMix(colors);
    assert.ok(chroma(mud) < chroma(clean), `${meter.ark}: گل‌آلود باید کم‌اشباع‌تر باشد`);
    assert.ok(oklab(mud).L < oklab(clean).L, `${meter.ark}: گل‌آلود باید تیره‌تر باشد`);
    assert.ok(chroma(mud) > 0.005, `${meter.ark}: ته‌رنگ نباید کاملاً برود`);
    seen.add(mud);
  }
  assert.ok(seen.size > KIMIA_METERS.length / 2, "رنگ‌های گل‌آلود نباید همه یکی باشند");
});

test("مهارِ نمایشی فقط شدت را عوض می‌کند و نه فام", () => {
  for (const hex of ["#101010", "#ffffff", "#7c867f", "#00ff00"]) {
    const clamped = clampForDarkStage(hex);
    if (chroma(hex) > 0.01) assert.ok(hueGap(clamped, hex) < 0.02, `${hex}: فام جابه‌جا شد`);
    const { L } = oklab(clamped);
    assert.ok(L >= 0.55 && L <= 0.86, `${hex}: روشنایی مهار نشد`);
  }
});

test("سایه‌روشنِ مایع، از تیره به روشن مرتب است", () => {
  const { top, base, deep } = liquidShades("#58d7f1");
  assert.equal(base, "#58d7f1");
  assert.ok(oklab(top).L > oklab(base).L);
  assert.ok(oklab(deep).L < oklab(base).L);
  // فام در هر سه یکی است، وگرنه مایع سه‌رنگ به نظر می‌رسد.
  assert.ok(hueGap(top, base) < 0.02);
  assert.ok(hueGap(deep, base) < 0.02);
});

test("دنبالهٔ خالی صفحه را نمی‌شکند", () => {
  assert.equal(subtractiveMix([]), "#000000");
});
