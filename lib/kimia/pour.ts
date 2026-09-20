/* ═══════════════════════════════════════════════════════════════════════════
   هندسه و فیزیکِ ریختن — ریاضیِ خالص، بدونِ DOM و بدونِ React.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا این فایل جداست و تست دارد:

   خطِ زمانیِ ریختن در هر فریم چند بار این توابع را صدا می‌زند. اگر همین
   ریاضی داخلِ کامپوننت می‌نشست، تنها راهِ فهمیدنِ درستی‌اش «نگاه کردن به
   انیمیشن» بود — و «به‌نظرم درست می‌آید» برای پایستگیِ حجم معیار نیست.
   اینجا خالص است، پس `tests/kimia/pour.test.ts` می‌تواند بسنجد که حجم با
   کج شدن عوض نمی‌شود، سرریز زودتر از رسیدنِ مایع به لبه شروع نمی‌شود، و
   زمان‌بندی برای دو تا هشت رکن کران‌دار می‌ماند.

   ── دستگاهِ مختصات ───────────────────────────────────────────────────────
   همه‌چیز در فضای *محلیِ خودِ لوله* است: مبدأ در مرکزِ بدنهٔ شیشه،
   x به راست، y به **پایین** (همان قراردادِ صفحه و SVG).

       x ∈ [-w/2, +w/2]      y ∈ [-h/2 (دهانه), +h/2 (کف)]

   زاویهٔ `tilt` ساعتگرد و بر حسبِ درجه است. با چرخشِ لوله، «پایینِ دنیا»
   در دستگاهِ محلی می‌شود بردارِ g = (sin θ, cos θ)، پس عمقِ هر نقطه نسبت
   به سطحِ مایع می‌شود u(p) = x·sinθ + y·cosθ.

   مایع همان ناحیه‌ای است که u(p) ≥ s — یعنی همیشه یک نیم‌صفحهٔ افقی در
   دنیای واقعی، هر قدر هم لوله کج باشد.
   ═══════════════════════════════════════════════════════════════════════════ */

export type TubeBox = {
  /** عرضِ بدنهٔ شیشه بر حسبِ پیکسل. */
  readonly width: number;
  /** بلندیِ بدنهٔ شیشه بر حسبِ پیکسل. */
  readonly height: number;
};

export type Vec2 = { readonly x: number; readonly y: number };

const DEG = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ── easingها ──────────────────────────────────────────────────────────────
   ⚠️ همه خالص و بدونِ وابستگی: خطِ زمانی با rAF کار می‌کند و نه با
   `animation-timing-function`، پس منحنی‌ها باید اینجا باشند تا هم انیمیشن و
   هم تست یک چیز را ببینند. */

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInQuad = (t: number): number => t * t;

/**
 * شتاب‌گیری با ترمزِ بلند — برای پروازِ شیشه.
 *
 * ⚠️ `ease-in-out` تنها چیزی نیست که لازم داریم: شیشه باید کنده شود
 * (آهسته)، تند برود و آرام بایستد. ترمز عمداً بلندتر از شتاب است، وگرنه
 * رسیدنش به بالای بیت مثلِ «پریدن» دیده می‌شود.
 */
export const easeTravel = (t: number): number =>
  t < 0.38 ? 3.46 * t * t : 1 - Math.pow(1 - (t - 0.38) / 0.62, 3) * 0.5;

/* ═══════════════════════ سطحِ مایع در لولهٔ کج ═══════════════════════════ */

/** چهار گوشهٔ بدنهٔ شیشه در دستگاهِ محلی. */
function corners(box: TubeBox): Vec2[] {
  const a = box.width / 2;
  const b = box.height / 2;
  return [
    { x: -a, y: -b },
    { x: a, y: -b },
    { x: a, y: b },
    { x: -a, y: b },
  ];
}

/** عمقِ یک نقطه در راستای «پایینِ دنیا». */
function depthAt(p: Vec2, sin: number, cos: number): number {
  return p.x * sin + p.y * cos;
}

/**
 * مساحتِ بخشی از بدنه که زیرِ سطحِ مایع است (u ≥ s).
 *
 * ⚠️ با برشِ چندضلعی (Sutherland–Hodgman) و نه با فرمولِ بسته. فرمولِ بسته
 * سه حالتِ جدا دارد (ذوزنقه، مثلثِ گوشه، مثلثِ لبه) و هر سه باید دستی با
 * هم جور بمانند؛ برش همهٔ حالت‌ها را با یک کد می‌دهد و پیوستگی‌اش
 * خودبه‌خود تضمین است. روی چهار رأس هزینه‌اش ناچیز است.
 */
export function submergedArea(box: TubeBox, tiltDeg: number, surface: number): number {
  const sin = Math.sin(tiltDeg * DEG);
  const cos = Math.cos(tiltDeg * DEG);
  const poly = corners(box);
  const out: Vec2[] = [];

  for (let i = 0; i < poly.length; i += 1) {
    const current = poly[i];
    const next = poly[(i + 1) % poly.length];
    const dCurrent = depthAt(current, sin, cos) - surface;
    const dNext = depthAt(next, sin, cos) - surface;

    if (dCurrent >= 0) out.push(current);
    if (dCurrent >= 0 !== dNext >= 0) {
      const t = dCurrent / (dCurrent - dNext);
      out.push({ x: lerp(current.x, next.x, t), y: lerp(current.y, next.y, t) });
    }
  }

  if (out.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < out.length; i += 1) {
    const p = out[i];
    const q = out[(i + 1) % out.length];
    area += p.x * q.y - q.x * p.y;
  }
  return Math.abs(area) / 2;
}

/**
 * جای سطحِ مایع (`s`) برای یک حجمِ مشخص.
 *
 * ⚠️ با دوبخشی و نه با معکوسِ تحلیلی: تابعِ مساحت اکیداً نزولی است، پس
 * دوبخشی همیشه همگرا می‌شود و — برخلافِ معکوسِ سه‌حالته — نمی‌تواند در
 * مرزِ حالت‌ها بپرد. یک پرشِ نیم‌پیکسلی در مرز، روی صفحه به‌صورتِ «تکانِ
 * سطحِ مایع» دیده می‌شود.
 *
 * خروجی همان چیزی است که CSS لازم دارد: مقدارِ `translateY` لایهٔ مایع، بر
 * حسبِ پیکسل و در راستای عمودیِ *دنیا*.
 */
export function surfaceDepthFor(box: TubeBox, tiltDeg: number, fill: number): number {
  const sin = Math.sin(tiltDeg * DEG);
  const cos = Math.cos(tiltDeg * DEG);
  const span = corners(box).map((p) => depthAt(p, sin, cos));
  let lo = Math.min(...span);
  let hi = Math.max(...span);

  const target = clamp01(fill) * box.width * box.height;
  if (target <= 0) return hi;
  if (target >= box.width * box.height) return lo;

  /* ۲۸ گام: با بدنهٔ ~۱۰۰ پیکسلی یعنی دقتِ زیرِ یک‌هزارمِ پیکسل. */
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2;
    if (submergedArea(box, tiltDeg, mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * لبهٔ ریزش — گوشهٔ دهانه که با کج شدن پایین‌تر می‌آید.
 * برای زاویهٔ مثبت (ساعتگرد) گوشهٔ راستِ دهانه است.
 */
export function lipCorner(box: TubeBox): Vec2 {
  return { x: box.width / 2, y: -box.height / 2 };
}

/**
 * بیشترین حجمی که لوله در این زاویه نگه می‌دارد.
 *
 * ⚠️ همین یک تابع «مایع فقط وقتی به لبه رسید می‌ریزد» را تضمین می‌کند: تا
 * وقتی حجمِ واقعی از این کمتر است هیچ قطره‌ای بیرون نمی‌آید، هر قدر هم
 * لوله کج باشد. و چون از خودِ هندسه می‌آید، لولهٔ کم‌مایع دیرتر می‌ریزد —
 * دقیقاً مثلِ واقعیت.
 */
export function spillFill(box: TubeBox, tiltDeg: number): number {
  const lip = lipCorner(box);
  const sin = Math.sin(tiltDeg * DEG);
  const cos = Math.cos(tiltDeg * DEG);
  const area = submergedArea(box, tiltDeg, depthAt(lip, sin, cos));
  return clamp01(area / (box.width * box.height));
}

/**
 * جای لبهٔ ریزش در فضای دنیا، نسبت به محورِ چرخش.
 *
 * محورِ چرخشِ لوله وسطِ دهانه است (`transform-origin: 50% 0`)، پس این فقط
 * چرخشِ برداری به‌طولِ نصفِ عرضِ لوله است.
 */
export function lipOffset(box: TubeBox, tiltDeg: number): Vec2 {
  const a = box.width / 2;
  const sin = Math.sin(tiltDeg * DEG);
  const cos = Math.cos(tiltDeg * DEG);
  return { x: a * cos, y: a * sin };
}

/**
 * زاویه‌ای که در آن مایعِ به‌اندازهٔ `fill` تازه به لبه می‌رسد.
 *
 * ⚠️ همین عدد است که «کج شدن» را از «ریختن» جدا می‌کند: تا این زاویه
 * هیچ قطره‌ای بیرون نمی‌آید (فقط سطح می‌چرخد)، و از این زاویه به بعد هر
 * درجهٔ اضافه، مقداری مایع بیرون می‌ریزد. چون از هندسه می‌آید، شیشهٔ
 * کم‌مایع دیرتر و شیشهٔ پر زودتر شروع می‌کند — بدونِ هیچ عددِ دستی.
 */
export function spillAngleFor(box: TubeBox, fill: number, maxDeg = 180): number {
  if (fill >= 1) return 0;
  if (fill <= 0) return maxDeg;
  let lo = 0;
  let hi = maxDeg;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (spillFill(box, mid) > fill) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ═══════════════════════════ سهمیِ جریان ═════════════════════════════════ */

export type StreamPoint = { readonly x: number; readonly y: number; readonly half: number };

export type StreamShape = {
  /** نمونه‌های مسیر، از لبه تا نقطهٔ برخورد. */
  readonly points: readonly StreamPoint[];
  /** نقطهٔ برخورد با سطحِ مایعِ مقصد. */
  readonly hit: Vec2;
  /** سرعتِ برخورد — شدتِ ریپل و قطره‌ها از این می‌آید. */
  readonly impactSpeed: number;
};

/**
 * مسیرِ سهمیِ جریان، از لبهٔ لوله تا سطحِ مایعِ داخلِ ظرف.
 *
 * ⚠️ یک سهمیِ واقعی است و نه یک `Q`ِ دلبخواه: سرعتِ اولیه در راستای لبهٔ
 * لوله است (پس با زاویهٔ کج شدن می‌چرخد) و از آنجا فقط ثقل کار می‌کند.
 *
 * ⚠️ عرضِ جریان در طولِ مسیر کم می‌شود و این هم تزئین نیست: شارِ جرم ثابت
 * است (A·v ثابت)، پس با شتاب گرفتنِ مایع مقطعش باریک می‌شود — r ∝ ۱/√v.
 * همان باریک‌شدنی که زیرِ هر شیرِ آب دیده می‌شود.
 */
export function streamShape(input: {
  origin: Vec2;
  /** راستای خروج بر حسبِ درجه — همان زاویهٔ کج شدنِ لوله. */
  directionDeg: number;
  /** سرعتِ خروج، پیکسل بر ثانیه. */
  speed: number;
  /** شتابِ ثقل، پیکسل بر مجذورِ ثانیه. */
  gravity: number;
  /** ارتفاعِ سطحِ مایعِ مقصد. */
  targetY: number;
  /** نصفِ عرضِ جریان در لبه. */
  half: number;
  samples?: number;
}): StreamShape {
  const { origin, directionDeg, speed, gravity, targetY, half } = input;
  const samples = Math.max(3, input.samples ?? 12);
  const vx = Math.cos(directionDeg * DEG) * speed;
  const vy = Math.sin(directionDeg * DEG) * speed;

  /* زمانِ رسیدن به سطحِ مقصد: ½gt² + vy·t − Δy = ۰ */
  const dy = targetY - origin.y;
  let tHit: number;
  if (dy <= 0) {
    tHit = 0;
  } else if (gravity <= 0) {
    tHit = vy > 0 ? dy / vy : 0;
  } else {
    tHit = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * gravity * dy))) / gravity;
  }

  const points: StreamPoint[] = [];
  const v0 = Math.max(1, Math.hypot(vx, vy));
  for (let i = 0; i < samples; i += 1) {
    const t = (tHit * i) / (samples - 1);
    const speedAt = Math.max(1, Math.hypot(vx, vy + gravity * t));
    points.push({
      x: origin.x + vx * t,
      y: origin.y + vy * t + 0.5 * gravity * t * t,
      half: Math.max(0.35, half * Math.sqrt(v0 / speedAt)),
    });
  }

  const last = points[points.length - 1];
  return {
    points,
    hit: { x: last.x, y: last.y },
    impactSpeed: Math.max(1, Math.hypot(vx, vy + gravity * tHit)),
  };
}

/**
 * چندضلعیِ جریان به‌صورتِ `d`ِ یک `path`.
 *
 * ⚠️ چندضلعیِ پرشده و نه `stroke`ِ ثابت‌عرض: عرضِ متغیر با stroke ممکن
 * نیست، و همان باریک شدن است که جریان را شبیهِ مایع می‌کند نه شبیهِ یک
 * سیمِ رنگی.
 */
export function streamPathData(shape: StreamShape): string {
  const { points } = shape;
  if (points.length < 2) return "";

  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.max(0.001, Math.hypot(tx, ty));
    const nx = -ty / len;
    const ny = tx / len;
    left.push(`${(p.x + nx * p.half).toFixed(2)} ${(p.y + ny * p.half).toFixed(2)}`);
    right.push(`${(p.x - nx * p.half).toFixed(2)} ${(p.y - ny * p.half).toFixed(2)}`);
  }

  right.reverse();
  return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
}

/* ═══════════════════════════ زمان‌بندیِ نوبت‌ها ═══════════════════════════ */

export type PourStep = {
  readonly index: number;
  /** زمانِ شروعِ حرکتِ این شیشه، از ابتدای خطِ زمانی. */
  readonly startMs: number;
  readonly anticipationMs: number;
  readonly travelMs: number;
  readonly tiltMs: number;
  /**
   * مکثِ کج‌مانده روی لبه، تا ریختنِ شیشهٔ قبلی تمام شود.
   *
   * ⚠️ این «زمانِ هدررفته» نیست: شیشه با زاویهٔ ریزش بالای بیت معلق
   * می‌ماند، مایعش لبِ لبه است و بعد شروع می‌کند. همین مکث است که اجازه
   * می‌دهد پروازِ شیشهٔ بعدی با ریختنِ قبلی هم‌پوشانی داشته باشد، بدونِ
   * اینکه دو جریان هم‌زمان در ظرف بریزند.
   */
  readonly holdMs: number;
  readonly pourMs: number;
  readonly returnMs: number;
  /** لحظهٔ شروعِ ریختن. */
  readonly pourStartMs: number;
  /** لحظه‌ای که ریختنِ این شیشه تمام می‌شود (پیش از برگشت). */
  readonly pourEndMs: number;
  /** پایانِ کاملِ این شیشه، شاملِ برگشت. */
  readonly endMs: number;
};

export type PourPlan = {
  readonly steps: readonly PourStep[];
  /** پایانِ آخرین ریختن — لحظه‌ای که رنگ‌ها شروع به حل شدن می‌کنند. */
  readonly pourEndMs: number;
  /** پایانِ همه‌چیز، شاملِ حل شدنِ رنگ‌ها. */
  readonly totalMs: number;
};

export type PourTimings = {
  readonly anticipationMs: number;
  readonly travelMs: number;
  readonly tiltMs: number;
  readonly perTubeBudgetMs: number;
  readonly perTubeMinMs: number;
  readonly perTubeMaxMs: number;
  readonly returnMs: number;
  readonly staggerMinMs: number;
  readonly leadInMs: number;
  readonly blendMs: number;
};

/**
 * جدولِ زمانیِ کلِ ترکیب.
 *
 * ── دو قاعده، و همهٔ زمان‌بندی از همین دو در می‌آید ──────────────────────
 *
 * ۱) **ریختن‌ها هرگز روی هم نمی‌افتند.** دو جریانِ هم‌زمان در یک ظرف هم
 *    گیج‌کننده است و هم لایه‌های رنگ را بی‌معنا می‌کند؛ لایهٔ سومِ رنگ
 *    باید *بعد* از دومی بنشیند و نه با آن مخلوط شود.
 *
 * ۲) **ولی حرکت‌ها آزادند روی هم بیفتند.** شیشهٔ بعدی همان‌وقتی که قبلی
 *    دارد می‌ریزد راه می‌افتد، بالا می‌رود، کج می‌شود و لبِ لبه معلق
 *    می‌ماند (`holdMs`) تا نوبتش برسد. سریالی کردنِ *حرکت*ها، ترکیبِ
 *    چهار‌رکنی را به بیش از هفت ثانیه می‌رساند — اندازه‌گیری‌شده — که در
 *    نشستِ ده‌بیتی یعنی دو دقیقه انتظار.
 *
 * ⚠️ نتیجه کران‌دار است: زمانِ کل تقریباً «راه‌اندازیِ اولی + n×ریختن» است
 * و چون ریختنِ هر شیشه با `perTubeBudgetMs` تقسیم می‌شود، بیتِ هشت‌رکنی
 * هم از ~۵ ثانیه بالاتر نمی‌رود.
 */
export function planPour(count: number, timings: PourTimings): PourPlan {
  const steps: PourStep[] = [];
  const perTube = clamp(
    timings.perTubeBudgetMs / Math.max(1, count),
    timings.perTubeMinMs,
    timings.perTubeMaxMs,
  );
  const approachMs = timings.anticipationMs + timings.travelMs + timings.tiltMs;

  let previousPourEnd = 0;
  let previousStart = -Infinity;
  for (let index = 0; index < count; index += 1) {
    /* شیشه آن‌قدر زود راه می‌افتد که کج شدنش کمی *پیش از* پایانِ ریختنِ
       قبلی تمام شود — همان هم‌پوشانیِ خواسته‌شده — ولی نه آن‌قدر زود که
       دو شیشه با هم در هوا بپرند. */
    const startMs =
      index === 0
        ? 0
        : Math.max(previousStart + timings.staggerMinMs, previousPourEnd - approachMs - timings.leadInMs);
    const tiltEndMs = startMs + approachMs;
    const pourStartMs = Math.max(tiltEndMs, previousPourEnd);
    const pourEndMs = pourStartMs + perTube;
    const endMs = pourEndMs + timings.returnMs;

    steps.push({
      index,
      startMs,
      anticipationMs: timings.anticipationMs,
      travelMs: timings.travelMs,
      tiltMs: timings.tiltMs,
      holdMs: pourStartMs - tiltEndMs,
      pourMs: perTube,
      returnMs: timings.returnMs,
      pourStartMs,
      pourEndMs,
      endMs,
    });

    previousPourEnd = pourEndMs;
    previousStart = startMs;
  }

  const pourEndMs = steps.length ? steps[steps.length - 1].pourEndMs : 0;
  const lastEnd = steps.length ? steps[steps.length - 1].endMs : 0;
  return {
    steps,
    pourEndMs,
    totalMs: Math.max(lastEnd, pourEndMs + timings.blendMs),
  };
}
