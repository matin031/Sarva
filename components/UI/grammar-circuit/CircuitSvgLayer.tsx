"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GrammarCircuitConfig } from "@/lib/grammar-circuit";
import type { SlotValidation } from "@/lib/grammar-circuit/reducer";
import type { CircuitGeometry } from "./hooks/useCircuitLayout";

/** لایهٔ مدار.
 *
 *  سه قاعده که هرگز شکسته نمی‌شوند:
 *
 *  • هیچ مختصاتی دستی نوشته نشده؛ هر نقطه از هندسهٔ واقعیِ DOM می‌آید.
 *  • هیچ‌چیزِ این لایه ورودی نمی‌گیرد؛ سیم و هاله نباید هدفِ رها کردن شوند.
 *  • **روکش است: چیدمان را می‌خواند، ولی نمی‌سازد.** بیرون بودنش از جریانِ
 *    چیدمان با style درون‌خطی تضمین می‌شود، نه با کلاسی که ممکن است نرسد.
 *
 *  ترتیبِ مدار *معنایی* است و از `validationOrder` می‌آید — از راست‌ترین هدف
 *  به چپ‌ترین، یعنی جهتِ خواندنِ فارسی. مرتب‌کردنِ مختصاتِ x هیچ نقشی ندارد. */

export type CurrentPhase = "idle" | "traveling" | "live";

interface Point {
  x: number;
  y: number;
}

export interface CircuitSvgLayerProps {
  geometry: CircuitGeometry | null;
  measured: boolean;
  /** توکن‌ها به ترتیبِ معناییِ مدار: باتری ← ... ← لامپ. */
  circuitTokenIds: readonly string[];
  placements: Readonly<Record<string, string>>;
  validation: Readonly<Record<string, SlotValidation>>;
  phase: CurrentPhase;
  reducedMotion: boolean;
  config: GrammarCircuitConfig;
  epoch: number;
  runId: number;
  onCurrentFinished: (epoch: number, runId: number) => void;
}

function toPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

/** مسیرِ زانویی — ظاهرِ ردِ مدارِ چاپی و بی‌ابهام از نظر هندسی. */
function elbow(from: Point, to: Point): Point[] {
  if (Math.abs(from.y - to.y) < 0.5) return [];
  const mid = (from.x + to.x) / 2;
  return [
    { x: mid, y: from.y },
    { x: mid, y: to.y },
  ];
}

export default function CircuitSvgLayer({
  geometry,
  measured,
  circuitTokenIds,
  placements,
  validation,
  phase,
  reducedMotion,
  config,
  epoch,
  runId,
  onCurrentFinished,
}: CircuitSvgLayerProps) {
  const currentRef = useRef<SVGPathElement | null>(null);

  const { segments, fullPath } = useMemo(() => {
    if (!geometry?.power || !geometry.lamp) {
      return { segments: [] as Array<{ key: string; d: string; kind: string }>, fullPath: "" };
    }
    const bySlot = new Map(geometry.slots.map((s) => [s.tokenId, s]));
    const segs: Array<{ key: string; d: string; kind: string }> = [];
    const chain: Point[] = [geometry.power];
    let prev = geometry.power;

    circuitTokenIds.forEach((tokenId, index) => {
      const slot = bySlot.get(tokenId);
      if (!slot) return;
      const right: Point = { x: slot.centerX + slot.halfWidth, y: slot.centerY };
      const left: Point = { x: slot.centerX - slot.halfWidth, y: slot.centerY };
      // ورودی = سرِ نزدیک‌تر به نقطهٔ قبلی، پس ترتیبِ معنایی هرچه باشد سیم
      // منطقی می‌ماند.
      const entry =
        Math.hypot(prev.x - right.x, prev.y - right.y) <=
        Math.hypot(prev.x - left.x, prev.y - left.y)
          ? right
          : left;
      const exit = entry === right ? left : right;

      const lead = [...elbow(prev, entry), entry];
      segs.push({ key: `w-${index}`, d: toPath([prev, ...lead]), kind: "wire" });
      chain.push(...lead);

      /* خودِ سوکت، شکافِ مدار است. رنگش را *نتیجهٔ تشخیص* تعیین می‌کند، نه
         پر بودنِ خانه: تا پیش از «بررسی اتصال» همه خنثی‌اند. */
      const state = validation[tokenId];
      const kind =
        state === "correct"
          ? "ok"
          : state === "wrong"
            ? "bad"
            : state === "checking"
              ? "scan"
              : placements[tokenId]
                ? "seated"
                : "open";
      segs.push({ key: `g-${index}`, d: toPath([entry, exit]), kind });
      chain.push(exit);
      prev = exit;
    });

    const tail = [...elbow(prev, geometry.lamp), geometry.lamp];
    segs.push({ key: "w-lamp", d: toPath([prev, ...tail]), kind: "wire" });
    chain.push(...tail);

    return { segments: segs, fullPath: toPath(chain) };
  }, [circuitTokenIds, geometry, placements, validation]);

  /* جریانِ کامل — فقط وقتی همهٔ خانه‌ها تأیید شده‌اند. با WAAPI اجرا می‌شود،
     نه با state در هر فریم. */
  useEffect(() => {
    if (phase !== "traveling") return;
    const path = currentRef.current;
    let timer: number | undefined;
    let animation: Animation | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onCurrentFinished(epoch, runId);
    };

    if (!path || !fullPath) {
      timer = window.setTimeout(finish, 0);
      return () => clearTimeout(timer);
    }

    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) {
      timer = window.setTimeout(finish, 0);
      return () => clearTimeout(timer);
    }

    // مدت از طولِ *واقعیِ* مسیر می‌آید، نه عددی ثابت برای همهٔ صفحه‌ها.
    const raw = (length / config.currentTravelSpeedPxPerSec) * 1000;
    const duration = reducedMotion
      ? Math.min(config.currentTravelMinDurationMs, 320)
      : Math.min(
          config.currentTravelMaxDurationMs,
          Math.max(config.currentTravelMinDurationMs, raw),
        );

    const head = Math.max(48, length * 0.18);
    path.style.strokeDasharray = `${head} ${length + head}`;

    if (typeof path.animate === "function") {
      animation = path.animate(
        [{ strokeDashoffset: head }, { strokeDashoffset: -length }],
        { duration, easing: "linear", fill: "forwards" },
      );
      animation.onfinish = finish;
      timer = window.setTimeout(finish, duration + 250);
    } else {
      timer = window.setTimeout(finish, duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
      }
      path.style.strokeDasharray = "";
    };
  }, [config, epoch, fullPath, onCurrentFinished, phase, reducedMotion, runId]);

  const width = geometry?.contentWidth ?? 0;
  const height = geometry?.contentHeight ?? 0;

  return (
    <svg
      className="gc-svg"
      data-measured={measured ? "true" : "false"}
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      /* اندازه و موقعیت هر دو درون‌خطی‌اند: حتی اگر شیوه‌نامهٔ بازی نرسد، این
         عنصر از جریانِ چیدمان بیرون می‌ماند و نمی‌تواند والدش را بزرگ کند. */
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${Math.max(width, 1)}px`,
        height: `${Math.max(height, 1)}px`,
        overflow: "visible",
        pointerEvents: "none",
      }}
      aria-hidden
      focusable="false"
    >
      {segments.map((s) => (
        <path key={s.key} className={`gc-wire gc-wire-${s.kind}`} d={s.d} fill="none" />
      ))}
      {phase !== "idle" && fullPath && (
        <path ref={currentRef} className="gc-current" d={fullPath} fill="none" />
      )}
    </svg>
  );
}
