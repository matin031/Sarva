/** تطبیقِ سوکت‌ها با قطعه‌ها — و آزمونِ «بن‌بست‌ناپذیری».
 *
 *  اینجا دو سؤالِ متفاوت جواب داده می‌شود:
 *
 *  ۱) آیا اصلاً یک چینشِ کاملِ درست وجود دارد؟ (شمردنِ نقش‌ها کافی نیست: یک
 *     سوکت ممکن است چند نقش را بپذیرد و شمارش، تداخل‌ها را نمی‌بیند.)
 *
 *  ۲) و مهم‌تر: آیا هر پاسخِ *علمیِ مجازی* که دانش‌آموز می‌تواند بدهد، بازی را
 *     همچنان قابل‌حل نگه می‌دارد؟ یک سؤال ممکن است از ابتدا حل‌شدنی باشد ولی
 *     یک انتخابِ درست، بقیه را غیرممکن کند:
 *
 *        سوکت الف: نهاد یا مفعول      قطعه‌ها: نهاد، مفعول
 *        سوکت ب : فقط نهاد
 *
 *     گذاشتنِ «نهاد» روی الف از نظر علمی مجاز است ولی ب را بی‌جواب می‌کند.
 *     چنین سؤالی رد می‌شود؛ تنبیه‌کردنِ یک پاسخِ درست به‌خاطرِ طراحیِ سینی
 *     قابل قبول نیست.
 *
 *  چون قطعه‌های هم‌نقش از نظرِ حل‌پذیری تفکیک‌ناپذیرند، حالت‌ها با «چند تا از
 *  هر نقش مصرف شده» نمایش داده می‌شوند نه «کدام نمونه». همین، فضای جست‌وجو را
 *  از فاکتوریلِ نمونه‌ها به چیزی کوچک و قابلِ پیمایش کم می‌کند.
 */

export interface MatchingSlot {
  /** فقط برای پیام‌های خطا. */
  id: string;
  acceptedRoleKeys: readonly string[];
}

/** سقفِ ایمنی: سؤالِ سالم هرگز به این نزدیک نمی‌شود؛ اگر رسید، به‌جای قفل‌شدن
 *  با تشخیصِ روشن رد می‌شود. */
const MAX_SLOTS = 16;
const MAX_STATES = 200_000;

/** نمایشِ فشردهٔ ورودی: نقش‌ها به اندیس نگاشته می‌شوند و ظرفیتِ هر نقش،
 *  تعدادِ قطعه‌های آن نقش است. */
interface CompiledProblem {
  roleKeys: string[];
  /** برای هر سوکت، اندیسِ نقش‌های پذیرفته (بدون تکرار، مرتب). */
  slotRoles: number[][];
  capacities: number[];
  slotCount: number;
}

function compile(
  slots: readonly MatchingSlot[],
  pieceRoleKeys: readonly string[],
): CompiledProblem {
  const roleIndex = new Map<string, number>();
  const roleKeys: string[] = [];
  const indexOf = (key: string) => {
    let i = roleIndex.get(key);
    if (i === undefined) {
      i = roleKeys.length;
      roleIndex.set(key, i);
      roleKeys.push(key);
    }
    return i;
  };

  const capacities: number[] = [];
  for (const key of pieceRoleKeys) {
    const i = indexOf(key);
    capacities[i] = (capacities[i] ?? 0) + 1;
  }

  const slotRoles = slots.map((slot) => {
    const seen = new Set<number>();
    for (const key of slot.acceptedRoleKeys) {
      // نقشی که هیچ قطعه‌ای ندارد، یال نیست؛ ولی باید در roleKeys ثبت شود تا
      // ظرفیتِ صفرش تعریف‌شده بماند.
      const i = indexOf(key);
      if (capacities[i] === undefined) capacities[i] = 0;
      seen.add(i);
    }
    return [...seen].sort((a, b) => a - b);
  });

  for (let i = 0; i < roleKeys.length; i++) {
    if (capacities[i] === undefined) capacities[i] = 0;
  }

  return { roleKeys, slotRoles, capacities, slotCount: slots.length };
}

/** آیا سوکت‌های باقی‌مانده با موجودیِ باقی‌ماندهٔ نقش‌ها کاملاً پر می‌شوند؟
 *
 *  مسیرهای افزایشیِ کوهن روی گرافِ دوبخشیِ «سوکت ↔ نقش» با ظرفیت. ظرفیت‌ها
 *  کوچک‌اند، پس همین ساده‌ترین شکل هم سریع است. */
function hasFullAssignment(
  problem: CompiledProblem,
  remainingSlots: readonly number[],
  remainingCapacity: readonly number[],
): boolean {
  const used = remainingCapacity.slice();
  /** برای هر نقش، فهرستِ سوکت‌هایی که فعلاً به آن نسبت داده شده‌اند. */
  const assignedTo: number[][] = problem.roleKeys.map(() => []);

  const tryAssign = (slot: number, visited: Set<number>): boolean => {
    for (const role of problem.slotRoles[slot]) {
      if (visited.has(role)) continue;
      visited.add(role);
      if (used[role] > 0) {
        used[role] -= 1;
        assignedTo[role].push(slot);
        return true;
      }
      // ظرفیتِ این نقش پر است — ببین یکی از مصرف‌کننده‌هایش می‌تواند جابه‌جا شود.
      for (const other of assignedTo[role]) {
        if (tryAssign(other, visited)) {
          // `other` نقشِ دیگری گرفت؛ جای خالی‌اش را بگیر.
          const at = assignedTo[role].indexOf(other);
          if (at >= 0) assignedTo[role].splice(at, 1);
          assignedTo[role].push(slot);
          return true;
        }
      }
    }
    return false;
  };

  for (const slot of remainingSlots) {
    if (!tryAssign(slot, new Set())) return false;
  }
  return true;
}

export interface FeasibilityResult {
  ok: boolean;
  reason?: string;
}

/** آزمونِ ۱ — از حالتِ خالی، دستِ‌کم یک چینشِ کامل وجود دارد. */
export function hasCompleteAssignment(
  slots: readonly MatchingSlot[],
  pieceRoleKeys: readonly string[],
): FeasibilityResult {
  if (slots.length === 0) return { ok: false, reason: "هیچ سوکتی وجود ندارد." };
  if (slots.length > MAX_SLOTS) {
    return { ok: false, reason: `تعدادِ سوکت‌ها بیش از ${MAX_SLOTS} است.` };
  }
  const problem = compile(slots, pieceRoleKeys);
  const all = problem.slotRoles.map((_, i) => i);
  const ok = hasFullAssignment(problem, all, problem.capacities);
  return ok
    ? { ok: true }
    : {
        ok: false,
        reason:
          "هیچ چینشِ کاملی وجود ندارد: قطعه‌های سینی نمی‌توانند همهٔ سوکت‌ها را پر کنند.",
      };
}

/** آزمونِ ۲ — بن‌بست‌ناپذیری.
 *
 *  از حالتِ خالی شروع می‌کنیم؛ هر حالتِ «امن» (یعنی باقی‌مانده‌اش چینشِ کامل
 *  دارد) را باز می‌کنیم و *همهٔ* گذاشتن‌های علمیِ مجاز از آن حالت را می‌سنجیم.
 *  اگر یکی از آن‌ها به حالتی برسد که دیگر چینشِ کامل ندارد، سؤال ردّ می‌شود و
 *  دقیقاً همان یال گزارش می‌شود. */
export function isChoiceSafe(
  slots: readonly MatchingSlot[],
  pieceRoleKeys: readonly string[],
): FeasibilityResult {
  const feasible = hasCompleteAssignment(slots, pieceRoleKeys);
  if (!feasible.ok) return feasible;

  const problem = compile(slots, pieceRoleKeys);
  const roleCount = problem.roleKeys.length;

  /** کلیدِ حالت: ماسکِ سوکت‌های پرشده + بردارِ مصرفِ هر نقش. کدام *نمونهٔ*
   *  قطعه مصرف شده اهمیتی ندارد، و همین جست‌وجو را کوچک نگه می‌دارد. */
  const keyOf = (mask: number, consumed: readonly number[]) =>
    `${mask}|${consumed.join(",")}`;

  const seen = new Set<string>();
  const queue: Array<{ mask: number; consumed: number[] }> = [
    { mask: 0, consumed: new Array<number>(roleCount).fill(0) },
  ];
  seen.add(keyOf(0, queue[0].consumed));

  let visited = 0;

  while (queue.length > 0) {
    const state = queue.pop()!;
    visited += 1;
    if (visited > MAX_STATES) {
      return {
        ok: false,
        reason:
          "فضای حالتِ این سؤال برای بررسیِ بن‌بست‌ناپذیری بیش از حد بزرگ است.",
      };
    }

    const remainingSlots: number[] = [];
    for (let s = 0; s < problem.slotCount; s++) {
      if ((state.mask & (1 << s)) === 0) remainingSlots.push(s);
    }
    if (remainingSlots.length === 0) continue;

    const remainingCapacity = problem.capacities.map(
      (c, i) => c - state.consumed[i],
    );

    for (const slot of remainingSlots) {
      for (const role of problem.slotRoles[slot]) {
        if (remainingCapacity[role] <= 0) continue; // یالِ ناموجود، نه بن‌بست

        const nextConsumed = state.consumed.slice();
        nextConsumed[role] += 1;
        const nextMask = state.mask | (1 << slot);

        const key = keyOf(nextMask, nextConsumed);
        if (seen.has(key)) continue;

        const nextRemainingSlots = remainingSlots.filter((s) => s !== slot);
        const nextCapacity = remainingCapacity.slice();
        nextCapacity[role] -= 1;

        if (
          nextRemainingSlots.length > 0 &&
          !hasFullAssignment(problem, nextRemainingSlots, nextCapacity)
        ) {
          return {
            ok: false,
            reason:
              `سؤال بن‌بست‌پذیر است: گذاشتنِ نقشِ «${problem.roleKeys[role]}» روی ` +
              `سوکتِ «${slots[slot].id}» از نظر علمی مجاز است ولی بقیهٔ سوکت‌ها را بی‌جواب می‌کند.`,
          };
        }

        seen.add(key);
        queue.push({ mask: nextMask, consumed: nextConsumed });
      }
    }
  }

  return { ok: true };
}
