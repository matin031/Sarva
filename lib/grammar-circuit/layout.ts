/** هندسهٔ نوارِ سوکت‌ها — توابعِ خالص، تا بشود بدونِ مرورگر آزمودشان.
 *
 *  مسئله: سوکت باید زیرِ *مرکزِ* واژه بنشیند، ولی واژه‌های کوتاهِ پشتِ هم
 *  («من تو را به او…») مرکزهایی نزدیک‌تر از عرضِ سوکت دارند. راهِ غلط این است
 *  که واژه‌ها را از هم باز کنیم؛ آن‌وقت جمله دیگر فارسیِ طبیعی نیست. راهِ
 *  درست: تایپوگرافیِ جمله دست‌نخورده بماند و سوکت‌ها با کمترین جابه‌جاییِ ممکن
 *  از هم باز شوند، و هر سوکتی که جابه‌جا شد با یک خطِ راهنما به واژه‌اش وصل شود.
 */

export interface SlotPositionInput {
  /** مرکزِ دلخواه (مرکزِ واژه) در مختصاتِ CircuitContent، به ترتیبِ توکن‌ها. */
  desiredCenters: readonly number[];
  /** کمینهٔ فاصلهٔ مرکز تا مرکز = عرضِ سوکت + فاصلهٔ سوکت‌ها. */
  minSeparation: number;
  /** ‎-۱ برای راست‌به‌چپ (x با پیشرفتِ جمله کم می‌شود). */
  direction: 1 | -1;
  /** بازهٔ مجازِ مرکزها. */
  minCenter: number;
  maxCenter: number;
}

/** رگرسیونِ یکنوا (PAVA): جوابِ بهینه در معیارِ کمترین مجموعِ مربعاتِ جابه‌جایی،
 *  با حفظِ ترتیبِ توکن‌ها و رعایتِ حداقلِ فاصله. */
export function solveSlotCenters(input: SlotPositionInput): number[] {
  const { desiredCenters, minSeparation, direction, minCenter, maxCenter } = input;
  const n = desiredCenters.length;
  if (n === 0) return [];

  // به مختصاتی می‌رویم که با پیشرفتِ جمله همیشه زیاد می‌شود، بعد قیدِ
  // «u[i+1] ≥ u[i] + d» را با یک انتقال به «یکنوا بودنِ v» تبدیل می‌کنیم.
  const v = desiredCenters.map((c, i) => direction * c - i * minSeparation);

  const blocks: Array<{ sum: number; count: number }> = [];
  for (const value of v) {
    blocks.push({ sum: value, count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1];
      const prev = blocks[blocks.length - 2];
      if (prev.sum / prev.count <= last.sum / last.count) break;
      prev.sum += last.sum;
      prev.count += last.count;
      blocks.pop();
    }
  }

  const solved: number[] = [];
  for (const block of blocks) {
    const mean = block.sum / block.count;
    for (let k = 0; k < block.count; k++) solved.push(mean);
  }

  let centers = solved.map((value, i) => direction * (value + i * minSeparation));

  // کلِ زنجیره را داخلِ بازه می‌سُرانیم؛ انتقالِ یکسان، فاصله‌ها را خراب نمی‌کند.
  let low = Math.min(...centers);
  let high = Math.max(...centers);
  if (low < minCenter) {
    const shift = minCenter - low;
    centers = centers.map((c) => c + shift);
    low += shift;
    high += shift;
  }
  if (high > maxCenter) {
    const shift = high - maxCenter;
    // اگر زنجیره از خودِ بازه پهن‌تر باشد، ترجیح با دیده‌شدنِ ابتدای خواندن است.
    const clamped = Math.min(shift, low - minCenter);
    centers = centers.map((c) => c - clamped);
  }

  return centers;
}

export interface HitExtent {
  /** فاصلهٔ لبهٔ چپِ ناحیهٔ لمسی از مرکز (مثبت). */
  left: number;
  /** فاصلهٔ لبهٔ راستِ ناحیهٔ لمسی از مرکز (مثبت). */
  right: number;
}

/** ناحیهٔ لمسی از سوکتِ دیداری بزرگ‌تر است تا با انگشت راحت باشد — ولی هرگز
 *  تا جایی بزرگ نمی‌شود که به همسایه بچسبد. بینِ هر دو ناحیه دستِ‌کم `minGap`
 *  پیکسل فاصلهٔ واقعی می‌ماند، وگرنه «افتادن در شکاف» معنایش را از دست می‌دهد. */
export function solveHitExtents(
  centers: readonly number[],
  slotWidth: number,
  padding: number,
  minGap: number,
): HitExtent[] {
  const half = slotWidth / 2;
  const wanted = half + padding;
  const extents: HitExtent[] = centers.map(() => ({ left: wanted, right: wanted }));

  const order = centers
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c - b.c);

  for (let k = 0; k + 1 < order.length; k++) {
    const a = order[k];
    const b = order[k + 1];
    const budget = b.c - a.c - minGap;
    if (budget >= wanted * 2) continue;
    // فضای موجود را نصف‌به‌نصف تقسیم می‌کنیم؛ کف‌اش خودِ سوکتِ دیداری است تا
    // چیزی که کاربر می‌بیند همیشه قابلِ هدف‌گیری بماند.
    const share = Math.max(1, Math.min(wanted, budget / 2));
    extents[a.i].right = Math.min(extents[a.i].right, share);
    extents[b.i].left = Math.min(extents[b.i].left, share);
  }

  return extents;
}

/** کمینه عرضی که نوارِ سوکت‌ها لازم دارد. پیش از اندازه‌گیری به‌عنوان
 *  `min-width` روی ردیفِ جمله می‌نشیند تا حل‌کننده هیچ‌وقت مجبور به فشردنِ
 *  سوکت‌ها نشود — و چون از قبل حساب می‌شود، حلقهٔ اندازه‌گیری ← چیدمان ←
 *  اندازه‌گیری پیش نمی‌آید. */
export function minimumLaneWidth(
  slotCount: number,
  slotWidth: number,
  slotGap: number,
): number {
  if (slotCount === 0) return 0;
  return slotCount * slotWidth + (slotCount - 1) * slotGap;
}

/** آیا دو مستطیل آن‌قدر هم‌پوشانی دارند که هدف‌گیری مبهم شود؟ */
export function rectsOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
  tolerance = 0.5,
): boolean {
  return (
    a.left < b.right - tolerance &&
    b.left < a.right - tolerance &&
    a.top < b.bottom - tolerance &&
    b.top < a.bottom - tolerance
  );
}
