import { test } from "node:test";
import assert from "node:assert/strict";

import { KIMIA_FOOT_CATALOG, footPattern } from "@/lib/kimia/catalog";
import { FOOT_VISUALS, footColor, footVisual, missingVisuals } from "@/lib/kimia/visuals";

/* ═══════════════════════════════════════════════════════════════════════════
   این فایل پالت را *می‌سنجد* و نه صرفاً وجودش را.
   ═══════════════════════════════════════════════════════════════════════════

   شانزده رنگ روی یک زمینهٔ تیره، با چشم قابلِ داوری نیست: دو رنگی که کنارِ
   هم واضح‌اند ممکن است زیرِ دوترانوپی یکی شوند، و رنگی که «قشنگ» است ممکن
   است بیرونِ گاموتِ sRGB بیفتد و مرورگر بی‌صدا کلیپش کند.

   پس آستانه‌ها اینجا نوشته شده‌اند و عوض کردنِ یک هگز بدونِ گذراندنِ این
   تست ممکن نیست. اعداد از اندازه‌گیریِ خودِ پالتِ امروز آمده‌اند و کمی
   پایین‌تر گذاشته شده‌اند تا تستِ شکننده نشود.
   ═══════════════════════════════════════════════════════════════════════════ */

const DARK_BG = "#0b121d"; // --card در تمِ تیره
const LIGHT_BG = "#f7f3ea"; // کرمِ تمِ روشن
const SARVA_TEAL = ["#00a5a6", "#008687"];

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

function hexToLinear(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  assert.ok(m, `هگزِ نامعتبر: ${hex}`);
  const n = parseInt(m![1], 16);
  return [
    srgbToLinear(((n >> 16) & 255) / 255),
    srgbToLinear(((n >> 8) & 255) / 255),
    srgbToLinear((n & 255) / 255),
  ];
}

function linearToOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function distance(a: string, b: string): number {
  const [l1, a1, b1] = linearToOklab(hexToLinear(a));
  const [l2, a2, b2] = linearToOklab(hexToLinear(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** شبیه‌سازیِ کوررنگی — ماتریس‌های Viénot–Brettel–Mollon روی RGBِ خطی. */
const CVD = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

function simulate(hex: string, kind: keyof typeof CVD): string {
  const lin = hexToLinear(hex);
  const m = CVD[kind];
  const toSrgb = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  const out = m.map((row) => toSrgb(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
  return `#${out.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

test("نگاشتِ دیداری دقیقاً همان کاتالوگ است — نه کم، نه زیاد", () => {
  assert.deepEqual(missingVisuals(), [], "رکنی روی رَک هست که رنگ ندارد");
  const extra = Object.keys(FOOT_VISUALS).filter((key) => !KIMIA_FOOT_CATALOG.includes(key));
  assert.deepEqual(extra, [], "رنگی هست که هیچ رکنی ندارد");
});

test("هر رکن نشانهٔ هجاییِ خودش را دارد و هیچ دوتایی یکسان نیستند", () => {
  const seen = new Map<string, string>();
  for (const foot of KIMIA_FOOT_CATALOG) {
    const visual = footVisual(foot);
    assert.equal(visual.pattern, footPattern(foot));
    assert.ok(/^[U-]+$/.test(visual.pattern), `${foot}: نشانهٔ نامعتبر`);
    const clash = seen.get(visual.pattern);
    assert.equal(clash, undefined, `${foot} و ${clash} نشانهٔ یکسان دارند`);
    seen.set(visual.pattern, foot);
  }
});

test("هیچ دو رکنی رنگِ یکسان ندارند", () => {
  const seen = new Map<string, string>();
  for (const foot of KIMIA_FOOT_CATALOG) {
    const color = footColor(foot).toLowerCase();
    const clash = seen.get(color);
    assert.equal(clash, undefined, `${foot} و ${clash} هر دو ${color} اند`);
    seen.set(color, foot);
  }
});

test("همهٔ رنگ‌ها روی زمینهٔ شب دیده می‌شوند و روی کرم گم نمی‌شوند", () => {
  for (const foot of KIMIA_FOOT_CATALOG) {
    const color = footColor(foot);
    assert.ok(
      contrast(color, DARK_BG) >= 4.2,
      `${foot} (${color}) روی زمینهٔ تیره کم‌کنتراست است: ${contrast(color, DARK_BG).toFixed(2)}`,
    );
    assert.ok(
      contrast(color, LIGHT_BG) >= 1.4,
      `${foot} (${color}) روی زمینهٔ روشن گم می‌شود: ${contrast(color, LIGHT_BG).toFixed(2)}`,
    );
  }
});

test("هیچ رنگی با فیروزهٔ سروا اشتباه نمی‌شود", () => {
  /* دکمهٔ «آزمایش ترکیب» فیروزهٔ سروا است. اگر یک ماده همان رنگ باشد،
     بازیکن دکمه را یک ویالِ دیگر می‌بیند. */
  for (const foot of KIMIA_FOOT_CATALOG) {
    for (const teal of SARVA_TEAL) {
      assert.ok(
        distance(footColor(foot), teal) >= 0.12,
        `${foot} خیلی به فیروزهٔ سروا نزدیک است`,
      );
    }
  }
});

test("فاصلهٔ ادراکیِ دوبه‌دو، در دیدِ عادی و در سه‌گونهٔ کوررنگی", () => {
  /* ⚠️ آستانه‌ها با سطحِ اتکایِ هر حالت متناسب‌اند و نه یکسان: رنگ *تنها*
     نشانهٔ هویت نیست (نشانهٔ هجایی و برچسبِ فارسی همیشه کنارش هستند)، پس
     هدف «تشخیص‌پذیریِ کامل با رنگ» نیست، «هیچ دو ماده‌ای عملاً یکی به نظر
     نرسند» است. */
  const thresholds: Record<string, number> = {
    normal: 0.09,
    protan: 0.045,
    deutan: 0.03,
    tritan: 0.045,
  };

  for (const [mode, threshold] of Object.entries(thresholds)) {
    let worst = Infinity;
    let worstPair = "";
    for (let i = 0; i < KIMIA_FOOT_CATALOG.length; i++) {
      for (let j = i + 1; j < KIMIA_FOOT_CATALOG.length; j++) {
        const a = footColor(KIMIA_FOOT_CATALOG[i]);
        const b = footColor(KIMIA_FOOT_CATALOG[j]);
        const [x, y] =
          mode === "normal"
            ? [a, b]
            : [simulate(a, mode as keyof typeof CVD), simulate(b, mode as keyof typeof CVD)];
        const d = distance(x, y);
        if (d < worst) {
          worst = d;
          worstPair = `${KIMIA_FOOT_CATALOG[i]} / ${KIMIA_FOOT_CATALOG[j]}`;
        }
      }
    }
    assert.ok(
      worst >= threshold,
      `${mode}: نزدیک‌ترین جفت ${worstPair} با فاصلهٔ ${worst.toFixed(4)} زیرِ آستانهٔ ${threshold}`,
    );
  }
});

test("رکنِ ناشناخته صفحه را نمی‌شکند", () => {
  const visual = footVisual("رکنِ خیالی");
  assert.ok(/^#[0-9a-f]{6}$/i.test(visual.color));
  assert.equal(visual.pattern, "");
});
