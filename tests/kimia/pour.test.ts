import { test } from "node:test";
import assert from "node:assert/strict";

import { KIMIA_CONFIG } from "@/lib/kimia/config";
import {
  lipOffset,
  planPour,
  spillFill,
  streamPathData,
  streamShape,
  submergedArea,
  surfaceDepthFor,
  type TubeBox,
} from "@/lib/kimia/pour";

/* ═══════════════════════════════════════════════════════════════════════════
   این فایل انیمیشن را نمی‌سنجد؛ *ادعاهایی* را می‌سنجد که انیمیشن رویشان
   ایستاده و با نگاه کردن به صفحه قابلِ راستی‌آزمایی نیستند:

     • حجمِ مایع با کج شدنِ لوله عوض نمی‌شود (سطح افقی می‌ماند، نه مایع
       ناپدید می‌شود و نه از هوا زیاد می‌شود)
     • هیچ قطره‌ای پیش از رسیدنِ مایع به لبه بیرون نمی‌آید
     • کلِ زمانِ ترکیب برای دو تا هشت رکن کران‌دار است

   سومی مستقیماً یک تصمیمِ محصولی است: نشستِ ده‌بیتی نباید پشتِ انیمیشن
   بماند.
   ═══════════════════════════════════════════════════════════════════════════ */

const BOX: TubeBox = { width: 44, height: 108 };
const AREA = BOX.width * BOX.height;

test("سطحِ مایع: حجم با کج شدن پایسته می‌ماند", () => {
  for (const fill of [0.1, 0.35, 0.64, 0.9]) {
    for (const tilt of [0, 12, 30, 45, 67, 90, 104, 122]) {
      const surface = surfaceDepthFor(BOX, tilt, fill);
      const measured = submergedArea(BOX, tilt, surface) / AREA;
      assert.ok(
        Math.abs(measured - fill) < 1e-3,
        `کج ${tilt}° با پرشدگی ${fill}: مساحتِ اندازه‌گیری‌شده ${measured.toFixed(4)}`,
      );
    }
  }
});

test("سطحِ مایع: لولهٔ ایستاده همان فرمولِ سادهٔ (۰٫۵ − f)·h را می‌دهد", () => {
  /* ⚠️ حالتِ خاصِ زاویهٔ صفر باید دقیقاً همان چیزی باشد که CSS بدونِ
     جاوااسکریپت می‌کشد، وگرنه اولین فریمِ هر کج شدن یک پرشِ دیدنی دارد. */
  for (const fill of [0, 0.25, 0.64, 1]) {
    const surface = surfaceDepthFor(BOX, 0, fill);
    assert.ok(Math.abs(surface - (0.5 - fill) * BOX.height) < 1e-3);
  }
});

test("سطحِ مایع: خالی و پر، کرانه‌های درست را می‌دهند", () => {
  assert.equal(submergedArea(BOX, 40, surfaceDepthFor(BOX, 40, 0)), 0);
  assert.ok(Math.abs(submergedArea(BOX, 40, surfaceDepthFor(BOX, 40, 1)) - AREA) < 1e-6);
});

test("سرریز: آستانه با کج شدن کم می‌شود و در ۹۰° زیرِ نصف است", () => {
  const upright = spillFill(BOX, 0);
  assert.equal(upright, 1, "لولهٔ ایستاده تا لبه جا دارد");

  let previous = upright;
  for (const tilt of [10, 25, 40, 60, 80, 90, 110, 122]) {
    const threshold = spillFill(BOX, tilt);
    assert.ok(threshold <= previous + 1e-9, `آستانه در ${tilt}° زیاد شد`);
    previous = threshold;
  }
  assert.ok(spillFill(BOX, 90) < 0.5);
  assert.ok(spillFill(BOX, 122) < spillFill(BOX, 90));
});

test("سرریز: مایعِ کم، دیرتر از مایعِ زیاد می‌ریزد", () => {
  /* ⚠️ همان چیزی که «مایع فقط وقتی به لبه رسید می‌ریزد» یعنی: زاویه‌ای
     که در آن یک لولهٔ ۳۰٪ شروع به ریختن می‌کند باید تندتر از لولهٔ ۶۴٪
     باشد. */
  const angleWhereSpills = (fill: number) => {
    for (let tilt = 0; tilt <= 180; tilt += 0.5) {
      if (spillFill(BOX, tilt) < fill) return tilt;
    }
    return Infinity;
  };
  assert.ok(angleWhereSpills(0.3) > angleWhereSpills(0.64));
  assert.ok(angleWhereSpills(0.64) > angleWhereSpills(0.9));
});

test("لبه: با کج شدن پایین می‌آید و در ۹۰° درست زیرِ محورِ چرخش است", () => {
  const flat = lipOffset(BOX, 0);
  assert.ok(Math.abs(flat.x - BOX.width / 2) < 1e-9 && Math.abs(flat.y) < 1e-9);

  const right = lipOffset(BOX, 90);
  assert.ok(Math.abs(right.x) < 1e-9 && Math.abs(right.y - BOX.width / 2) < 1e-9);
});

test("جریان: سهمی به سطحِ مقصد می‌رسد و در مسیر باریک می‌شود", () => {
  const shape = streamShape({
    origin: { x: 100, y: 200 },
    directionDeg: 110,
    speed: 210,
    gravity: 2600,
    targetY: 320,
    half: 3,
  });

  assert.ok(Math.abs(shape.hit.y - 320) < 0.5, "برخورد روی سطحِ مقصد نیست");
  assert.ok(shape.impactSpeed > 210, "مایع باید در راه شتاب بگیرد");

  const first = shape.points[0].half;
  const last = shape.points[shape.points.length - 1].half;
  assert.ok(last < first, "جریان باید با شتاب گرفتن باریک شود");

  const path = streamPathData(shape);
  assert.ok(path.startsWith("M ") && path.endsWith("Z"));
  assert.ok(!/NaN/.test(path), "مسیرِ جریان NaN دارد");
});

test("جریان: مقصدِ بالاتر از لبه، مسیرِ تباه نمی‌سازد", () => {
  /* ⚠️ وسطِ انیمیشن ممکن است سطحِ مایعِ ظرف از لبه بالاتر بیاید (ظرفِ
     تقریباً پر). نباید NaN بدهد و نباید جریانِ رو به بالا بکشد. */
  const shape = streamShape({
    origin: { x: 10, y: 400 },
    directionDeg: 100,
    speed: 180,
    gravity: 2600,
    targetY: 380,
    half: 2,
  });
  assert.ok(!Number.isNaN(shape.hit.x) && !Number.isNaN(shape.hit.y));
  assert.ok(Math.abs(shape.hit.y - 400) < 1e-6, "باید همان‌جا بسته شود");
});

test("زمان‌بندی: ترتیبِ ریختن‌ها هیچ‌وقت روی هم نمی‌افتد", () => {
  const timings = KIMIA_CONFIG.motion.pour;
  for (const count of [2, 3, 4, 5, 6, 7, 8]) {
    const plan = planPour(count, timings);
    assert.equal(plan.steps.length, count);
    for (let i = 1; i < plan.steps.length; i += 1) {
      const previous = plan.steps[i - 1];
      const current = plan.steps[i];
      assert.ok(
        current.pourStartMs >= previous.pourEndMs - 1e-9,
        `شیشهٔ ${i + 1} پیش از تمام شدنِ ریختنِ قبلی شروع به ریختن می‌کند`,
      );
      assert.ok(current.startMs > previous.startMs, "دو شیشه با هم راه افتاده‌اند");
      assert.ok(current.holdMs >= 0);
    }
  }
});

test("زمان‌بندی: پروازِ شیشهٔ بعدی با ریختنِ قبلی هم‌پوشانی دارد", () => {
  /* ⚠️ همان چیزی که ترکیب را از «صفِ نوبت» به «یک حرکتِ پیوسته» تبدیل
     می‌کند: شیشهٔ دوم باید پیش از تمام شدنِ ریختنِ اولی راه افتاده باشد. */
  const plan = planPour(4, KIMIA_CONFIG.motion.pour);
  for (let i = 1; i < plan.steps.length; i += 1) {
    assert.ok(
      plan.steps[i].startMs < plan.steps[i - 1].pourEndMs,
      `شیشهٔ ${i + 1} تا پایانِ ریختنِ قبلی منتظر مانده`,
    );
  }
});

test("زمان‌بندی: کلِ ترکیب برای دو تا هشت رکن کران‌دار است", () => {
  const timings = KIMIA_CONFIG.motion.pour;
  for (const count of [2, 3, 4, 5, 6, 7, 8]) {
    const plan = planPour(count, timings);
    assert.ok(plan.totalMs > 1000, `ترکیبِ ${count} رکنی بی‌معنا کوتاه است`);
    assert.ok(
      plan.totalMs < 5600,
      `ترکیبِ ${count} رکنی ${Math.round(plan.totalMs)}ms طول می‌کشد — برای نشستِ ده‌بیتی زیاد است`,
    );
  }
});

test("زمان‌بندی: بیتِ بلندتر، ریختنِ هر شیشه‌اش کوتاه‌تر است", () => {
  const timings = KIMIA_CONFIG.motion.pour;
  const short = planPour(3, timings).steps[0].pourMs;
  const long = planPour(8, timings).steps[0].pourMs;
  assert.ok(long < short);
  assert.ok(long >= timings.perTubeMinMs);
  assert.ok(short <= timings.perTubeMaxMs);
});
