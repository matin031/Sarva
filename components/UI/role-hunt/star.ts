/**
 * ستارهٔ پنج‌پرِ گرد — قابِ هر واژه.
 *
 * ⚠️ شکلِ مرجع یک ستارهٔ دست‌کشیده است: پنج پر، نوک‌های بسیار گرد و
 * درّه‌های نرم. نه ستارهٔ تیزِ هندسی و نه گُلِ تپل.
 *
 * ── چطور گرد می‌شود ────────────────────────────────────────────────────
 * ده رأس حساب می‌شود (پنج بیرونی، پنج درونی). بعد هر رأس *حذف* می‌شود و
 * جایش یک کمانِ درجه‌دو می‌نشیند که نقطهٔ کنترلش خودِ همان رأس است:
 *
 *     … L(نقطهٔ ورود) Q(رأس، نقطهٔ خروج) …
 *
 * نقطه‌های ورود و خروج روی یال‌ها و به فاصلهٔ کسری از طولِ یال‌اند. هرچه آن
 * کسر به ۰٫۵ نزدیک‌تر باشد، پارهٔ مستقیم کوتاه‌تر و گوشه گردتر می‌شود.
 *
 * ⚠️ و کسرِ نوک با کسرِ درّه یکی نیست — این تفاوت تمامِ حسِ شکل است. نوکِ
 * پر باید کاملاً گرد باشد (نزدیکِ ۰٫۵) ولی درّه کمی تیزتر بماند، وگرنه
 * ستاره به یک لکهٔ پنج‌گوش تبدیل می‌شود و دیگر ستاره خوانده نمی‌شود.
 */

const POINTS = 5;
const OUTER = 47;
/** نسبتِ شعاعِ درّه به نوک. ۰٫۵ همان تناسبِ ستارهٔ کلاسیک است. */
const INNER = OUTER * 0.5;

/** گردیِ نوکِ پر — نزدیکِ نصفِ یال، یعنی تقریباً هیچ پارهٔ مستقیمی نمی‌ماند. */
const TIP_ROUND = 0.46;
/** گردیِ درّه — کمتر، تا شکل ستاره بماند و لکه نشود. */
const VALLEY_ROUND = 0.3;

type Pt = { x: number; y: number };

function vertex(i: number): Pt {
  // از نوکِ بالا شروع می‌شود تا ستاره «ایستاده» دیده شود.
  const angle = (i * Math.PI) / POINTS - Math.PI / 2;
  const r = i % 2 === 0 ? OUTER : INNER;
  return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
}

/** نقطه‌ای روی پارهٔ `from→to`، به فاصلهٔ کسرِ `t` از `from`. */
function along(from: Pt, to: Pt, t: number): Pt {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

const fmt = (p: Pt) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

function buildStar(): string {
  const n = POINTS * 2;
  const v = Array.from({ length: n }, (_, i) => vertex(i));

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = v[(i - 1 + n) % n]!;
    const cur = v[i]!;
    const next = v[(i + 1) % n]!;
    // رأسِ زوج نوکِ پر است و فرد درّه.
    const round = i % 2 === 0 ? TIP_ROUND : VALLEY_ROUND;

    const enter = along(cur, prev, round);
    const exit = along(cur, next, round);

    parts.push(`${i === 0 ? "M" : "L"}${fmt(enter)}`);
    parts.push(`Q${fmt(cur)} ${fmt(exit)}`);
  }
  return `${parts.join(" ")} Z`;
}

export const STAR_PATH = buildStar();
