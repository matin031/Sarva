"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GrammarCircuitConfig } from "@/lib/grammar-circuit";
import type { CircuitGeometry } from "./hooks/useCircuitLayout";
import { SLOT_HEIGHT } from "./constants";

/** لایهٔ مدار.
 *
 *  سه قاعده که هرگز شکسته نمی‌شوند:
 *
 *  • هیچ مختصاتی اینجا دستی نوشته نشده. هر نقطه از هندسهٔ واقعیِ DOM می‌آید.
 *  • هیچ‌چیزِ این لایه ورودیِ کاربر نمی‌گیرد. سیم و خطِ راهنما و هاله نباید
 *    بتوانند هدفِ رها کردن شوند.
 *  • **این لایه یک روکش است: چیدمان را می‌خواند، ولی نمی‌سازد.** بیرون بودنش
 *    از جریانِ چیدمان با style درون‌خطی تضمین می‌شود، نه با یک کلاسِ CSS که
 *    ممکن است نرسد. یک بار همین اتفاق افتاد و چون اندازهٔ svg از کادرِ والدش
 *    می‌آمد و خودش هم فرزندِ همان والد بود، ارتفاع تا ده‌ها هزار پیکسل بالا
 *    رفت. حالا هم موقعیت درون‌خطی است و هم اندازه از لنگرهای معنایی می‌آید.
 *
 *  ترتیبِ مدار *معنایی* است و از `circuitOrder` می‌آید؛ جای عناصر روی صفحه
 *  هیچ‌وقت آن را تعیین نمی‌کند. */

export type CurrentPhase = "idle" | "traveling" | "done";

interface Point {
  x: number;
  y: number;
}

interface Segment {
  key: string;
  points: Point[];
  kind: "wire" | "open" | "closed";
}

export interface CircuitSvgLayerProps {
  geometry: CircuitGeometry | null;
  measured: boolean;
  /** شناسهٔ توکن‌ها به ترتیبِ *معناییِ* مدار. */
  circuitTokenIds: readonly string[];
  placements: Readonly<Record<string, string>>;
  slotWidth: number;
  leaderLineThreshold: number;
  phase: CurrentPhase;
  reducedMotion: boolean;
  config: GrammarCircuitConfig;
  /** با epoch محافظت می‌شود: کالبکِ کهنه نباید به حالتِ جدید دست بزند. */
  epoch: number;
  onCurrentFinished: (epoch: number) => void;
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

function toPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

export default function CircuitSvgLayer({
  geometry,
  measured,
  circuitTokenIds,
  placements,
  slotWidth,
  leaderLineThreshold,
  phase,
  reducedMotion,
  config,
  epoch,
  onCurrentFinished,
}: CircuitSvgLayerProps) {
  const currentRef = useRef<SVGPathElement | null>(null);

  const { segments, fullPath, leaders } = useMemo(() => {
    if (!geometry || !geometry.power || !geometry.lamp) {
      return { segments: [] as Segment[], fullPath: "", leaders: [] as string[] };
    }
    const bySlot = new Map(geometry.slots.map((s) => [s.tokenId, s]));
    const half = slotWidth / 2;
    const laneY = geometry.laneCenterY;

    const segs: Segment[] = [];
    const chain: Point[] = [geometry.power];
    let prev = geometry.power;

    circuitTokenIds.forEach((tokenId, index) => {
      const slot = bySlot.get(tokenId);
      if (!slot) return;
      const right: Point = { x: slot.centerX + half, y: laneY };
      const left: Point = { x: slot.centerX - half, y: laneY };
      // ورودی، همان سرِ نزدیک‌تر به نقطهٔ قبلی است — پس ترتیبِ معناییِ مدار
      // هرچه باشد، سیم منطقی می‌ماند.
      const entry = Math.hypot(prev.x - right.x, prev.y - right.y) <=
        Math.hypot(prev.x - left.x, prev.y - left.y)
        ? right
        : left;
      const exit = entry === right ? left : right;

      const lead = [...elbow(prev, entry), entry];
      segs.push({ key: `w-${index}`, points: [prev, ...lead], kind: "wire" });
      chain.push(...lead);

      // خودِ سوکت، شکافِ مدار است: بسته‌شدنش فقط با اتصالِ درست اتفاق می‌افتد.
      segs.push({
        key: `g-${index}`,
        points: [entry, exit],
        kind: placements[tokenId] ? "closed" : "open",
      });
      chain.push(exit);
      prev = exit;
    });

    const tail = [...elbow(prev, geometry.lamp), geometry.lamp];
    segs.push({ key: "w-lamp", points: [prev, ...tail], kind: "wire" });
    chain.push(...tail);

    const leaderPaths: string[] = [];
    for (const slot of geometry.slots) {
      if (Math.abs(slot.centerX - slot.wordCenterX) <= leaderLineThreshold) continue;
      const from: Point = { x: slot.wordCenterX, y: slot.wordBottomY + 1 };
      const to: Point = { x: slot.centerX, y: laneY - SLOT_HEIGHT / 2 - 2 };
      const midY = (from.y + to.y) / 2;
      leaderPaths.push(
        toPath([from, { x: from.x, y: midY }, { x: to.x, y: midY }, to]),
      );
    }

    return { segments: segs, fullPath: toPath(chain), leaders: leaderPaths };
  }, [circuitTokenIds, geometry, leaderLineThreshold, placements, slotWidth]);

  // حرکتِ جریان با WAAPI اجرا می‌شود، نه با state در هر فریم: هیچ رندری بابتِ
  // انیمیشن رخ نمی‌دهد و هندسه وسطِ حرکت دوباره خوانده نمی‌شود.
  useEffect(() => {
    if (phase !== "traveling") return;
    const path = currentRef.current;
    if (!path || !fullPath) {
      onCurrentFinished(epoch);
      return;
    }

    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) {
      onCurrentFinished(epoch);
      return;
    }

    // مدت از طولِ *واقعیِ* مسیر می‌آید، نه یک عددِ ثابت برای همهٔ صفحه‌ها.
    const raw = (length / config.currentTravelSpeedPxPerSec) * 1000;
    const duration = reducedMotion
      ? Math.min(config.currentTravelMinDurationMs, 320)
      : Math.min(
          config.currentTravelMaxDurationMs,
          Math.max(config.currentTravelMinDurationMs, raw),
        );

    const head = Math.max(40, length * 0.16);
    path.style.strokeDasharray = `${head} ${length + head}`;

    let animation: Animation | null = null;
    let timer: number | undefined;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onCurrentFinished(epoch);
    };

    if (typeof path.animate === "function") {
      animation = path.animate(
        [{ strokeDashoffset: head }, { strokeDashoffset: -length }],
        { duration, easing: "linear", fill: "forwards" },
      );
      animation.onfinish = finish;
      // اگر انیمیشن به هر دلیلی onfinish ندهد، بازی نباید همان‌جا بماند.
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
  }, [config, epoch, fullPath, onCurrentFinished, phase, reducedMotion]);

  const width = geometry?.contentWidth ?? 0;
  const height = geometry?.contentHeight ?? 0;

  return (
    <svg
      className="gc-svg"
      data-measured={measured ? "true" : "false"}
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      /* اندازه و موقعیت هر دو درون‌خطی‌اند. حتی اگر شیوه‌نامهٔ بازی اصلاً
         بارگذاری نشود، این عنصر از جریانِ چیدمان بیرون می‌ماند و نمی‌تواند
         والدش را بزرگ کند. `width/height`ِ صریح هم می‌گذارد viewBox بدونِ
         مقیاس‌خوردن با مختصاتِ محتوا یکی بماند. */
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
      {leaders.map((d, i) => (
        <path key={`leader-${i}`} className="gc-leader" d={d} fill="none" />
      ))}
      {segments.map((segment) => (
        <path
          key={segment.key}
          className={
            segment.kind === "wire"
              ? "gc-wire"
              : segment.kind === "closed"
                ? "gc-wire-closed"
                : "gc-wire-open"
          }
          d={toPath(segment.points)}
          /* `fill` صفتِ خودِ عنصر است، نه فقط CSS: مسیرِ بازِ بدونِ آن به یک
             چندضلعیِ سیاهِ تمام‌پُر تبدیل می‌شود اگر شیوه‌نامه نرسد. */
          fill="none"
        />
      ))}
      {phase !== "idle" && fullPath && (
        <path ref={currentRef} className="gc-current" d={fullPath} fill="none" />
      )}
    </svg>
  );
}
