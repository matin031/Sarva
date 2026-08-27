/* ═══════════════════════════════════════════════════════════════════════════
   شکستِ رویه‌ایِ شیشه — ریاضیاتِ خالص، بدون three.
   ═══════════════════════════════════════════════════════════════════════════

   خروجی، سلول‌های یک نمودارِ ورونوی روی سطحِ بالاییِ کاشی است. صحنه بعداً هر
   سلول را به ضخامتِ شیشه برجسته (extrude) می‌کند و یک قطعهٔ مستقل می‌سازد.

   چرا ورونوی و نه شبکهٔ مثلثی؟ چون شیشهٔ واقعی شبکه‌ای نمی‌شکند. سلول‌های
   ورونوی محدب‌اند (پس برجسته‌کردنشان ارزان است) و اندازه‌شان با تراکمِ نقاطِ
   مولد کنترل می‌شود — و ما نقاط را نزدیکِ محلِ برخورد متراکم می‌کنیم. نتیجه:
   ریزه‌های کوچک زیرِ پای بازیکن و تکه‌های بزرگ‌ترِ دورتر، که دقیقاً همان
   چیزی است که چشم از شیشهٔ شکسته انتظار دارد.

   همین نمودار دو کار می‌کند: یال‌هایش «ترک» هستند و سلول‌هایش «قطعه». پس
   ترکی که می‌بینید واقعاً همان خطی است که شیشه از رویش جدا می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Point = readonly [number, number];

export interface FractureCell {
  /** چندضلعیِ محدب روی سطحِ کاشی، در مختصاتِ محلی (x به راست، z به جلو). */
  polygon: Point[];
  centroid: Point;
  /** فاصلهٔ مرکزِ قطعه از نقطهٔ برخورد — ترتیبِ پخشِ ترک از روی همین است. */
  distance: number;
  area: number;
}

export interface FractureEdge {
  a: Point;
  b: Point;
  /** فاصلهٔ نزدیک‌ترین سرِ یال تا نقطهٔ برخورد. */
  distance: number;
}

export interface FractureResult {
  cells: FractureCell[];
  edges: FractureEdge[];
  /** دورترین فاصله در کلِ نمودار — برای نرمال‌کردنِ پیشرَویِ ترک. */
  maxDistance: number;
}

/** مولدِ شبه‌تصادفیِ تکرارپذیر (mulberry32).
 *
 *  شکستِ هر کاشی باید بینِ فریم‌ها ثابت بماند، و اگر روزی لازم شد یک باگِ
 *  دیداری بازتولید شود، بذر همان صحنه را برمی‌گرداند. */
export function makeRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** بریدنِ یک چندضلعیِ محدب با نیم‌صفحه‌ای که نقاطِ نزدیک‌تر به `keep` را نگه می‌دارد. */
function clipByBisector(poly: Point[], keep: Point, other: Point): Point[] {
  const nx = other[0] - keep[0];
  const nz = other[1] - keep[1];
  const mx = (keep[0] + other[0]) / 2;
  const mz = (keep[1] + other[1]) / 2;
  // side < 0 یعنی سمتِ `keep`
  const side = (p: Point) => (p[0] - mx) * nx + (p[1] - mz) * nz;

  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dc = side(cur);
    const dn = side(nxt);
    if (dc <= 0) out.push(cur);
    if (dc * dn < 0) {
      const t = dc / (dc - dn);
      out.push([cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t]);
    }
  }
  return out;
}

function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

function polygonCentroid(poly: Point[]): Point {
  let cx = 0;
  let cz = 0;
  for (const p of poly) {
    cx += p[0];
    cz += p[1];
  }
  return [cx / poly.length, cz / poly.length];
}

export interface FractureOptions {
  width: number;
  depth: number;
  /** نقطهٔ برخوردِ پای بازیکن، در مختصاتِ محلیِ کاشی. */
  impact: Point;
  /** تعدادِ قطعاتِ هدف. کیفیتِ دستگاه این را تعیین می‌کند. */
  shardCount: number;
  seed?: number;
}

/**
 * نمودارِ شکست را می‌سازد.
 *
 * دو سومِ نقاط حولِ محلِ برخورد و با شعاعِ `u^2.2` توزیع می‌شوند (یعنی به‌شدت
 * متراکم در مرکز)، و یک سومِ باقی یکنواخت در کلِ کاشی پخش می‌شود تا گوشه‌ها
 * هم بشکنند و الگو متقارن از آب درنیاید.
 */
export function buildFracture({
  width,
  depth,
  impact,
  shardCount,
  seed = 1,
}: FractureOptions): FractureResult {
  const rng = makeRng(seed);
  const hw = width / 2;
  const hd = depth / 2;
  const maxR = Math.hypot(width, depth) * 0.55;

  const focused = Math.max(3, Math.round(shardCount * 0.65));
  const sites: Point[] = [];

  for (let i = 0; i < focused; i++) {
    const angle = rng() * Math.PI * 2;
    const r = maxR * Math.pow(rng(), 2.2);
    sites.push([
      Math.max(-hw, Math.min(hw, impact[0] + Math.cos(angle) * r)),
      Math.max(-hd, Math.min(hd, impact[1] + Math.sin(angle) * r)),
    ]);
  }
  for (let i = sites.length; i < shardCount; i++) {
    sites.push([(rng() * 2 - 1) * hw, (rng() * 2 - 1) * hd]);
  }

  const rect: Point[] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const cells: FractureCell[] = [];
  const edges: FractureEdge[] = [];
  const seenEdges = new Set<string>();
  let maxDistance = 0;

  for (let i = 0; i < sites.length; i++) {
    let poly = rect;
    for (let j = 0; j < sites.length && poly.length >= 3; j++) {
      if (i === j) continue;
      poly = clipByBisector(poly, sites[i], sites[j]);
    }
    if (poly.length < 3) continue;

    const area = polygonArea(poly);
    // سلول‌های سوزنی هیچ‌چیز به تصویر اضافه نمی‌کنند و فقط draw call می‌خورند.
    if (area < width * depth * 0.0015) continue;

    const centroid = polygonCentroid(poly);
    const distance = Math.hypot(centroid[0] - impact[0], centroid[1] - impact[1]);
    maxDistance = Math.max(maxDistance, distance);
    cells.push({ polygon: poly, centroid, distance, area });

    for (let k = 0; k < poly.length; k++) {
      const a = poly[k];
      const b = poly[(k + 1) % poly.length];
      // یال‌های مشترکِ دو سلول دو بار تولید می‌شوند؛ کلیدِ مرتب‌شده حذفشان می‌کند.
      const key = [a, b]
        .map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`)
        .sort()
        .join("|");
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({
        a,
        b,
        distance: Math.min(
          Math.hypot(a[0] - impact[0], a[1] - impact[1]),
          Math.hypot(b[0] - impact[0], b[1] - impact[1]),
        ),
      });
    }
  }

  return { cells, edges, maxDistance: maxDistance || 1 };
}
