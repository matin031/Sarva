"use client";

import { createPortal } from "react-dom";
import type { DragState } from "./hooks/useCircuitDnD";

/** پیش‌نمایشِ قطعهٔ در حالِ کشیدن.
 *
 *  در یک پورتالِ کنارِ `<body>` رندر می‌شود تا هیچ `overflow`، `z-index` یا
 *  stacking contextی آن را نبُرد. خودش هیچ رویدادی نمی‌گیرد؛ محاسبهٔ مقصد
 *  همیشه با مختصاتِ واقعیِ اشاره‌گر انجام می‌شود، نه با جای دیدنیِ این
 *  پیش‌نمایش (که روی لمس عمداً کمی بالاتر از انگشت است). */
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
    <div className="gc-drag-layer gc-root" aria-hidden>
      <div
        ref={ghostRef}
        className="gc-drag-ghost gc-module"
        style={{ width: drag.width, height: drag.height }}
      >
        {label}
      </div>
    </div>,
    document.body,
  );
}
