"use client";

import { createPortal } from "react-dom";
import type { DragState } from "./hooks/useCircuitDnD";

/** پیش‌نمایشِ قطعهٔ در حالِ کشیدن.
 *
 *  در پورتالی کنارِ `<body>` رندر می‌شود تا هیچ `overflow`، `z-index` یا
 *  stacking contextی آن را نبُرد.
 *
 *  ── ریشهٔ باگِ «قطعه از گوشهٔ بالا-چپ می‌پرد» ─────────────────────────────
 *  پیش‌تر جای پیش‌نمایش فقط در یک افکت و با `transform` نوشته می‌شد. ولی
 *  React اول عنصر را *بدونِ* آن transform می‌نشاند و افکت‌ها یک قدم بعد اجرا
 *  می‌شوند؛ در آن یک فریم، عنصر روی مبدأ یعنی گوشهٔ بالا-چپِ صفحه بود. حالا
 *  جای اولیه همراهِ خودِ state می‌آید و در همان اولین رندر روی عنصر می‌نشیند،
 *  پس هیچ فریمی در جای غلط وجود ندارد.
 *
 *  همهٔ مختصات‌ها مختصاتِ پنجره‌اند (`position: fixed`)؛ هیچ‌جا با اسکرولِ سند
 *  یا `devicePixelRatio` قاطی نمی‌شود. */
export default function DragGhostLayer({
  drag,
  label,
  ghostRef,
}: {
  drag: DragState | null;
  label: string;
  ghostRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!drag || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="gc-drag-layer gc-root"
      style={{ position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none" }}
      aria-hidden
    >
      <div
        ref={ghostRef}
        className="gc-drag-ghost gc-module"
        data-dragging="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: drag.width,
          height: drag.height,
          transform: `translate3d(${drag.originLeft}px, ${drag.originTop}px, 0)`,
        }}
      >
        <span aria-hidden className="gc-module-pin" style={{ insetInlineStart: 12 }} />
        <span aria-hidden className="gc-module-pin" style={{ insetInlineEnd: 12 }} />
        {label}
      </div>
    </div>,
    document.body,
  );
}
