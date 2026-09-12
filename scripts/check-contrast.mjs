/* بررسیِ کنتراستِ پالت‌های رنگی  —  `npm run check:contrast`
 *
 * app/globals.css را می‌خواند، برای هر (پالت × تم) نقشهٔ توکن‌ها را دقیقاً
 * همان‌طور که آبشارِ CSS می‌سازد بازسازی می‌کند — `:root` → `.dark` → بلوکِ
 * فرمول‌های مشترک → بذرهای پالت — بعد `var()` و
 * `color-mix(in oklch, …)` را حل می‌کند و نسبتِ کنتراستِ WCAG را
 * می‌سنجد.
 *
 * ⚠️ چرا یک اسکریپت و نه یک بررسیِ دستی: رنگ‌های این پالت‌ها *مشتق* هستند.
 * عوض کردنِ یک بذر (مثلاً --primary) ده توکنِ دیگر را جابه‌جا می‌کند و
 * چشم نمی‌تواند بگوید کدامشان از ۴٫۵:۱ افتاد. هر پالتِ تازه‌ای که اضافه
 * شد، اول این را اجرا کنید.
 *
 * خروج با کدِ ۱ یعنی دستِ‌کم یک جفت زیرِ حدِ خودش است.
 *
 * ⚠️ نکتهٔ شناخته‌شده: پالتِ پیش‌فرضِ «فیروزه‌ای» سه مورد زیرِ حد دارد
 * (--primary به‌عنوان متن ۴٫۰۴:۱ و --lapis در تمِ تیره ۲٫۶۷:۱). این‌ها از
 * قبل بوده‌اند و عمداً دست‌نخورده مانده‌اند؛ شش پالتِ دیگر همه قبول‌اند. */
import fs from "node:fs";

const css = fs.readFileSync("app/globals.css", "utf8");

/* ---------- tiny top-level rule parser ---------- */
function topLevelRules(src) {
  const rules = [];
  let i = 0;
  while (i < src.length) {
    // skip comments
    if (src.startsWith("/*", i)) {
      i = src.indexOf("*/", i) + 2;
      continue;
    }
    const brace = src.indexOf("{", i);
    if (brace < 0) break;
    let sel = src.slice(i, brace);
    // strip comments inside selector text
    sel = sel.replace(/\/\*[\s\S]*?\*\//g, "").split(";").pop().trim();
    // find matching close brace
    let depth = 1;
    let j = brace + 1;
    while (j < src.length && depth > 0) {
      if (src.startsWith("/*", j)) { j = src.indexOf("*/", j) + 2; continue; }
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    rules.push({ sel, body: src.slice(brace + 1, j - 1) });
    i = j;
  }
  return rules;
}

const rules = topLevelRules(css);
function decls(selector) {
  const rule = rules.find((r) => r.sel === selector);
  if (!rule) throw new Error(`selector not found: ${selector}`);
  const out = {};
  const body = rule.body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const part of body.split(";")) {
    const m = part.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/* ---------- colour maths ---------- */
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** { L, C, H } in OKLCH plus a flag if it needed gamut clipping. */
function parseColor(value) {
  const v = value.trim();
  let m = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.-]+)\s*\)$/i);
  if (m) {
    const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    const C = m[2].endsWith("%") ? (parseFloat(m[2]) / 100) * 0.4 : parseFloat(m[2]);
    return { L, C, H: parseFloat(m[3]) };
  }
  m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const [L, a, b] = linearToOklab(...rgb.map(toLin));
    const C = Math.hypot(a, b);
    return { L, C, H: (Math.atan2(b, a) * 180) / Math.PI };
  }
  throw new Error(`unparsed colour: ${value}`);
}

function toRgb({ L, C, H }) {
  const rad = (H * Math.PI) / 180;
  const lin = oklabToLinear(L, C * Math.cos(rad), C * Math.sin(rad));
  const clipped = lin.some((c) => c < -0.001 || c > 1.001);
  return { rgb: lin.map((c) => Math.min(1, Math.max(0, c))), clipped };
}

function luminance(lin) {
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a, b) {
  const la = luminance(toRgb(a).rgb);
  const lb = luminance(toRgb(b).rgb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function hex({ L, C, H }) {
  const { rgb } = toRgb({ L, C, H });
  return "#" + rgb.map((c) => Math.round(toSrgb(c) * 255).toString(16).padStart(2, "0")).join("");
}

/* ---------- value resolution ---------- */
function splitTop(str) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function resolve(value, tokens, seen = new Set()) {
  let v = value.trim();
  // var(--x) / var(--x, fallback)
  let guard = 0;
  while (v.startsWith("var(")) {
    if (guard++ > 20) throw new Error("var loop");
    const inner = v.slice(4, -1);
    const [name, ...rest] = splitTop(inner);
    if (seen.has(name)) throw new Error(`circular ${name}`);
    if (tokens[name] === undefined) {
      if (rest.length) { v = rest.join(",").trim(); continue; }
      throw new Error(`undefined token ${name}`);
    }
    seen = new Set([...seen, name]);
    v = tokens[name].trim();
  }
  if (/^color-mix\(/i.test(v)) {
    const parts = splitTop(v.slice(v.indexOf("(") + 1, v.lastIndexOf(")")));
    const space = parts[0].trim();
    if (space !== "in oklch") throw new Error(`unsupported mix space: ${space}`);
    const one = parts[1].match(/^([\s\S]+?)\s+([\d.]+)%$/);
    const two = parts[2].match(/^([\s\S]+?)\s+([\d.]+)%$/);
    const cA = resolve(one ? one[1] : parts[1], tokens, seen);
    const cB = resolve(two ? two[1] : parts[2], tokens, seen);
    let pA = one ? parseFloat(one[2]) / 100 : undefined;
    let pB = two ? parseFloat(two[2]) / 100 : undefined;
    if (pA === undefined && pB === undefined) { pA = 0.5; pB = 0.5; }
    else if (pA === undefined) pA = 1 - pB;
    else if (pB === undefined) pB = 1 - pA;
    const sum = pA + pB;
    pA /= sum; pB /= sum;
    // hue: shortest arc, powerless when a side is achromatic
    let hA = cA.H, hB = cB.H;
    if (cA.C < 1e-6) hA = hB;
    if (cB.C < 1e-6) hB = hA;
    let d = ((hB - hA + 540) % 360) - 180;
    return { L: cA.L * pA + cB.L * pB, C: cA.C * pA + cB.C * pB, H: hA + d * pB };
  }
  return parseColor(v);
}

/* ---------- build token maps ---------- */
const base = decls(":root");
const dark = decls(".dark");
const shared = decls(':root[data-palette]:not([data-palette="turquoise"])');
const sharedLight = decls(':root:not(.dark)[data-palette]:not([data-palette="turquoise"])');
const sharedDark = decls(':root.dark[data-palette]:not([data-palette="turquoise"])');

const PALETTES = [
  ["turquoise", "فیروزه‌ای"], ["sky", "آسمانی"], ["lilac", "یاسی"], ["mint", "نعنایی"],
  ["pistachio", "پسته‌ای"], ["peach", "هلویی"], ["rose", "رز"], ["saffron", "زعفرانی"],
];

function tokensFor(id, mode) {
  if (id === "turquoise") {
    return mode === "dark" ? { ...base, ...dark } : { ...base };
  }
  const pal = decls(`:root${mode === "dark" ? ".dark" : ":not(.dark)"}[data-palette="${id}"]`);
  return mode === "dark"
    ? { ...base, ...dark, ...shared, ...sharedDark, ...pal }
    : { ...base, ...shared, ...sharedLight, ...pal };
}

/* text colour → surface it sits on, with the required ratio */
const PAIRS = [
  ["--foreground", "--background", 4.5, "متن اصلی روی زمینه"],
  ["--foreground", "--card", 4.5, "متن اصلی روی کارت"],
  ["--muted-foreground", "--background", 4.5, "متن کم‌رنگ روی زمینه"],
  ["--muted-foreground", "--card", 4.5, "متن کم‌رنگ روی کارت"],
  ["--primary", "--background", 4.5, "رنگ اصلی به‌عنوان متن روی زمینه"],
  ["--primary", "--card", 4.5, "رنگ اصلی به‌عنوان متن روی کارت"],
  ["--gold-ink", "--background", 4.5, "جوهر طلایی روی زمینه"],
  ["--gold-ink", "--card", 4.5, "جوهر طلایی روی کارت"],
  ["--lapis", "--background", 3.0, "لاجورد روی زمینه (آیکون/پرکننده، نه متنِ کوچک — متنش --lapis-light است)"],
  ["--lapis-light", "--background", 4.5, "لاجورد روشن روی زمینه"],
  ["--primary-foreground", "--primary", 4.5, "متن روی دکمهٔ اصلی"],
  ["--accent-foreground", "--accent", 4.5, "متن روی اکسنت"],
  ["--secondary-foreground", "--secondary", 4.5, "متن روی ثانویه"],
  ["--surface", "--background", 1.0, "—"],
  ["--border", "--background", 1.15, "حاشیه روی زمینه (نه متن؛ فقط باید دیده شود)"],

  /* ⚠️ این‌ها سقف‌اند و نه کف. یک لایهٔ تزئینی که *زیادی* دیده شود، به همان
     اندازه اشکال دارد که متنی که کم دیده شود — و چون هیچ ابزاری دنبالش
     نمی‌گردد، تا وقتی کاربر نگوید «چرا یک هاله افتاده روی سایت؟» کسی
     نمی‌فهمد. الگوی هندسی باید حس شود، نه دیده شود.

     ⚠️ و اندازه‌گیری روی *رنگِ ترکیب‌شده* است و نه رنگِ خام. الگو با
     opacity ۰٫۰۶ کشیده می‌شود؛ یک طلاییِ روشن روی زمینهٔ شب خامش ۸:۱ است
     ولی آنچه چشم می‌بیند ۱٫۴:۱ است. سنجیدنِ رنگِ خام، عدد را بی‌معنی و
     آستانه را غیرقابلِ تنظیم می‌کند.

     سقفِ ۱٫۵ از خودِ تمِ پیش‌فرض آمده: الگوی طلاییِ سروا روی زمینهٔ شب
     ۱٫۴۷ است. یعنی «نباید از چیزی که همیشه داشتیم پررنگ‌تر باشد». */
  ["--pattern-color", "--background", 1.5, "الگوی هندسی روی زمینه (ترکیب‌شده با ۶٪)", "max", 0.06],
  ["--pattern-color", "--card", 1.5, "الگوی هندسی روی کارت (ترکیب‌شده با ۶٪)", "max", 0.06],
];

/** رنگِ الگو با شفافیتِ واقعی‌اش روی زمینه می‌نشیند؛ همان چیزی که دیده می‌شود. */
function overlay(fg, bg, alpha) {
  const a = toRgb(fg).rgb;
  const b = toRgb(bg).rgb;
  return a.map((c, i) => c * alpha + b[i] * (1 - alpha));
}
function contrastLin(a, b) {
  const [hi, lo] = luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;
let clips = 0;
for (const [id, label] of PALETTES) {
  for (const mode of ["light", "dark"]) {
    const tokens = tokensFor(id, mode);
    const rows = [];
    for (const [fg, bg, limit, what, kind, alpha] of PAIRS) {
      const isCeiling = kind === "max";
      const a = resolve(`var(${fg})`, tokens);
      const b = resolve(`var(${bg})`, tokens);
      const ratio = alpha
        ? contrastLin(overlay(a, b, alpha), toRgb(b).rgb)
        : contrast(a, b);
      const ok = isCeiling ? ratio <= limit : ratio >= limit;
      if (!ok) failures++;
      for (const [n, c] of [[fg, a], [bg, b]]) {
        if (toRgb(c).clipped) { clips++; rows.push(`      ⚠ خارج از گامات: ${n}`); }
      }
      rows.push(
        `   ${ok ? "✓" : "✗"} ${ratio.toFixed(2).padStart(5)}:1  (${isCeiling ? "حداکثر" : "حداقل"} ${limit})  ${fg} روی ${bg}  ${hex(a)}/${hex(b)}  ${what}`,
      );
    }
    console.log(`\n── ${label} (${id}) / ${mode === "dark" ? "تیره" : "روشن"} ──`);
    console.log(rows.join("\n"));
  }
}
console.log(`\n${failures === 0 ? "همه قبول" : failures + " مورد زیر حد"} | گامات: ${clips}`);
process.exit(failures ? 1 : 0);
