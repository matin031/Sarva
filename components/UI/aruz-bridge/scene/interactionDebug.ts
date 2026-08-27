/* ═══════════════════════════════════════════════════════════════════════════
   بازرسیِ تعامل — فقط برای توسعه.
   ═══════════════════════════════════════════════════════════════════════════

   با `?debugHits=1` روشن می‌شود و دو کار می‌کند: جعبه‌های برخورد را دیدنی
   می‌کند، و آخرین وضعیتِ تعامل را روی `window.__aruzBridgeHits` می‌گذارد.

   وجود دارد چون ادعای «کلیک روی شیشهٔ راست همیشه به راست می‌رود» را نمی‌شود
   با نگاه‌کردن ثابت کرد؛ باید اندازه گرفت. با این، هم آدم و هم تستِ خودکار
   می‌توانند ببینند کدام کاشی hover شده، کدام انتخاب شده، و بازیکن به کدام
   سمت پریده — بدونِ اینکه کدِ تشخیص در نسخهٔ عمومی روشن باشد.

   برای کاربرِ عادی هرگز فعال نمی‌شود و هیچ چیزی به باندلِ اصلی اضافه
   نمی‌کند جز همین چند خط. */

export interface InteractionDebugState {
  hoveredTileId: string | null;
  lastClickedTileId: string | null;
  lastSelectedSide: "left" | "right" | null;
  lastJumpTarget: { x: number; z: number } | null;
  /** چند کاشی هم‌زمان hover هستند. هر عددِ بیشتر از ۱ یعنی باگ. */
  hoverCount: number;
}

const initial: InteractionDebugState = {
  hoveredTileId: null,
  lastClickedTileId: null,
  lastSelectedSide: null,
  lastJumpTarget: null,
  hoverCount: 0,
};

type DebugWindow = Window & { __aruzBridgeHits?: InteractionDebugState };

export function publishInteractionDebug(patch: Partial<InteractionDebugState>): void {
  if (typeof window === "undefined") return;
  const w = window as DebugWindow;
  w.__aruzBridgeHits = { ...(w.__aruzBridgeHits ?? initial), ...patch };
}

export function isInteractionDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debugHits");
}
