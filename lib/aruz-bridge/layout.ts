import type { Side } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   هندسهٔ دنیای بازی. یک واحد = یک متر.
   ═══════════════════════════════════════════════════════════════════════════

   پل در جهتِ z منفی جلو می‌رود. بازیکن از سکوی آغاز در z=0 شروع می‌کند و هر
   مرحله یک `STEP_DEPTH` جلوتر می‌رود. دوربین پشتِ سرِ اوست، یعنی در z مثبت.

   «چپ» و «راست» از دیدِ بازیکن و دوربین است: چون هر دو رو به z منفی‌اند،
   سمتِ چپِ تصویر همان x منفی است.
   ═══════════════════════════════════════════════════════════════════════════ */

/** کاشی باید به‌قدرِ یک سکوی واقعی بزرگ باشد؛ کوچک‌تر از این، پرش بی‌معنا می‌شود. */
export const TILE_WIDTH = 1.5;
export const TILE_DEPTH = 1.5;
/** ضخامتِ واقعی و دیدنی. صفحهٔ بی‌ضخامت هرگز شبیهِ شیشه نمی‌شود. */
export const TILE_THICKNESS = 0.14;

/** نصفِ فاصلهٔ مرکزِ دو کاشی. ۰٫۶ متر شکافِ میانی باقی می‌گذارد. */
export const LANE_OFFSET = 1.05;
export const STEP_DEPTH = 2.6;

/** ارتفاعِ سطحِ پل. پایینِ آن، تهی است. */
export const BRIDGE_Y = 0;

export const PLAYER_HEIGHT = 1.05;

export function tileX(side: Side): number {
  return side === "left" ? -LANE_OFFSET : LANE_OFFSET;
}

/** z مرکزِ کاشی‌های مرحلهٔ `index` (از صفر). */
export function stepZ(index: number): number {
  return -(index + 1) * STEP_DEPTH;
}

/** جایی که بازیکن پیش از مرحلهٔ `index` ایستاده است. */
export function standZ(index: number): number {
  return index === 0 ? 0 : stepZ(index - 1);
}

export type Vec3 = [number, number, number];

/** موقعیتِ ایستادنِ بازیکن روی کاشیِ یک مرحله. */
export function tilePosition(index: number, side: Side): Vec3 {
  return [tileX(side), BRIDGE_Y, stepZ(index)];
}

/**
 * جایی که بازیکن پیش از مرحلهٔ `index` می‌ایستد.
 *
 * مرحلهٔ صفر روی سکوی آغاز (وسط) است؛ بقیه روی کاشیِ درستِ مرحلهٔ قبل، پس
 * سمتِ ایستادنِ فعلی به پاسخِ درستِ قبلی وابسته است.
 */
export function standPosition(index: number, previousSide: Side | null): Vec3 {
  if (index === 0 || previousSide === null) return [0, BRIDGE_Y, 0];
  return [tileX(previousSide), BRIDGE_Y, stepZ(index - 1)];
}
