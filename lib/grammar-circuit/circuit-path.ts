/** هندسهٔ مسیرِ مدار — یک منبعِ حقیقت برای هر لایه‌ای که آن را می‌کشد.
 *
 *  لایهٔ SVG و صحنهٔ سه‌بعدی هر دو باید *دقیقاً* یک مسیر را بشناسند. اگر هر
 *  کدام برای خودش حساب کند، روزی سیم در یکی از سوکتش جدا می‌شود و در آن یکی
 *  نه — و آن اختلاف را کسی تا وقتی کاربر نبیندش پیدا نمی‌کند.
 *
 *  هیچ مختصاتی اینجا ساخته نمی‌شود؛ همه از هندسهٔ اندازه‌گیری‌شدهٔ DOM می‌آید. */

export interface CircuitPoint {
  x: number;
  y: number;
}

export interface CircuitSlotGeometry {
  tokenId: string;
  centerX: number;
  centerY: number;
  halfWidth: number;
}

/** یک قطعه از مسیر: یا سیم است یا خودِ شکافِ سوکت. */
export interface CircuitSegment {
  key: string;
  tokenId: string | null;
  from: CircuitPoint;
  to: CircuitPoint;
  /** نقاطِ میانیِ زانو، اگر باشد. */
  via: CircuitPoint[];
  kind: "wire" | "gap";
}

export interface CircuitChain {
  segments: CircuitSegment[];
  /** کلِ مسیر، پشتِ سرِ هم — برای انیمیشنِ جریان. */
  points: CircuitPoint[];
}

/** مسیرِ زانویی — ظاهرِ ردِ مدارِ چاپی و بی‌ابهام از نظر هندسی. */
export function elbow(from: CircuitPoint, to: CircuitPoint): CircuitPoint[] {
  if (Math.abs(from.y - to.y) < 0.5) return [];
  const mid = (from.x + to.x) / 2;
  return [
    { x: mid, y: from.y },
    { x: mid, y: to.y },
  ];
}

export function toSvgPath(points: readonly CircuitPoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

/** زنجیرهٔ باتری ← سوکت‌ها ← لامپ، به ترتیبِ *معناییِ* مدار.
 *
 *  ترتیب از `circuitTokenIds` می‌آید و مرتب‌کردنِ x هیچ نقشی ندارد: مدار از
 *  راست‌ترین هدف به چپ‌ترین می‌رود چون فارسی این‌طور خوانده می‌شود. */
export function buildCircuitChain(
  power: CircuitPoint,
  lamp: CircuitPoint,
  slots: readonly CircuitSlotGeometry[],
  circuitTokenIds: readonly string[],
): CircuitChain {
  const bySlot = new Map(slots.map((s) => [s.tokenId, s]));
  const segments: CircuitSegment[] = [];
  const points: CircuitPoint[] = [power];
  let prev = power;

  circuitTokenIds.forEach((tokenId, index) => {
    const slot = bySlot.get(tokenId);
    if (!slot) return;
    const right: CircuitPoint = { x: slot.centerX + slot.halfWidth, y: slot.centerY };
    const left: CircuitPoint = { x: slot.centerX - slot.halfWidth, y: slot.centerY };
    // ورودی = سرِ نزدیک‌تر به نقطهٔ قبلی، پس ترتیبِ معنایی هرچه باشد سیم
    // منطقی می‌ماند.
    const entry =
      Math.hypot(prev.x - right.x, prev.y - right.y) <=
      Math.hypot(prev.x - left.x, prev.y - left.y)
        ? right
        : left;
    const exit = entry === right ? left : right;

    const via = elbow(prev, entry);
    segments.push({ key: `w-${index}`, tokenId: null, from: prev, to: entry, via, kind: "wire" });
    points.push(...via, entry);

    segments.push({ key: `g-${index}`, tokenId, from: entry, to: exit, via: [], kind: "gap" });
    points.push(exit);
    prev = exit;
  });

  const tailVia = elbow(prev, lamp);
  segments.push({ key: "w-lamp", tokenId: null, from: prev, to: lamp, via: tailVia, kind: "wire" });
  points.push(...tailVia, lamp);

  return { segments, points };
}
