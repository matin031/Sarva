"use client";

import { useEffect, useRef } from "react";
import { rectsOverlap } from "@/lib/grammar-circuit";
import type { CircuitGeometry } from "./hooks/useCircuitLayout";
import { HIT_HEIGHT, LANE_HEIGHT, SLOT_HEIGHT } from "./constants";

/** نوارِ سوکت‌ها.
 *
 *  دو چیز اینجا عمداً از هم جدا شده‌اند:
 *
 *  • سوکتِ *دیداری* — چیزی که کاربر می‌بیند، بدونِ هیچ رویدادِ اشاره‌گری.
 *  • ناحیهٔ *لمسی* — یک هدفِ اختصاصی، انگشتی‌پسند ولی محدود، که هرگز با
 *    همسایه‌اش هم‌پوشانی ندارد.
 *
 *  سوکتِ پرشده اصلاً ناحیهٔ لمسی ندارد: نه drop می‌گیرد، نه tap، نه click. رها
 *  کردن روی آن «پاسخِ غلط» نیست؛ فقط بی‌اثر است.
 *
 *  هندسهٔ سوکت هم از لحظهٔ اول رزرو می‌شود؛ نشستنِ ماژول عرض یا جای سوکت را
 *  تکان نمی‌دهد و فقط ظاهرِ داخلش عوض می‌شود. */
export interface SlotLaneProps {
  laneRef: React.RefObject<HTMLDivElement | null>;
  geometry: CircuitGeometry | null;
  slotTokenIds: readonly string[];
  placements: Readonly<Record<string, string>>;
  labelForPlacement: (pieceId: string) => string;
  slotWidth: number;
  activeTargetTokenId: string | null;
  rejectedTokenId: string | null;
  freshTokenId: string | null;
  interactive: boolean;
  onTapSlot: (tokenId: string, viaKeyboard: boolean) => void;
  registerHitTarget: (tokenId: string, el: HTMLElement | null) => void;
}

export default function SlotLane({
  laneRef,
  geometry,
  slotTokenIds,
  placements,
  labelForPlacement,
  slotWidth,
  activeTargetTokenId,
  rejectedTokenId,
  freshTokenId,
  interactive,
  onTapSlot,
  registerHitTarget,
}: SlotLaneProps) {
  const hitRefs = useRef(new Map<string, HTMLElement>());

  // در حالتِ توسعه، بعد از هر چیدمان مطمئن می‌شویم هیچ دو ناحیهٔ لمسی روی هم
  // نیفتاده‌اند. هم‌پوشانیِ بی‌صدا یعنی رها کردن در نقطه‌ای که کاربر مطمئن است
  // «الف» است ممکن است «ب» شود — بدترین نوعِ باگ، چون کسی گزارشش نمی‌کند.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const raf = requestAnimationFrame(() => {
      const entries = [...hitRefs.current.entries()].map(([id, el]) => ({
        id,
        rect: el.getBoundingClientRect(),
      }));
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          if (rectsOverlap(entries[i].rect, entries[j].rect)) {
            console.error(
              `[grammar-circuit] ناحیه‌های لمسیِ «${entries[i].id}» و «${entries[j].id}» ` +
                "هم‌پوشانی دارند؛ هدف‌گیری مبهم می‌شود.",
            );
          }
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [geometry, placements]);

  const bySlot = new Map(geometry?.slots.map((s) => [s.tokenId, s]) ?? []);
  const laneOffsetX = geometry?.laneOffsetX ?? 0;

  return (
    <div
      ref={laneRef}
      className="gc-lane"
      /* `position` درون‌خطی است چون سوکت‌ها نسبت به همین کادر مطلق می‌نشینند؛
         اگر این یکی از دست برود، سوکت‌ها به کلِ صفحه فرار می‌کنند. */
      style={{ position: "relative", width: "100%", height: LANE_HEIGHT }}
    >
      {slotTokenIds.map((tokenId) => {
        const slot = bySlot.get(tokenId);
        const pieceId = placements[tokenId];
        const connected = Boolean(pieceId);
        // تا وقتی اندازه‌گیری معتبر نشده هیچ سوکتی جای غلط نمی‌گیرد.
        if (!slot) return null;
        const centerInLane = slot.centerX - laneOffsetX;

        return (
          <div key={tokenId}>
            <div
              className={`gc-socket${rejectedTokenId === tokenId ? " gc-reject" : ""}`}
              style={{
                position: "absolute",
                top: "50%",
                translate: "-50% -50%",
                left: centerInLane,
                width: slotWidth,
                height: SLOT_HEIGHT,
              }}
              data-target={activeTargetTokenId === tokenId || undefined}
              data-connected={connected || undefined}
              data-reject={rejectedTokenId === tokenId || undefined}
              aria-hidden
            >
              {connected ? (
                <span
                  /* تماسِ موضعی: همان لحظه‌ای که قطعه می‌نشیند یک درخششِ کوتاهِ
                     محلی دارد. این *جریانِ کامل* نیست — تا آخرین شکاف بسته
                     نشود، هیچ جریانی به لامپ نمی‌رسد. */
                  className={`gc-module-seated${
                    freshTokenId === tokenId ? " gc-contact-pulse" : ""
                  }`}
                  data-fresh={freshTokenId === tokenId || undefined}
                >
                  {labelForPlacement(pieceId)}
                </span>
              ) : (
                <span className="text-[var(--gc-text-muted)] text-lg leading-none">؟</span>
              )}
            </div>

            {!connected && (
              <button
                type="button"
                ref={(el) => {
                  if (el) hitRefs.current.set(tokenId, el);
                  else hitRefs.current.delete(tokenId);
                  registerHitTarget(tokenId, el);
                }}
                className="gc-socket-hit"
                style={{
                  position: "absolute",
                  top: "50%",
                  translate: "0 -50%",
                  left: centerInLane - slot.hitLeft,
                  width: slot.hitLeft + slot.hitRight,
                  height: HIT_HEIGHT,
                }}
                disabled={!interactive}
                aria-label="سوکتِ خالی — نقش را اینجا وصل کن"
                onClick={(event) => onTapSlot(tokenId, event.detail === 0)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
