import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * «آیا بازی روی گوشیِ افقی بدونِ اسکرول جا می‌شود؟»
 *
 * =============================================================================
 * ⚠️ چرا این تست وجود دارد
 * =============================================================================
 *
 * «شکار نقش‌ها» روی گوشی فقط در حالتِ افقی باز می‌شود، و کلِ دلیلش این است
 * که مصراع باید *وسطِ* مدار بماند. ولی گوشیِ افقی ارتفاعِ بسیار کمی دارد —
 * ۳۶۰ تا ۴۳۰ پیکسل — و اگر مدار یک مو بزرگ‌تر از بودجه شود، مصراع زیرِ لبهٔ
 * صفحه می‌رود و کاربر باید اسکرول کند. یعنی دقیقاً همان چیزی که اجبارِ
 * حالتِ افقی برای نبودنش گذاشته شد.
 *
 * این عددها در شیوه‌نامه‌اند و کسی که فردا شعاع را برای «قشنگ‌تر شدن» کمی
 * زیاد کند، هیچ خطایی نمی‌بیند — فقط روی آیفونِ SE چیزی از کادر بیرون
 * می‌زند، که احتمالاً هیچ‌وقت دستِ ما نیست.
 *
 * ⚠️ مقادیر از *خودِ CSS* خوانده می‌شوند و نه از یک کپیِ دستی. اگر یک کپی
 * می‌بود، همان کپی هم باید به‌روز می‌شد و اولین باری که یادش می‌رفت، تست
 * سبز می‌ماند و محصول خراب می‌شد.
 */

const CSS = readFileSync("components/UI/role-hunt/role-hunt.css", "utf8");
const REM = 16;

/** بلوکِ «گوشیِ افقی» — همان media query ای که در محصول اجرا می‌شود. */
function landscapeBlock(): string {
  const at = CSS.indexOf(
    "@media (pointer: coarse) and (orientation: landscape) and (max-height: 34rem)",
  );
  assert.ok(at > -1, "بلوکِ گوشیِ افقی در شیوه‌نامه پیدا نشد");
  return CSS.slice(at, at + 1200);
}

function num(block: string, re: RegExp): number {
  const m = re.exec(block);
  assert.ok(m, `مقدار در شیوه‌نامه پیدا نشد: ${re}`);
  return Number(m[1]);
}

const block = landscapeBlock();

/** `--rh-radius: min(33vh, 9rem)` */
const RADIUS_VH = num(block, /--rh-radius:\s*min\((\d+(?:\.\d+)?)vh/);
const RADIUS_CAP = num(block, /--rh-radius:\s*min\([\d.]+vh,\s*([\d.]+)rem\)/) * REM;
/** `--rh-kx: 2.1` */
const KX = num(block, /--rh-kx:\s*([\d.]+)/);
/** `--rh-token-min: clamp(2.6rem, 9vh, 3.6rem)` */
const TOKEN_MIN_REM = num(block, /--rh-token-min:\s*clamp\(([\d.]+)rem/) * REM;
const TOKEN_VH = num(block, /--rh-token-min:\s*clamp\([\d.]+rem,\s*([\d.]+)vh/);
const TOKEN_MAX_REM = num(block, /--rh-token-min:\s*clamp\([\d.]+rem,\s*[\d.]+vh,\s*([\d.]+)rem/) * REM;

/**
 * هرچه *غیر* از صحنه ارتفاع می‌خورد.
 *
 * ⚠️ رمزگشا دیگر زیرِ صحنه نیست و وسطِ حلقه، زیرِ مصراع می‌نشیند؛ پس از
 * این بودجه بیرون آمد. اندازه‌گیریِ واقعی (۷۴۰×۳۶۰ تا ۹۳۲×۴۳۰): بالای صحنه
 * ۳۴ پیکسل (HUD یک‌ردیفه + فاصله)، و ته‌ماندهٔ زیرِ صحنه ۳۰ تا ۵۰ پیکسل.
 * ۶۰ یعنی ~۲۵ پیکسل حاشیهٔ اطمینان. اگر روزی چیزی به بالا یا پایینِ صحنه
 * اضافه شود، عددِ اینجا باید بالا برود — و آن‌وقت همین تست می‌گوید کدام
 * گوشی دیگر جا نمی‌شود.
 */
const CHROME = 60;

const clamp = (lo: number, v: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** ارتفاعی که چیدمانِ افقی روی یک صفحه واقعاً می‌خورد. */
function usedHeight(viewportHeight: number) {
  const radius = Math.min((RADIUS_VH / 100) * viewportHeight, RADIUS_CAP);
  const token = clamp(TOKEN_MIN_REM, (TOKEN_VH / 100) * viewportHeight, TOKEN_MAX_REM);
  // همان فرمولِ `--rh-reach` در شیوه‌نامه: شعاع + نصفِ ستاره + ۸.
  const stage = 2 * (radius + token / 2 + 8);
  return { radius, panel: radius * KX, stage, total: stage + CHROME };
}

/** گوشی‌هایی که باید در حالتِ افقی *بدونِ اسکرول* قابلِ بازی باشند. */
const PHONES: [string, number, number][] = [
  ["iPhone 14/15 landscape", 844, 390],
  ["iPhone 14 Pro landscape", 852, 393],
  ["iPhone Pro Max landscape", 932, 430],
  ["iPhone SE landscape", 667, 375],
  ["Android landscape", 740, 360],
];

for (const [name, w, h] of PHONES) {
  test(`${name} — کلِ بازی در ارتفاع جا می‌شود`, () => {
    const { total, stage, panel } = usedHeight(h);
    assert.ok(
      total <= h,
      `${name}: صحنه ${stage.toFixed(0)} + پوسته ${CHROME} = ${total.toFixed(0)} > ${h}`,
    );
    // تابلو باید واقعاً جای یک مصراع باشد و نه یک نوارِ باریک.
    assert.ok(panel >= 170, `${name}: تابلو فقط ${panel.toFixed(0)}px عرض دارد`);
    assert.ok(w > h, "این فهرست فقط حالتِ افقی است");
  });
}

test("مدار در حالتِ افقی بیضی است و نه دایره", () => {
  /* ⚠️ اگر روزی کسی `--rh-kx` را به ۱ برگرداند، مدار دایره می‌شود و تابلو
     به عرضِ شعاعِ عمودی (~۹۰px) می‌افتد — یعنی مصراع دیگر خوانده نمی‌شود.
     خودِ بیضی بودن یک الزامِ چیدمان است، نه یک تزئین. */
  assert.ok(KX > 1.5, `--rh-kx برابرِ ${KX} است و برای این چیدمان کم است`);
});

test("حالتِ افقیِ گوشی چیدمانِ ستونی را برنمی‌گرداند", () => {
  /* مصراع باید وسطِ مدار بماند. `grid` + `place-items: center` همان چیزی
     است که دسکتاپ دارد؛ `flex-direction: column` یعنی برگشت به چیدمانی که
     تابلو را از مدار جدا می‌کرد. */
  assert.match(block, /\.rh-stage\s*\{[^}]*display:\s*grid/);
  assert.ok(
    !/\.rh-stage\s*\{[^}]*flex-direction:\s*column/.test(block),
    "چیدمانِ ستونی نباید در حالتِ افقی برگردد",
  );
});

test("پوششِ عمودی مدار را متوقف می‌کند و حذفش نمی‌کند", () => {
  /* ⚠️ `animation: none` موقعیتِ مدار را به صفر برمی‌گرداند و با برگشت از
     حالتِ عمودی، همهٔ واژه‌ها می‌پریدند. `paused` فریمِ جاری را نگه می‌دارد. */
  const paused = CSS.slice(CSS.indexOf('[data-paused="true"]'));
  assert.match(paused, /animation-play-state:\s*paused/);
});

test("پوشش و ریشه ناحیهٔ امنِ آیفون را رعایت می‌کنند", () => {
  assert.match(block, /env\(safe-area-inset-left\)/);
  const gate = CSS.slice(CSS.indexOf(".rh-gate {"));
  for (const side of ["top", "right", "bottom", "left"]) {
    assert.match(gate, new RegExp(`env\\(safe-area-inset-${side}\\)`));
  }
});
