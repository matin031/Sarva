/** هندسهٔ «قطعه روی کدام خانه است؟» — جدا از React و جدا از DOM.
 *
 * ⚠️ چرا اینجا و نه داخلِ `useCircuitDnD`: این منطق دو بار باگِ خاموش داشته و
 * هر دو بار فقط با دست روی گوشی پیدا شد، چون داخلِ یک `useCallback` در دلِ
 * یک هوکِ اشاره‌گر زندگی می‌کرد و هیچ تستی نمی‌توانست صدایش بزند:
 *
 *   ۱. قاعدهٔ «یا دقیقاً داخل، یا هیچ» — روی انگشتِ چهل‌پیکسلی شکست می‌خورد.
 *   ۲. هم‌پوشانیِ دو ناحیهٔ لمسی — بن‌بست می‌ساخت و فقط `console.error` می‌داد.
 *
 * حالا یک تابعِ محض است که فقط عدد می‌گیرد و عدد می‌دهد.
 */

/** همان چیزی که از `getBoundingClientRect` لازم داریم — نه بیشتر. */
export interface HitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HitCandidate {
  tokenId: string;
  rect: HitRect;
}

export type HitTestResult = { kind: "none" } | { kind: "hit"; tokenId: string };

/** فاصلهٔ یک نقطه تا نزدیک‌ترین جای مستطیل (صفر اگر داخلش باشد). */
export function distanceToRect(x: number, y: number, r: HitRect): number {
  const right = r.left + r.width;
  const bottom = r.top + r.height;
  const dx = Math.max(r.left - x, 0, x - right);
  const dy = Math.max(r.top - y, 0, y - bottom);
  return Math.hypot(dx, dy);
}

/**
 * کدام خانه؟
 *
 * سه قاعده، به همین ترتیب:
 *
 *   ۱. اگر نقطه داخلِ یک یا چند خانه است → آنکه *مرکزش* نزدیک‌تر است.
 *   ۲. وگرنه اگر نزدیک‌ترین لبه تا `tolerance` فاصله دارد → همان خانه.
 *   ۳. وگرنه هیچ.
 *
 * قاعدهٔ یکم نکتهٔ اصلی است. ناحیه‌های لمسی عمداً از خودِ سوکت بزرگ‌ترند
 * (`calc(100% + 12px)`)، پس در چیدمانِ فشرده روی هم می‌افتند. حالتِ پیشین
 * این را «مبهم» می‌شمرد و هیچ کاری نمی‌کرد؛ برای کاربر یعنی رها کردن در
 * نوارِ میانیِ دو خانه بی‌اثر است، بی‌آنکه چیزی توضیح بدهد. «نزدیک‌ترین
 * مرکز» همان جوابی است که چشم هم می‌دهد، و چون محض است هر بار یکی است.
 *
 * ⚠️ ترتیبِ `candidates` در تساویِ کامل تعیین‌کننده است (مقایسه اکید است، پس
 * اولی می‌ماند). مصرف‌کننده آن‌ها را به ترتیبِ سند می‌دهد.
 */
export function resolveHitTarget(
  x: number,
  y: number,
  candidates: Iterable<HitCandidate>,
  tolerance = 0,
): HitTestResult {
  let inside: { tokenId: string; centerDistance: number } | null = null;
  let nearest: { tokenId: string; distance: number } | null = null;

  for (const { tokenId, rect } of candidates) {
    // خانه‌ای که هنوز چیده نشده ابعادِ صفر دارد و نامزد نیست.
    if (rect.width === 0 || rect.height === 0) continue;

    const d = distanceToRect(x, y, rect);
    if (d === 0) {
      const centerDistance = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2),
      );
      if (!inside || centerDistance < inside.centerDistance) {
        inside = { tokenId, centerDistance };
      }
    } else if (!nearest || d < nearest.distance) {
      nearest = { tokenId, distance: d };
    }
  }

  if (inside) return { kind: "hit", tokenId: inside.tokenId };
  if (nearest && tolerance > 0 && nearest.distance <= tolerance) {
    return { kind: "hit", tokenId: nearest.tokenId };
  }
  return { kind: "none" };
}
